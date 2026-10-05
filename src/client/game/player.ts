import * as THREE from "three";
import { options } from "../core/options";
import { FLASHLIGHT, PLAYER, QUALITY } from "./config";
import type { Input } from "./input";
import { RAPIER } from "./physics";

// Le livreur, vu à la première personne.
// - Rapier fournit un "contrôleur de personnage" : il fait glisser la capsule le long des murs
//   et monte tout seul les petites marches (comme le trottoir).
// - La caméra est placée à hauteur des yeux, avec un léger balancement quand on marche.
// - La lampe torche suit le regard avec un petit retard, comme si on la tenait à la main.

const UP = new THREE.Vector3(0, 1, 0);
/** Sensibilité de la souris à 1 dans les options (radians par pixel). */
const BASE_MOUSE_SENSITIVITY = 0.0022;

export class Player {
  readonly camera: THREE.PerspectiveCamera;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  /** Vitesse actuelle (m/s), utile pour donner de l'élan à la pizza lancée. */
  readonly velocity = new THREE.Vector3();
  /** Endurance, de 0 (épuisé) à 1 (en forme). */
  stamina = 1;
  sprinting = false;
  flashlightOn = true;

  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly flashlight: THREE.SpotLight;
  private readonly lampRig = new THREE.Object3D();
  private yaw: number;
  private pitch = 0;
  private bobPhase = 0;
  private bobAmount = 0;
  private verticalSpeed = 0;
  private grounded = false;
  private staminaCooldown = 0;
  private exhausted = false;

  constructor(
    scene: THREE.Scene,
    private readonly world: RAPIER.World,
    private readonly input: Input,
    spawn: THREE.Vector3,
    yaw: number,
  ) {
    this.yaw = yaw;
    this.camera = new THREE.PerspectiveCamera(options.champDeVision, 1, 0.05, 120);
    scene.add(this.camera);

    // Capsule de collision, déplacée par le code (et non par la gravité de Rapier).
    const feetToCenter = PLAYER.halfHeight + PLAYER.radius;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + feetToCenter, spawn.z),
    );
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius), this.body);

    this.controller = world.createCharacterController(0.02);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.enableAutostep(0.3, 0.2, false);
    this.controller.enableSnapToGround(0.3);
    this.controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    // On pousse les objets légers (cônes, pizza) en marchant dedans.
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(70);

    // Lampe torche : projecteur avec ombres.
    this.flashlight = new THREE.SpotLight(
      FLASHLIGHT.color,
      FLASHLIGHT.intensity,
      FLASHLIGHT.distance,
      FLASHLIGHT.angle,
      FLASHLIGHT.penumbra,
      FLASHLIGHT.decay,
    );
    this.flashlight.castShadow = true;
    this.applyShadowQuality();
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = FLASHLIGHT.distance;
    this.flashlight.shadow.bias = -0.0004;
    this.flashlight.shadow.normalBias = 0.03;
    this.lampRig.add(this.flashlight, this.flashlight.target);
    this.flashlight.target.position.set(0, 0, -1);
    scene.add(this.lampRig);

    this.updateCamera(0);
    this.lampRig.position.copy(this.camera.position);
    this.lampRig.quaternion.copy(this.camera.quaternion);
  }

  /** Avant la physique : lit les touches et la souris, demande un déplacement. */
  update(dt: number, readActions = true) {
    const input = this.input;

    if (readActions) {
      // --- Regarder avec la souris ---
      const sensitivity = BASE_MOUSE_SENSITIVITY * options.sensibilite;
      this.yaw -= input.mouseDX * sensitivity;
      this.pitch -= input.mouseDY * sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.5, 1.5);

      if (input.wasPressed("KeyF")) {
        this.flashlightOn = !this.flashlightOn;
        this.flashlight.visible = this.flashlightOn;
      }
    }

    // --- Direction voulue (ZQSD / WASD / flèches) ---
    const forward = (input.isDown("KeyW", "ArrowUp") ? 1 : 0) - (input.isDown("KeyS", "ArrowDown") ? 1 : 0);
    const strafe = (input.isDown("KeyD", "ArrowRight") ? 1 : 0) - (input.isDown("KeyA", "ArrowLeft") ? 1 : 0);
    const wish = new THREE.Vector3(strafe, 0, -forward);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.applyAxisAngle(UP, this.yaw);
    const moving = wish.lengthSq() > 0.01;

    // --- Sprint et endurance ---
    const wantsSprint = input.isDown("ShiftLeft", "ShiftRight") && moving && forward > 0;
    if (this.stamina <= 0) this.exhausted = true;
    if (this.exhausted && this.stamina > 0.3) this.exhausted = false;
    this.sprinting = wantsSprint && !this.exhausted;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt / PLAYER.staminaSeconds);
      this.staminaCooldown = PLAYER.staminaRegenDelay;
    } else if ((this.staminaCooldown -= dt) <= 0) {
      this.stamina = Math.min(1, this.stamina + PLAYER.staminaRegenPerSecond * dt);
    }

    // --- Vitesse horizontale, avec un peu d'inertie ---
    const speed = this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const targetVelocity = wish.multiplyScalar(speed);
    const blend = 1 - Math.exp(-PLAYER.acceleration * dt);
    this.velocity.x += (targetVelocity.x - this.velocity.x) * blend;
    this.velocity.z += (targetVelocity.z - this.velocity.z) * blend;

    // --- Gravité ---
    this.verticalSpeed = this.grounded ? -1 : this.verticalSpeed - PLAYER.gravity * dt;
    this.velocity.y = this.verticalSpeed;

    // --- Déplacement avec collisions (Rapier) ---
    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
    this.controller.computeColliderMovement(this.collider, desired, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
    const move = this.controller.computedMovement();
    this.grounded = this.controller.computedGrounded();
    const position = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: position.x + move.x,
      y: position.y + move.y,
      z: position.z + move.z,
    });

    // Si on se cogne contre un mur, on ne garde pas une vitesse "fantôme".
    if (dt > 0) {
      this.velocity.x = move.x / dt;
      this.velocity.z = move.z / dt;
    }
  }

  /** Après la physique : place la caméra et la lampe à la nouvelle position. */
  afterPhysics(dt: number) {
    this.updateCamera(dt);
    this.updateFlashlight(dt);
  }

  /** Place le joueur ailleurs instantanément (réapparition, tests…). */
  teleport(x: number, feetY: number, z: number, yaw?: number, pitch?: number) {
    this.body.setTranslation({ x, y: feetY + PLAYER.halfHeight + PLAYER.radius, z }, true);
    this.velocity.set(0, 0, 0);
    this.verticalSpeed = 0;
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
  }

  /** Taille de la carte d'ombre de la lampe selon l'option "Qualité" (plus grand = plus net, plus lent). */
  applyShadowQuality() {
    const size = QUALITY.shadowMapSizeByLevel[options.qualite];
    const shadow = this.flashlight.shadow;
    if (shadow.mapSize.x === size) return;
    shadow.mapSize.set(size, size);
    // L'ancienne carte d'ombre est jetée : Three.js en recrée une à la bonne taille.
    shadow.map?.dispose();
    shadow.map = null;
  }

  /** Position des pieds (pour le menu de debug). */
  get feet(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y - (PLAYER.halfHeight + PLAYER.radius), t.z);
  }

  /** Position du centre de la capsule. */
  get position(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  /** Direction du regard. */
  get forward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }

  private updateCamera(dt: number) {
    const t = this.body.translation();
    const feetY = t.y - (PLAYER.halfHeight + PLAYER.radius);

    // Balancement de la tête : plus fort en sprint.
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const targetBob = this.grounded ? Math.min(1, horizontalSpeed / PLAYER.walkSpeed) : 0;
    this.bobAmount += (targetBob - this.bobAmount) * Math.min(1, dt * 8);
    this.bobPhase += dt * horizontalSpeed * 1.9;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.06 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase) * 0.035 * this.bobAmount;

    this.camera.position.set(t.x, feetY + PLAYER.eyeHeight + bobY - 0.03 * this.bobAmount, t.z);
    this.camera.rotation.set(this.pitch, this.yaw, bobX * 0.15, "YXZ");
    this.camera.position.addScaledVector(new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, this.yaw), bobX);

    // Champ de vision un peu plus large en sprint : sensation de vitesse.
    const targetFov = options.champDeVision + (this.sprinting ? PLAYER.sprintFovBonus : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
  }

  private updateFlashlight(dt: number) {
    // La lampe est tenue un peu à droite et en dessous des yeux…
    const handOffset = new THREE.Vector3(0.22, -0.22, -0.1).applyQuaternion(this.camera.quaternion);
    this.lampRig.position.copy(this.camera.position).add(handOffset);
    // …et rattrape le regard avec un léger retard.
    this.lampRig.quaternion.slerp(this.camera.quaternion, 1 - Math.exp(-FLASHLIGHT.followSpeed * dt));
    this.lampRig.updateMatrixWorld(true);

    // Les piles faiblissent parfois une fraction de seconde.
    const weak = Math.random() < 0.004 ? 0.35 : 1;
    this.flashlight.intensity = FLASHLIGHT.intensity * weak;
  }
}

import * as THREE from "three";
import { PIZZA } from "./config";
import { instance } from "./assets";
import type { Input } from "./input";
import { RAPIER, localBounds, type DynamicProp } from "./physics";
import type { Player } from "./player";

// La boîte de pizza : on la ramasse avec E, on la lance avec clic droit, on la repose avec E.
// - Posée ou lancée : c'est un objet physique normal (elle tombe, rebondit, glisse).
// - Tenue en main : elle suit la caméra et ne bloque plus le joueur.

/** Taille réelle d'une boîte de pizza (≈ 40 cm de côté). */
const PIZZA_SCALE = 0.42;

export type PizzaHint = "pickup" | "holding" | null;

export class PizzaBox {
  readonly prop: DynamicProp;
  held = false;

  private readonly collider: RAPIER.Collider;
  private readonly holdPosition = new THREE.Vector3();
  private readonly spawn: THREE.Vector3;

  constructor(
    scene: THREE.Scene,
    private readonly world: RAPIER.World,
    template: THREE.Object3D,
    spawn: THREE.Vector3,
  ) {
    this.spawn = spawn.clone();
    const object = instance(template);
    closeLid(object);
    decorate(object);
    object.scale.setScalar(PIZZA_SCALE);
    scene.add(object);

    const { size } = localBounds(object, PIZZA_SCALE);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, spawn.y, spawn.z)
        .setCcdEnabled(true) // évite qu'elle traverse un mur quand on la lance fort
        .setAngularDamping(0.4),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
        .setTranslation(0, size.y / 2, 0)
        .setMass(0.6)
        .setFriction(0.8)
        .setRestitution(0.25),
      body,
    );
    this.prop = { object, body };
  }

  /** Gère E / clic droit. Renvoie l'aide à afficher à l'écran. */
  update(dt: number, player: Player, input: Input, readActions = true): PizzaHint {
    const body = this.prop.body;

    if (this.held) {
      if (readActions && input.rightClicked) this.throw(player);
      else if (readActions && input.wasPressed("KeyE")) this.drop(player);
      else this.followCamera(dt, player);
    } else if (readActions && this.isTargeted(player) && input.wasPressed("KeyE")) {
      this.pickUp();
    }

    // Tombée hors du monde ? On la remet à sa place.
    if (body.translation().y < -10) {
      body.setTranslation(this.spawn, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    if (this.held) return "holding";
    return this.isTargeted(player) ? "pickup" : null;
  }

  /** Vrai si le joueur regarde la pizza d'assez près. */
  private isTargeted(player: Player): boolean {
    const toPizza = this.prop.object.position.clone().sub(player.camera.position);
    const distance = toPizza.length();
    if (distance > PIZZA.pickupDistance) return false;
    return player.forward.angleTo(toPizza) < PIZZA.pickupAngle;
  }

  private pickUp() {
    this.held = true;
    const body = this.prop.body;
    body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    // "Capteur" : elle ne cogne plus rien tant qu'on la tient (sinon elle pousserait le joueur).
    this.collider.setSensor(true);
    this.holdPosition.copy(this.prop.object.position);
  }

  private release(player: Player) {
    this.held = false;
    const body = this.prop.body;
    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    this.collider.setSensor(false);
    // On garde l'élan du joueur.
    body.setLinvel({ x: player.velocity.x, y: 0, z: player.velocity.z }, true);
  }

  private drop(player: Player) {
    this.release(player);
  }

  private throw(player: Player) {
    this.release(player);
    const body = this.prop.body;
    const forward = player.forward;
    const v = forward.multiplyScalar(PIZZA.throwSpeed).add(new THREE.Vector3(0, PIZZA.throwLift, 0));
    v.x += player.velocity.x;
    v.z += player.velocity.z;
    body.setLinvel({ x: v.x, y: v.y, z: v.z }, true);
    // Elle part en tournant, façon frisbee.
    body.setAngvel({ x: (Math.random() - 0.5) * 2, y: 9 + Math.random() * 4, z: (Math.random() - 0.5) * 2 }, true);
  }

  /** Tenue à deux mains, devant soi, un peu en bas. */
  private followCamera(dt: number, player: Player) {
    const camera = player.camera;
    // Assez bas pour rester sous le faisceau de la lampe (sinon elle éblouit).
    const target = new THREE.Vector3(0.05, -0.5, -0.58).applyQuaternion(camera.quaternion).add(camera.position);
    // Petit retard pour donner du poids.
    this.holdPosition.lerp(target, 1 - Math.exp(-dt * 25));
    // La boîte reste à plat, tournée comme le joueur.
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ").y;
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const body = this.prop.body;
    body.setNextKinematicTranslation(this.holdPosition);
    body.setNextKinematicRotation(rotation);
  }
}

/**
 * Le modèle Kenney a son couvercle ouvert : on le referme
 * (couvercle retourné et posé à plat sur le fond de la boîte).
 */
function closeLid(object: THREE.Object3D) {
  const lid = object.getObjectByName("lid");
  if (!lid) return;
  lid.quaternion.set(0, 0, 1, 0); // demi-tour autour de l'axe Z
  lid.position.set(0, 0.095, 0);
  lid.scale.set(1.035, 1, 1.07);
}

/**
 * Couleur carton + logo "PIZZA" sur le couvercle (dessiné dans un <canvas>, sans image externe).
 * Le carton est un peu sombre exprès : une boîte blanche éblouit sous la lampe torche.
 */
function decorate(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = (child.material as THREE.MeshStandardMaterial).clone();
    material.color.set(0xb08a5a);
    material.roughness = 0.95;
    child.material = material;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b8935f";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#a3271d";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#a3271d";
  ctx.font = "900 54px 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PIZZA", 128, 120);
  ctx.font = "700 20px sans-serif";
  ctx.fillText("CHAUDE · RAPIDE", 128, 165);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.86),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.097; // juste au-dessus du couvercle fermé
  decal.castShadow = false;
  object.add(decal);
}

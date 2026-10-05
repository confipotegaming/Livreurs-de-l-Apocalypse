import * as THREE from "three";
import type { Creature, TypeColis } from "../../shared/donnees";
import { options } from "../core/options";
import { QUALITY, WORLD } from "./config";
import { loadModels, type LoadReport } from "./assets";
import { Hud } from "./hud";
import { Input } from "./input";
import { creerMannequinColis, creerMannequinCreature, type MannequinCreature } from "./mannequins";
import { createPhysicsWorld, syncProp, type DynamicProp, type RAPIER } from "./physics";
import { PizzaBox, type PizzaHint } from "./pizza";
import { Player } from "./player";
import { createComposer } from "./postfx";
import { buildStreet, type Street } from "./street";
import { Tournee, type ReglagesTournee } from "./tournee";

/** Pas de physique maximal (1/30 s) et nombre maximal de pas par image. */
const MAX_STEP = 1 / 30;
const MAX_STEPS = 6;
/** Couleur du brouillard pendant le couvre-feu (rouge sombre). */
const CURFEW_FOG = new THREE.Color(0x2a0606);

// Le "chef d'orchestre" de la partie 3D : crée le rendu, la rue, le joueur, la pizza,
// puis fait tourner la boucle de jeu (environ 60 fois par seconde) pendant une tournée.

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly input: Input;
  readonly hud = new Hud();
  readonly tournee = new Tournee();
  /** Mode invincible (menu de debug). Aucun danger n'existe encore : il servira dès J1. */
  invincible = false;
  /** Images par seconde mesurées (mises à jour 2 fois par seconde). */
  fps = 0;
  /** Temps de jeu simulé (secondes), utile pour les tests. */
  simulatedTime = 0;

  private readonly timer = new THREE.Timer();
  private composer!: ReturnType<typeof createComposer>;
  private pixelRatio = this.maxPixelRatio;
  private perf = { frames: 0, time: 0, cooldown: 0 };
  private fpsCounter = { frames: 0, time: 0 };
  private running = false;
  private readonly debugProps: DynamicProp[] = [];
  private readonly debugCreatures: MannequinCreature[] = [];
  private readonly baseFog: { color: THREE.Color; density: number };

  private constructor(
    readonly scene: THREE.Scene,
    readonly world: RAPIER.World,
    readonly street: Street,
    readonly player: Player,
    readonly pizza: PizzaBox,
    readonly loadReport: LoadReport,
    renderer: THREE.WebGLRenderer,
    input: Input,
  ) {
    this.renderer = renderer;
    this.input = input;
    const fog = scene.fog as THREE.FogExp2;
    this.baseFog = { color: fog.color.clone(), density: fog.density };
  }

  /** Charge tout (modèles, physique) et prépare la scène. */
  static async create(container: HTMLElement, onProgress: (loaded: number, total: number) => void): Promise<Game> {
    // Recommandations de la bibliothèque "postprocessing" : pas d'anticrénelage ni de
    // tampon de profondeur ici, c'est elle qui les gère.
    const renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
      stencil: false,
      depth: false,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const input = new Input(renderer.domElement);
    const [world, report] = await Promise.all([createPhysicsWorld(), loadModels(onProgress)]);
    const models = report.models;

    const scene = new THREE.Scene();
    const street = buildStreet(scene, world, models);
    const player = new Player(scene, world, input, street.spawn.position, street.spawn.yaw);
    const pizza = new PizzaBox(scene, world, models.pizzaBox, street.pizzaSpawn);

    const game = new Game(scene, world, street, player, pizza, report, renderer, input);
    game.composer = createComposer(renderer, scene, player.camera);
    game.resize();
    window.addEventListener("resize", () => game.resize());
    // Prépare les shaders tout de suite, pour éviter un à-coup à la première image.
    renderer.compile(scene, player.camera);
    return game;
  }

  /** Lance la boucle de jeu (pendant une tournée). */
  start() {
    if (this.running) return;
    this.running = true;
    this.timer.connect(document);
    this.timer.reset();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Arrête la boucle (menus, récap) : la carte graphique se repose. */
  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.timer.disconnect();
  }

  /** Remet la rue à zéro et démarre une nouvelle tournée. */
  nouvelleTournee(reglages: ReglagesTournee) {
    const spawn = this.street.spawn;
    this.player.teleport(spawn.position.x, spawn.position.y, spawn.position.z, spawn.yaw, 0);
    this.pizza.reset();
    this.clearDebugSpawns();
    this.invincible = false;
    this.tournee.demarrer(reglages);
    this.applyCurfewLook(false);
    this.applyQuality();
    // Une image tout de suite, pour que l'arrière-plan du bouton "C'est parti" soit la rue.
    this.player.afterPhysics(0);
    this.composer.render(0);
  }

  private frame() {
    this.timer.update();
    // Vrai temps écoulé depuis l'image précédente (limité, pour éviter un "saut" après une pause).
    const frameTime = Math.min(this.timer.getDelta(), 0.2);
    const time = this.timer.getElapsed();
    const paused = !this.input.locked;

    // Si l'image a pris du temps (PC lent), on découpe en plusieurs petits pas de physique :
    // le jeu garde la bonne vitesse et les objets ne traversent pas les murs.
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.ceil(frameTime / MAX_STEP)));
    const dt = Math.min(frameTime / steps, MAX_STEP);
    let hint: PizzaHint = null;
    if (!paused) {
      for (let i = 0; i < steps; i++) {
        // Les actions (souris, E, clic droit, F) ne sont lues qu'une fois par image.
        const readActions = i === 0;
        // 1. Avant la physique : le joueur et la pizza réagissent aux touches.
        this.player.update(dt, readActions);
        hint = this.pizza.update(dt, this.player, this.input, readActions);
        // 2. La physique avance d'un pas.
        this.world.timestep = Math.max(dt, 1 / 240);
        this.world.step();
        // 3. Après la physique : la caméra suit la nouvelle position.
        this.player.afterPhysics(dt);
        this.simulatedTime += dt;
      }

      const wasCurfew = this.tournee.couvreFeu;
      this.tournee.update(frameTime);
      if (this.tournee.couvreFeu !== wasCurfew) this.applyCurfewLook(this.tournee.couvreFeu);
    }

    // On recopie les positions calculées par la physique dans les objets 3D.
    syncProp(this.pizza.prop);
    for (const prop of this.street.props) syncProp(prop);
    for (const prop of this.debugProps) syncProp(prop);
    // Les mannequins de créatures fixent le joueur.
    const eye = this.player.camera.position;
    for (const c of this.debugCreatures) c.object.lookAt(eye.x, c.object.position.y, eye.z);
    this.street.update(frameTime, time);

    this.hud.update(this.input.locked ? hint : null, this.player.stamina, this.tournee);
    this.composer.render(frameTime);
    this.input.endFrame();
    this.measureFps(frameTime);
    this.adaptQuality(frameTime);
  }

  private measureFps(dt: number) {
    const c = this.fpsCounter;
    c.frames++;
    c.time += dt;
    if (c.time >= 0.5) {
      this.fps = c.frames / c.time;
      c.frames = 0;
      c.time = 0;
    }
  }

  // --- Couvre-feu -----------------------------------------------------------

  /** Au couvre-feu, le brouillard s'épaissit et vire au rouge. */
  private applyCurfewLook(curfew: boolean) {
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(curfew ? CURFEW_FOG : this.baseFog.color);
    fog.density = curfew ? this.baseFog.density * 1.35 : this.baseFog.density;
    (this.scene.background as THREE.Color).copy(fog.color);
  }

  // --- Outils de debug (F1) -------------------------------------------------

  /** Points de téléportation proposés dans le menu de debug. */
  get teleportPoints(): { nom: string; position: THREE.Vector3 }[] {
    const half = WORLD.streetLength / 2;
    return [
      { nom: "Départ", position: this.street.spawn.position.clone() },
      { nom: "Près de la pizza", position: this.pizza.spawnPosition.add(new THREE.Vector3(1.2, 0, -1.2)) },
      { nom: "Milieu de la rue", position: new THREE.Vector3(0, 0.3, 0) },
      { nom: "Cônes de chantier", position: new THREE.Vector3(0, 0.3, 12) },
      { nom: "Bout de la rue", position: new THREE.Vector3(0, 0.3, half - 4) },
    ];
  }

  teleport(x: number, z: number, y = 0.3) {
    this.player.teleport(x, y, z);
    // La caméra suit tout de suite, même si le jeu est en pause.
    this.player.afterPhysics(0);
  }

  /** Un point au sol, 3 m devant le joueur. */
  private pointInFront(distance = 3): THREE.Vector3 {
    const forward = this.player.forward.setY(0).normalize();
    const p = this.player.feet.addScaledVector(forward, distance);
    p.y = Math.max(0, p.y);
    return p;
  }

  spawnCreature(creature: Creature) {
    // Le boss est énorme : on le fait apparaître plus loin.
    const distance = creature.boss ? 8 : 4;
    this.debugCreatures.push(creerMannequinCreature(this.scene, this.world, creature, this.pointInFront(distance)));
  }

  spawnColis(type: TypeColis) {
    this.debugProps.push(creerMannequinColis(this.scene, this.world, type, this.pointInFront(2.2)));
  }

  /** Retire tous les mannequins ajoutés par le menu de debug. */
  clearDebugSpawns() {
    for (const p of this.debugProps) {
      this.scene.remove(p.object);
      this.world.removeRigidBody(p.body);
    }
    for (const c of this.debugCreatures) {
      this.scene.remove(c.object);
      this.world.removeCollider(c.collider, false);
    }
    this.debugProps.length = 0;
    this.debugCreatures.length = 0;
  }

  /** Chiffres affichés dans le panneau de debug. */
  stats() {
    let meshes = 0;
    this.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes++;
    });
    return {
      meshes,
      bodies: this.world.bodies.len(),
      colliders: this.world.colliders.len(),
      modelsLoaded: this.loadReport.total - this.loadReport.failed.length,
      modelsTotal: this.loadReport.total,
      creatures: this.debugCreatures.length,
      colis: this.debugProps.length,
      drawCalls: this.renderer.info.render.calls,
      pixelRatio: this.pixelRatio,
    };
  }

  // --- Qualité et taille de l'écran ----------------------------------------

  private get maxPixelRatio(): number {
    return Math.min(window.devicePixelRatio, QUALITY.maxPixelRatioByLevel[options.qualite]);
  }

  /** À appeler quand l'option "Qualité" change. */
  applyQuality() {
    this.pixelRatio = this.maxPixelRatio;
    this.player.applyShadowQuality();
    this.resize();
  }

  /**
   * Résolution automatique : si le PC n'arrive pas à suivre, on baisse un peu la résolution
   * (le grain du post-traitement masque bien la différence). S'il est à l'aise, on remonte.
   */
  private adaptQuality(dt: number) {
    const perf = this.perf;
    perf.frames++;
    perf.time += dt;
    perf.cooldown -= dt;
    if (perf.time < 2) return;
    const fps = perf.frames / perf.time;
    perf.frames = 0;
    perf.time = 0;
    if (perf.cooldown > 0) return;

    const max = this.maxPixelRatio;
    if (fps < QUALITY.targetFps && this.pixelRatio > QUALITY.minPixelRatio) {
      this.pixelRatio = Math.max(QUALITY.minPixelRatio, this.pixelRatio - 0.15);
      perf.cooldown = 2;
      this.resize();
    } else if (fps > 58.5 && this.pixelRatio < max) {
      this.pixelRatio = Math.min(max, this.pixelRatio + 0.1);
      perf.cooldown = 8; // on remonte prudemment
      this.resize();
    }
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.player.camera.aspect = width / height;
    this.player.camera.updateProjectionMatrix();
  }
}

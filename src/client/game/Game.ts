import * as THREE from "three";
import { QUALITY } from "./config";
import { loadModels } from "./assets";
import { Hud } from "./hud";
import { Input } from "./input";
import { createPhysicsWorld, syncProp, type RAPIER } from "./physics";
import { PizzaBox, type PizzaHint } from "./pizza";
import { Player } from "./player";
import { createComposer } from "./postfx";
import { buildStreet, type Street } from "./street";

/** Pas de physique maximal (1/30 s) et nombre maximal de pas par image. */
const MAX_STEP = 1 / 30;
const MAX_STEPS = 6;

// Le "chef d'orchestre" : crée le rendu, la rue, le joueur, la pizza,
// puis fait tourner la boucle de jeu (environ 60 fois par seconde).

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly input: Input;
  readonly hud = new Hud();
  private readonly timer = new THREE.Timer();
  private composer!: ReturnType<typeof createComposer>;
  private pixelRatio = Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio);
  private perf = { frames: 0, time: 0, cooldown: 0 };
  /** Temps de jeu simulé (secondes), utile pour les tests. */
  simulatedTime = 0;

  private constructor(
    readonly scene: THREE.Scene,
    readonly world: RAPIER.World,
    readonly street: Street,
    readonly player: Player,
    readonly pizza: PizzaBox,
    renderer: THREE.WebGLRenderer,
    input: Input,
  ) {
    this.renderer = renderer;
    this.input = input;
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
    const [world, models] = await Promise.all([createPhysicsWorld(), loadModels(onProgress)]);

    const scene = new THREE.Scene();
    const street = buildStreet(scene, world, models);
    const player = new Player(scene, world, input, street.spawn.position, street.spawn.yaw);
    const pizza = new PizzaBox(scene, world, models.pizzaBox, street.pizzaSpawn);

    const game = new Game(scene, world, street, player, pizza, renderer, input);
    game.composer = createComposer(renderer, scene, player.camera);
    game.resize();
    window.addEventListener("resize", () => game.resize());
    // Prépare les shaders tout de suite, pour éviter un à-coup à la première image.
    renderer.compile(scene, player.camera);
    return game;
  }

  start() {
    this.timer.connect(document);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame() {
    this.timer.update();
    // Vrai temps écoulé depuis l'image précédente (limité, pour éviter un "saut" après une pause).
    const frameTime = Math.min(this.timer.getDelta(), 0.2);
    const time = this.timer.getElapsed();

    // Si l'image a pris du temps (PC lent), on découpe en plusieurs petits pas de physique :
    // le jeu garde la bonne vitesse et les objets ne traversent pas les murs.
    const steps = Math.min(MAX_STEPS, Math.max(1, Math.ceil(frameTime / MAX_STEP)));
    const dt = Math.min(frameTime / steps, MAX_STEP);
    let hint: PizzaHint = null;
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

    // On recopie les positions calculées par la physique dans les objets 3D.
    syncProp(this.pizza.prop);
    for (const prop of this.street.props) syncProp(prop);
    this.street.update(frameTime, time);

    this.hud.update(frameTime, this.input.locked ? hint : null, this.player.stamina);
    this.composer.render(frameTime);
    this.input.endFrame();
    this.adaptQuality(frameTime);
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

    const max = Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio);
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

  /** Résolution actuelle (pour l'affichage de débogage). */
  get quality(): number {
    return this.pixelRatio;
  }
}

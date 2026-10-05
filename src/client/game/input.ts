// Clavier et souris.
//
// On lit la position PHYSIQUE des touches (event.code) : la touche "Z" d'un clavier
// AZERTY a le même code ("KeyW") que la touche "W" d'un clavier QWERTY.
// Résultat : ZQSD en AZERTY et WASD en QWERTY marchent tous les deux, sans réglage.

export class Input {
  private readonly held = new Set<string>();
  private readonly pressedThisFrame = new Set<string>();
  /** Mouvement de la souris accumulé depuis la dernière image. */
  mouseDX = 0;
  mouseDY = 0;
  rightClicked = false;
  leftClicked = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (!this.locked) return;
      if (!e.repeat) this.pressedThisFrame.add(e.code);
      this.held.add(e.code);
      // Empêche la page de défiler avec les flèches ou l'espace.
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    // Si la fenêtre perd le focus, on relâche tout (sinon le joueur continue d'avancer tout seul).
    window.addEventListener("blur", () => this.held.clear());

    document.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (!this.locked) return;
      if (e.button === 2) this.rightClicked = true;
      if (e.button === 0) this.leftClicked = true;
    });
    // Pas de menu contextuel au clic droit.
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /** Vrai quand la souris est "capturée" par le jeu (pointer lock). */
  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Vrai tant qu'une des touches est enfoncée. */
  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  /** Vrai seulement à l'image où la touche vient d'être enfoncée. */
  wasPressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  /** À appeler à la fin de chaque image. */
  endFrame() {
    this.pressedThisFrame.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.rightClicked = false;
    this.leftClicked = false;
  }
}

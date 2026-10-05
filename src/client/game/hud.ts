import type { PizzaHint } from "./pizza";

// Interface par-dessus le jeu (HTML) : viseur, aides, endurance, images par seconde.

const $ = (id: string) => document.getElementById(id) as HTMLElement;

export class Hud {
  private readonly root = $("hud");
  private readonly hint = $("hint");
  private readonly crosshair = $("crosshair");
  private readonly staminaBar = $("stamina");
  private readonly staminaFill = $("stamina-fill");
  private readonly fps = $("fps");
  private lastHint: PizzaHint | undefined;
  private frames = 0;
  private fpsTimer = 0;

  show(visible: boolean) {
    this.root.classList.toggle("hidden", !visible);
  }

  update(dt: number, hint: PizzaHint, stamina: number) {
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.hint.innerHTML =
        hint === "pickup"
          ? "<kbd>E</kbd> Ramasser la pizza"
          : hint === "holding"
            ? "<kbd>Clic droit</kbd> Lancer · <kbd>E</kbd> Poser"
            : "";
      this.crosshair.classList.toggle("active", hint === "pickup");
    }

    this.staminaBar.classList.toggle("hidden", stamina >= 0.999);
    this.staminaFill.style.width = `${Math.round(stamina * 100)}%`;
    this.staminaFill.classList.toggle("low", stamina < 0.3);

    // Compteur d'images par seconde, mis à jour deux fois par seconde.
    this.frames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps.textContent = `${Math.round(this.frames / this.fpsTimer)} i/s`;
      this.frames = 0;
      this.fpsTimer = 0;
    }
  }
}

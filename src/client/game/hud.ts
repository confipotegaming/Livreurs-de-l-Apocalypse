import type { PizzaHint } from "./pizza";
import { formaterDuree, type Tournee } from "./tournee";

// Interface par-dessus le jeu (HTML) : viseur, aides, endurance, compte à rebours du couvre-feu.
// (Les images par seconde sont dans le panneau de debug, touche F1.)

const $ = (id: string) => document.getElementById(id) as HTMLElement;

export class Hud {
  private readonly root = $("hud");
  private readonly hint = $("hint");
  private readonly crosshair = $("crosshair");
  private readonly staminaBar = $("stamina");
  private readonly staminaFill = $("stamina-fill");
  private readonly timer = $("timer");
  private lastHint: PizzaHint | undefined;
  private lastTimerText = "";

  show(visible: boolean) {
    this.root.classList.toggle("hidden", !visible);
  }

  update(hint: PizzaHint, stamina: number, tournee: Tournee) {
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

    // On ne touche au texte que s'il change (une fois par seconde).
    const text = tournee.couvreFeu ? "COUVRE-FEU — rentrez au van !" : `Couvre-feu dans ${formaterDuree(tournee.tempsRestant)}`;
    if (text !== this.lastTimerText) {
      this.lastTimerText = text;
      this.timer.textContent = text;
      this.timer.classList.toggle("curfew", tournee.couvreFeu);
    }
  }
}

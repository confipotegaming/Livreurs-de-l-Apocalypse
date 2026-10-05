import type { Difficulte, Quartier } from "../../shared/donnees";
import { tailleTournee } from "../../shared/regles";

// Une tournée en cours : quartier, difficulté, compte à rebours avant le couvre-feu.
// (Les commandes, les créatures et le retour au van arrivent au jalon J1.)

export interface ReglagesTournee {
  quartier: Quartier;
  difficulte: Difficulte;
  joueurs: number;
}

export class Tournee {
  reglages: ReglagesTournee | null = null;
  /** Secondes restantes avant le couvre-feu. */
  tempsRestant = 0;
  /** Secondes écoulées depuis le début de la tournée. */
  tempsEcoule = 0;
  commandesPrevues = 0;
  creaturesPrevues = 0;

  demarrer(reglages: ReglagesTournee) {
    this.reglages = reglages;
    const taille = tailleTournee(reglages.quartier, reglages.difficulte, reglages.joueurs);
    this.tempsRestant = taille.dureeSecondes;
    this.commandesPrevues = taille.commandes;
    this.creaturesPrevues = taille.creatures;
    this.tempsEcoule = 0;
  }

  get couvreFeu(): boolean {
    return this.reglages !== null && this.tempsRestant <= 0;
  }

  update(dt: number) {
    if (!this.reglages) return;
    this.tempsEcoule += dt;
    this.tempsRestant = Math.max(0, this.tempsRestant - dt);
  }

  /** Pour le menu de debug : déclenche le couvre-feu tout de suite. */
  passerAuCouvreFeu() {
    this.tempsRestant = 0;
  }
}

/** 754 secondes → "12:34". */
export function formaterDuree(secondes: number): string {
  const s = Math.max(0, Math.ceil(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

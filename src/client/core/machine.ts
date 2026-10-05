// Machine à états : le jeu est toujours dans UN seul état (un écran) à la fois.
// On décrit à l'avance quels passages sont permis (ex. on ne va pas du menu au récap
// sans être passé par une tournée). Un passage interdit déclenche une erreur claire,
// au lieu d'un écran à moitié affiché.

export interface Etat<N extends string> {
  /** Appelé en arrivant dans cet état. `depuis` = état précédent (null au démarrage). */
  entrer?(depuis: N | null): void;
  /** Appelé en quittant cet état. */
  sortir?(vers: N): void;
}

export class MachineAEtats<N extends string> {
  private etatActuel: N | null = null;
  private etatPrecedent: N | null = null;
  private readonly ecouteurs: ((vers: N, depuis: N | null) => void)[] = [];

  constructor(
    private readonly etats: Record<N, Etat<N>>,
    private readonly transitions: Record<N, readonly N[]>,
  ) {}

  get actuel(): N | null {
    return this.etatActuel;
  }

  get precedent(): N | null {
    return this.etatPrecedent;
  }

  /** Vrai si on peut aller de l'état actuel vers `vers`. */
  peutAller(vers: N): boolean {
    if (this.etatActuel === null) return true;
    return this.transitions[this.etatActuel].includes(vers);
  }

  /** Change d'état. Lance une erreur si ce passage n'est pas prévu. */
  aller(vers: N) {
    const depuis = this.etatActuel;
    if (!this.peutAller(vers)) {
      throw new Error(`Passage interdit : « ${depuis} » → « ${vers} »`);
    }
    if (depuis !== null) this.etats[depuis].sortir?.(vers);
    this.etatPrecedent = depuis;
    this.etatActuel = vers;
    this.etats[vers].entrer?.(depuis);
    for (const e of this.ecouteurs) e(vers, depuis);
  }

  /** Revient à l'état précédent (ex. fermer les options). */
  retour() {
    if (this.etatPrecedent === null) throw new Error("Aucun état précédent.");
    this.aller(this.etatPrecedent);
  }

  /** Être prévenu à chaque changement d'état. */
  surChangement(ecouteur: (vers: N, depuis: N | null) => void) {
    this.ecouteurs.push(ecouteur);
  }
}

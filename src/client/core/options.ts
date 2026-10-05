import { ecrireLocal, lireLocal } from "./sauvegarde";

// Options du joueur, sauvegardées dans le navigateur.

export type Qualite = "basse" | "moyenne" | "haute";

export interface Options {
  /** Multiplicateur de la sensibilité de la souris (1 = normal). */
  sensibilite: number;
  /** Champ de vision en degrés. */
  champDeVision: number;
  /** Volume général de 0 à 100 (les sons arrivent au jalon J5). */
  volume: number;
  qualite: Qualite;
}

export const OPTIONS_PAR_DEFAUT: Options = {
  sensibilite: 1,
  champDeVision: 75,
  volume: 80,
  qualite: "haute",
};

/** Les options actuelles. Le jeu les relit à chaque image : un changement s'applique tout de suite. */
export const options: Options = lireLocal("options", OPTIONS_PAR_DEFAUT);

const ecouteurs: (() => void)[] = [];

export function modifierOptions(changements: Partial<Options>) {
  Object.assign(options, changements);
  ecrireLocal("options", options);
  for (const e of ecouteurs) e();
}

export function surChangementOptions(ecouteur: () => void) {
  ecouteurs.push(ecouteur);
}

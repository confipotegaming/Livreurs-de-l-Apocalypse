// La liste des écrans du jeu et les passages permis entre eux.
// (Fichier séparé du reste pour pouvoir le tester sans navigateur.)

export type Ecran = "menu" | "qg" | "chargement" | "tournee" | "recap" | "options";

export const PASSAGES: Record<Ecran, readonly Ecran[]> = {
  menu: ["qg", "options"],
  qg: ["chargement", "menu", "options"],
  // En cas d'échec du chargement, on revient au QG.
  chargement: ["tournee", "qg"],
  // Depuis la pause : options, abandon (→ récap) ou retour au menu principal.
  tournee: ["recap", "options", "menu"],
  recap: ["qg"],
  // Les options reviennent toujours là d'où on vient.
  options: ["menu", "qg", "tournee"],
};

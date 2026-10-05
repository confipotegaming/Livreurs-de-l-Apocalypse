import colis from "../../../data/colis.json";
import creatures from "../../../data/creatures.json";
import difficultes from "../../../data/difficultes.json";
import joueur from "../../../data/joueur.json";
import modificateurs from "../../../data/modificateurs.json";
import objets from "../../../data/objets.json";
import pourboires from "../../../data/pourboires.json";
import progression from "../../../data/progression.json";
import quartiers from "../../../data/quartiers.json";
import tension from "../../../data/tension.json";
import { verifierDonnees, type Donnees } from "../../shared/donnees";

// Toutes les données du jeu, lues dans le dossier /data à la racine du projet.
// Pour rééquilibrer : modifier le fichier JSON, enregistrer, le jeu se recharge (npm run dev).

export const DONNEES = {
  quartiers: quartiers.quartiers,
  difficultes: difficultes.difficultes,
  modificateurs: modificateurs.modificateurs,
  creatures: creatures.creatures,
  colis: colis.colis,
  objets: objets.objets,
  pourboires,
  progression,
  joueur,
  tension,
} as Donnees;

/** Problèmes trouvés dans les fichiers /data (affichés dans le menu de debug, F1). */
export const PROBLEMES_DONNEES = verifierDonnees(DONNEES);

/** Retrouve un élément par son identifiant (ex. trouver(DONNEES.quartiers, "lilas")). */
export function trouver<T extends { id: string }>(liste: T[], id: string): T {
  const element = liste.find((e) => e.id === id);
  if (!element) throw new Error(`Identifiant inconnu dans /data : « ${id} »`);
  return element;
}

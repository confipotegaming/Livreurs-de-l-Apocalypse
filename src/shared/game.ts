// Règles partagées entre le jeu (navigateur) et le serveur.
//
// Pour l'instant, la "tranche visuelle" 3D est en solo : seul ce qui concerne
// les salons multijoueurs est ici. Les règles de déplacement 3D reviendront
// ici quand on rebranchera le multijoueur (le serveur devra faire les mêmes calculs).

/** Nom du type de salle côté Colyseus. */
export const ROOM_NAME = "salle";

/** Nombre maximum de joueurs par salon. */
export const MAX_PLAYERS = 8;

/** Lettres utilisées pour les codes de salon (sans I ni O, trop proches de 1 et 0). */
export const ROOM_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Met un code tapé par un joueur au bon format : "abcd " -> "ABCD". */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}

/** Nettoie un pseudo : pas d'espaces en trop, 16 caractères maximum. */
export function sanitizeName(input: unknown): string {
  const name = typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, 16) : "";
  return name || "Livreur";
}

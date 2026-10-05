// Règles et constantes partagées entre le jeu (navigateur) et le serveur.
// Les deux côtés utilisent EXACTEMENT les mêmes fonctions de déplacement,
// ce qui permet au navigateur de prédire ce que le serveur va calculer.

/** Nom du type de salle côté Colyseus. */
export const ROOM_NAME = "salle";

/** Nombre maximum de joueurs par salon. */
export const MAX_PLAYERS = 5;

/** Le serveur calcule le jeu 20 fois par seconde. */
export const SERVER_TICK_MS = 1000 / 20;

/** Le navigateur avance le joueur par petits pas fixes de 1/60 s. */
export const INPUT_STEP_MS = 1000 / 60;

/** Taille de la salle, en pixels. */
export const ROOM_WIDTH = 1600;
export const ROOM_HEIGHT = 1100;

/** Épaisseur des murs autour de la salle. */
export const WALL_THICKNESS = 32;

/** Rayon du livreur (on le traite comme un cercle pour les collisions). */
export const PLAYER_RADIUS = 16;

/** Vitesse de marche, en pixels par seconde. */
export const PLAYER_SPEED = 190;

/** Portée et ouverture du cône de lampe. */
export const LAMP_RANGE = 420;
export const LAMP_HALF_ANGLE = Math.PI / 6; // 30° de chaque côté = 60° au total

/** Couleurs attribuées aux livreurs (une par joueur). */
export const PLAYER_COLORS = [
  0xff8a00, 0x2ec4ff, 0xff4d8d, 0x7bdc3a, 0xb07cff,
];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Type de meuble, pour choisir le dessin côté jeu. */
  kind: "wall" | "crate" | "shelf" | "counter" | "pillar";
}

/**
 * Tous les obstacles de la salle : les 4 murs + des meubles.
 * Les coordonnées sont celles du coin en haut à gauche.
 */
export const OBSTACLES: Rect[] = [
  // Murs extérieurs
  { x: 0, y: 0, w: ROOM_WIDTH, h: WALL_THICKNESS, kind: "wall" },
  { x: 0, y: ROOM_HEIGHT - WALL_THICKNESS, w: ROOM_WIDTH, h: WALL_THICKNESS, kind: "wall" },
  { x: 0, y: 0, w: WALL_THICKNESS, h: ROOM_HEIGHT, kind: "wall" },
  { x: ROOM_WIDTH - WALL_THICKNESS, y: 0, w: WALL_THICKNESS, h: ROOM_HEIGHT, kind: "wall" },

  // Cloison intérieure avec un passage
  { x: 520, y: 32, w: 32, h: 380, kind: "wall" },
  { x: 520, y: 560, w: 32, h: 260, kind: "wall" },

  // Comptoir de la cuisine abandonnée
  { x: 120, y: 160, w: 260, h: 48, kind: "counter" },
  { x: 120, y: 208, w: 48, h: 160, kind: "counter" },

  // Étagères
  { x: 820, y: 140, w: 300, h: 36, kind: "shelf" },
  { x: 820, y: 320, w: 300, h: 36, kind: "shelf" },
  { x: 1300, y: 180, w: 36, h: 300, kind: "shelf" },

  // Caisses empilées
  { x: 240, y: 760, w: 64, h: 64, kind: "crate" },
  { x: 304, y: 760, w: 64, h: 64, kind: "crate" },
  { x: 272, y: 696, w: 64, h: 64, kind: "crate" },
  { x: 900, y: 640, w: 64, h: 64, kind: "crate" },
  { x: 1180, y: 860, w: 64, h: 64, kind: "crate" },
  { x: 1244, y: 860, w: 64, h: 64, kind: "crate" },

  // Piliers
  { x: 760, y: 520, w: 48, h: 48, kind: "pillar" },
  { x: 1120, y: 560, w: 48, h: 48, kind: "pillar" },
  { x: 1420, y: 640, w: 48, h: 48, kind: "pillar" },
];

/** Point d'apparition des livreurs (zone libre près de la porte). */
export const SPAWN_POINT = { x: 760, y: 900 };

/** Ce que le navigateur envoie au serveur à chaque pas (1/60 s). */
export interface InputMessage {
  /** Numéro croissant de l'entrée, pour savoir lesquelles le serveur a déjà appliquées. */
  seq: number;
  /** Direction voulue : -1, 0 ou 1 sur chaque axe. */
  dx: number;
  dy: number;
  /** Angle de la lampe, en radians. */
  angle: number;
}

/**
 * Déplace un cercle (le livreur) d'un pas, en bloquant contre les obstacles.
 * On bouge d'abord sur X, puis sur Y : ainsi on "glisse" le long des murs.
 */
export function movePlayer(
  x: number,
  y: number,
  dx: number,
  dy: number,
  dtSeconds: number,
): { x: number; y: number } {
  let dirX = clampUnit(dx);
  let dirY = clampUnit(dy);
  // En diagonale, on ne doit pas aller plus vite qu'en ligne droite.
  const length = Math.hypot(dirX, dirY);
  if (length > 1) {
    dirX /= length;
    dirY /= length;
  }

  const step = PLAYER_SPEED * dtSeconds;
  let newX = x + dirX * step;
  if (collides(newX, y)) newX = x;
  let newY = y + dirY * step;
  if (collides(newX, newY)) newY = y;
  return { x: newX, y: newY };
}

/** Vrai si un livreur placé en (x, y) touche un obstacle. */
export function collides(x: number, y: number): boolean {
  for (const r of OBSTACLES) {
    const nearestX = Math.max(r.x, Math.min(x, r.x + r.w));
    const nearestY = Math.max(r.y, Math.min(y, r.y + r.h));
    const ddx = x - nearestX;
    const ddy = y - nearestY;
    if (ddx * ddx + ddy * ddy < PLAYER_RADIUS * PLAYER_RADIUS) return true;
  }
  return false;
}

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

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

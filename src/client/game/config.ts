import { DONNEES } from "../data";

// Réglages techniques (rendu, lumière, brouillard, qualité), regroupés ici pour les ajuster facilement.
// Les chiffres de GAMEPLAY (vitesses, pourboires, créatures…) sont dans le dossier /data.
// Unités : mètres, secondes, radians.

const J = DONNEES.joueur;

export const PLAYER = {
  /** Rayon et demi-hauteur de la "capsule" de collision du livreur (hauteur totale ≈ 1,8 m). */
  radius: 0.35,
  halfHeight: 0.55,
  /** Hauteur des yeux au-dessus des pieds. */
  eyeHeight: 1.65,
  // Vitesses, endurance et gravité : réglables dans data/joueur.json.
  walkSpeed: J.vitesseMarche,
  sprintSpeed: J.vitesseSprint,
  /** Réactivité du démarrage / de l'arrêt (plus grand = plus nerveux). */
  acceleration: J.acceleration,
  /** Écart de champ de vision en sprint (le champ de vision de base est dans les options). */
  sprintFovBonus: 8,
  /** Endurance : secondes de sprint possibles, et vitesse de récupération. */
  staminaSeconds: J.enduranceSecondes,
  staminaRegenPerSecond: J.recuperationParSeconde,
  staminaRegenDelay: J.delaiRecuperation,
  gravity: J.gravite,
};

export const FLASHLIGHT = {
  color: 0xfff1d6,
  intensity: 55,
  distance: 30,
  angle: 0.42,
  penumbra: 0.55,
  decay: 1.4,
  /** Retard de la lampe sur le regard (plus grand = suit plus vite). */
  followSpeed: 14,
};

export const PIZZA = {
  /** Distance max pour ramasser, et tolérance de visée (radians). */
  pickupDistance: J.distanceRamassage,
  pickupAngle: 0.45,
  throwSpeed: J.vitesseLancer,
  throwLift: J.elanLancer,
};

export const WORLD = {
  fogColor: 0x070a14,
  fogDensity: 0.042,
  /** Longueur de la rue (axe Z) et largeur de la chaussée (axe X). */
  streetLength: 96,
  roadWidth: 8,
  sidewalkWidth: 5,
  sidewalkHeight: 0.15,
};

export const QUALITY = {
  /** Résolution maximale par rapport à l'écran (1 = pleine résolution), selon l'option "Qualité". */
  maxPixelRatioByLevel: { basse: 0.75, moyenne: 1, haute: 1.5 },
  /** Taille de la carte d'ombre de la lampe selon la qualité. */
  shadowMapSizeByLevel: { basse: 512, moyenne: 768, haute: 1024 },
  minPixelRatio: 0.6,
  /** En dessous de ces images/s, on baisse un peu la résolution automatiquement. */
  targetFps: 55,
};

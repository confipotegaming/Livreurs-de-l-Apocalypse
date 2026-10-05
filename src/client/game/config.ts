// Réglages de la tranche visuelle, regroupés ici pour les ajuster facilement.
// Unités : mètres, secondes, radians.

export const PLAYER = {
  /** Rayon et demi-hauteur de la "capsule" de collision du livreur (hauteur totale ≈ 1,8 m). */
  radius: 0.35,
  halfHeight: 0.55,
  /** Hauteur des yeux au-dessus des pieds. */
  eyeHeight: 1.65,
  walkSpeed: 4.2,
  sprintSpeed: 7.2,
  /** Réactivité du démarrage / de l'arrêt (plus grand = plus nerveux). */
  acceleration: 12,
  mouseSensitivity: 0.0022,
  fov: 75,
  sprintFov: 83,
  /** Endurance : secondes de sprint possibles, et vitesse de récupération. */
  staminaSeconds: 4,
  staminaRegenPerSecond: 0.25,
  staminaRegenDelay: 1,
  gravity: 20,
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
  shadowMapSize: 1024,
};

export const PIZZA = {
  /** Distance max pour ramasser, et tolérance de visée (radians). */
  pickupDistance: 2.6,
  pickupAngle: 0.45,
  throwSpeed: 11,
  throwLift: 2.5,
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
  /** Résolution maximale par rapport à l'écran (1 = pleine résolution). */
  maxPixelRatio: 1.5,
  minPixelRatio: 0.6,
  /** En dessous de ces images/s, on baisse un peu la résolution automatiquement. */
  targetFps: 55,
};

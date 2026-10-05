import type {
  Difficulte,
  Modificateur,
  Note,
  Quartier,
  ReglagesPourboires,
  ReglagesProgression,
} from "./donnees.js";
import { MAX_PLAYERS } from "./game.js";

// Les règles du jeu sous forme de petits calculs, sans 3D ni affichage.
// Tous les chiffres viennent des fichiers de /data (passés en paramètre) : on peut donc
// rééquilibrer le jeu sans toucher à ce fichier. Chaque règle est vérifiée par les tests
// automatiques (dossier tests/).

// ---------------------------------------------------------------------------
// Pourboires
// ---------------------------------------------------------------------------

/**
 * Multiplicateur de rapidité. `ratioTemps` = temps mis / temps estimé
 * (0,5 = livré en deux fois moins de temps que prévu, 2 = deux fois plus lent).
 */
export function multiplicateurRapidite(ratioTemps: number, r: ReglagesPourboires): number {
  for (const palier of r.rapidite) {
    if (ratioTemps <= palier.jusqua) return palier.multiplicateur;
  }
  return r.rapidite[r.rapidite.length - 1]?.multiplicateur ?? 1;
}

/** Multiplicateur de série : nombre de livraisons enchaînées sans échec (celle-ci comprise). */
export function multiplicateurSerie(serie: number, r: ReglagesPourboires): number {
  let mult = 1;
  for (const palier of r.series) {
    if (serie >= palier.livraisons) mult = palier.multiplicateur;
  }
  return mult;
}

export interface Livraison {
  /** Pourboire de base du type de colis (colis.json). */
  base: number;
  /** Temps mis / temps estimé. */
  ratioTemps: number;
  /** État du colis : 1 = parfait, 0 = détruit. */
  etat: number;
  /** Livraisons enchaînées sans échec, celle-ci comprise. */
  serie: number;
  /** Multiplicateur de pourboire de la difficulté. */
  difficulte: number;
}

/** Pourboire = base × rapidité × état × série × difficulté, arrondi à l'euro. */
export function calculerPourboire(l: Livraison, r: ReglagesPourboires): number {
  const etat = Math.min(1, Math.max(r.etatMinimum, l.etat));
  const total =
    l.base * multiplicateurRapidite(l.ratioTemps, r) * etat * multiplicateurSerie(l.serie, r) * l.difficulte;
  return Math.max(0, Math.round(total));
}

/** Note de fin de tournée (S à D) selon les pourboires gagnés par joueur. */
export function noteDeFin(pourboiresTotaux: number, joueurs: number, r: ReglagesPourboires): Note {
  const parJoueur = pourboiresTotaux / limiterJoueurs(joueurs);
  for (const palier of r.notes) {
    if (parJoueur >= palier.pourboiresParJoueur) return palier.note;
  }
  return "D";
}

// ---------------------------------------------------------------------------
// XP et niveaux
// ---------------------------------------------------------------------------

/** XP nécessaire pour passer du niveau `niveau` au suivant. */
export function xpPourNiveauSuivant(niveau: number, p: ReglagesProgression): number {
  return Math.round(p.xpNiveauBase * Math.pow(p.croissance, niveau - 1));
}

/** Niveau atteint avec une quantité totale d'XP. */
export function niveauDepuisXp(xpTotale: number, p: ReglagesProgression) {
  let niveau = 1;
  let reste = Math.max(0, Math.floor(xpTotale));
  while (niveau < p.niveauMax && reste >= xpPourNiveauSuivant(niveau, p)) {
    reste -= xpPourNiveauSuivant(niveau, p);
    niveau++;
  }
  const auMax = niveau >= p.niveauMax;
  return {
    niveau,
    /** XP déjà gagnée dans le niveau actuel. */
    xpDansNiveau: auMax ? 0 : reste,
    /** XP à atteindre pour passer au niveau suivant (0 au niveau maximum). */
    xpPourSuivant: auMax ? 0 : xpPourNiveauSuivant(niveau, p),
  };
}

export interface BilanTournee {
  livraisons: number;
  reanimations: number;
  objectifs: number;
  note: Note;
}

/** XP gagnée en fin de tournée. */
export function xpDeTournee(b: BilanTournee, p: ReglagesProgression): number {
  return (
    b.livraisons * p.xp.livraison +
    b.reanimations * p.xp.reanimation +
    b.objectifs * p.xp.objectif +
    p.xp.note[b.note]
  );
}

// ---------------------------------------------------------------------------
// Réputation : quartiers et QG
// ---------------------------------------------------------------------------

export function quartierDebloque(q: Quartier, reputation: number): boolean {
  return reputation >= q.reputationRequise;
}

/** Palier actuel du QG (le plus haut atteint). */
export function palierQG(reputation: number, p: ReglagesProgression) {
  let actuel = p.paliersQG[0];
  for (const palier of p.paliersQG) if (reputation >= palier.reputationRequise) actuel = palier;
  return actuel;
}

// ---------------------------------------------------------------------------
// Difficulté et nombre de joueurs
// ---------------------------------------------------------------------------

export function limiterJoueurs(joueurs: number): number {
  return Math.min(MAX_PLAYERS, Math.max(1, Math.round(joueurs) || 1));
}

/**
 * Taille d'une tournée selon le quartier, la difficulté et le nombre de joueurs (1 à 8).
 * Chaque joueur en plus ajoute 75 % des commandes d'un joueur seul (à 8, on ne livre pas 8 fois plus).
 */
export function tailleTournee(q: Quartier, d: Difficulte, joueurs: number) {
  const n = limiterJoueurs(joueurs);
  const echelle = 1 + 0.75 * (n - 1);
  return {
    commandes: Math.max(1, Math.round(q.commandesParJoueur * echelle)),
    creatures: Math.max(1, Math.round(q.creaturesParJoueur * echelle * d.creatures)),
    /** Temps avant le couvre-feu, en secondes. */
    dureeSecondes: Math.round(q.dureeMinutes * 60 * d.dureeCouvreFeu),
  };
}

/** Tire au sort les modificateurs de la nuit. `aleatoire` renvoie un nombre entre 0 et 1. */
export function tirerModificateurs(liste: Modificateur[], aleatoire: () => number = Math.random): Modificateur[] {
  return liste.filter((m) => aleatoire() < m.probabilite);
}

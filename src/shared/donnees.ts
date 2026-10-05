// Forme des fichiers de réglages du dossier /data.
// Ce fichier ne contient que des "descriptions" (types) : il dit à TypeScript à quoi ressemble
// chaque fichier JSON, pour qu'une faute de frappe dans le code soit repérée tout de suite.
// La fonction `verifierDonnees` repère les erreurs dans les fichiers JSON eux-mêmes.

export interface Quartier {
  id: string;
  nom: string;
  description: string;
  reputationRequise: number;
  creatures: string[];
  dureeMinutes: number;
  commandesParJoueur: number;
  creaturesParJoueur: number;
}

export interface Difficulte {
  id: string;
  nom: string;
  creatures: number;
  vitesseCreatures: number;
  dureeCouvreFeu: number;
  pourboires: number;
}

export interface Modificateur {
  id: string;
  nom: string;
  probabilite: number;
  /** Effets (multiplicateurs) ; un effet absent vaut 1. */
  effets: { [effet: string]: number | undefined };
}

export interface Creature {
  id: string;
  nom: string;
  vitesseMarche: number;
  vitesseCharge: number;
  vision: number;
  ouie: number;
  degats: number;
  attireParNourriture: boolean;
  attireParLumiere: boolean;
  boss: boolean;
}

export interface TypeColis {
  id: string;
  nom: string;
  pourboireBase: number;
  porteursMin: number;
  porteursMax: number;
  vitessePorteur: number;
  refroidissementSecondes: number;
  fragile: boolean;
  bruitRayon: number;
  vivant: boolean;
  maudit: boolean;
}

export interface Objet {
  id: string;
  nom: string;
  categorie: "lampe" | "transport" | "utilitaire";
  prix: number;
  niveauRequis: number;
  [reglage: string]: unknown;
}

export type Note = "S" | "A" | "B" | "C" | "D";

export interface ReglagesPourboires {
  rapidite: { jusqua: number; multiplicateur: number }[];
  etatMinimum: number;
  series: { livraisons: number; multiplicateur: number }[];
  notes: { note: Note; pourboiresParJoueur: number }[];
}

export interface ReglagesProgression {
  niveauMax: number;
  xpNiveauBase: number;
  croissance: number;
  xp: { livraison: number; reanimation: number; objectif: number; note: Record<Note, number> };
  etoilesParNote: Record<Note, number>;
  paliersQG: { id: string; nom: string; reputationRequise: number }[];
  talents: {
    branches: { id: string; nom: string; bonus: { id: string; nom: string; parRang: number; rangMax: number }[] }[];
  };
}

export interface ReglagesJoueur {
  vitesseMarche: number;
  vitesseSprint: number;
  acceleration: number;
  enduranceSecondes: number;
  recuperationParSeconde: number;
  delaiRecuperation: number;
  gravite: number;
  aTerreSecondes: number;
  reanimationSecondes: number;
  distanceRamassage: number;
  vitesseLancer: number;
  elanLancer: number;
}

export interface ReglagesTension {
  calmeAvantMenace: number;
  repitApresDegats: number;
  menacesMaxSimultanees: number;
}

/** Toutes les données du jeu réunies. */
export interface Donnees {
  quartiers: Quartier[];
  difficultes: Difficulte[];
  modificateurs: Modificateur[];
  creatures: Creature[];
  colis: TypeColis[];
  objets: Objet[];
  pourboires: ReglagesPourboires;
  progression: ReglagesProgression;
  joueur: ReglagesJoueur;
  tension: ReglagesTension;
}

/**
 * Vérifie que les fichiers de /data sont cohérents (identifiants en double, créature inconnue,
 * nombre négatif…). Renvoie la liste des problèmes en français ; liste vide = tout va bien.
 */
export function verifierDonnees(d: Donnees): string[] {
  const problemes: string[] = [];
  const doublons = (fichier: string, liste: { id: string }[]) => {
    const vus = new Set<string>();
    for (const { id } of liste) {
      if (vus.has(id)) problemes.push(`${fichier} : l'identifiant « ${id} » est utilisé deux fois.`);
      vus.add(id);
    }
  };
  doublons("quartiers.json", d.quartiers);
  doublons("difficultes.json", d.difficultes);
  doublons("modificateurs.json", d.modificateurs);
  doublons("creatures.json", d.creatures);
  doublons("colis.json", d.colis);
  doublons("objets.json", d.objets);

  const creatures = new Set(d.creatures.map((c) => c.id));
  if (d.quartiers.length === 0) problemes.push("quartiers.json : il faut au moins un quartier.");
  if (d.quartiers[0] && d.quartiers[0].reputationRequise !== 0) {
    problemes.push("quartiers.json : le premier quartier doit être accessible dès le début (reputationRequise = 0).");
  }
  for (const q of d.quartiers) {
    for (const c of q.creatures) {
      if (!creatures.has(c)) problemes.push(`quartiers.json : ${q.nom} cite une créature inconnue « ${c} ».`);
    }
    if (q.dureeMinutes <= 0) problemes.push(`quartiers.json : ${q.nom} a une durée nulle ou négative.`);
  }

  if (d.difficultes.length === 0) problemes.push("difficultes.json : il faut au moins une difficulté.");
  for (const diff of d.difficultes) {
    for (const cle of ["creatures", "vitesseCreatures", "dureeCouvreFeu", "pourboires"] as const) {
      if (!(diff[cle] > 0)) problemes.push(`difficultes.json : ${diff.nom}.${cle} doit être plus grand que 0.`);
    }
  }
  for (const m of d.modificateurs) {
    if (m.probabilite < 0 || m.probabilite > 1) {
      problemes.push(`modificateurs.json : ${m.nom}.probabilite doit être entre 0 et 1.`);
    }
  }
  for (const c of d.colis) {
    if (c.porteursMin < 1 || c.porteursMax < c.porteursMin) {
      problemes.push(`colis.json : ${c.nom} a un nombre de porteurs incohérent.`);
    }
    if (c.pourboireBase < 0) problemes.push(`colis.json : ${c.nom} a un pourboire négatif.`);
  }
  for (const o of d.objets) {
    if (o.prix < 0) problemes.push(`objets.json : ${o.nom} a un prix négatif.`);
    if (!["lampe", "transport", "utilitaire"].includes(o.categorie)) {
      problemes.push(`objets.json : ${o.nom} a une catégorie inconnue « ${o.categorie} ».`);
    }
  }

  const croissant = (fichier: string, valeurs: number[]) => {
    for (let i = 1; i < valeurs.length; i++) {
      if (valeurs[i] <= valeurs[i - 1]) problemes.push(`${fichier} : les paliers doivent être rangés du plus petit au plus grand.`);
    }
  };
  croissant("pourboires.json (rapidite)", d.pourboires.rapidite.map((r) => r.jusqua));
  croissant("pourboires.json (series)", d.pourboires.series.map((s) => s.livraisons));
  croissant("progression.json (paliersQG)", d.progression.paliersQG.map((p) => p.reputationRequise));
  if (d.progression.paliersQG.length !== 5) problemes.push("progression.json : le QG doit avoir 5 paliers.");
  if (d.progression.niveauMax < 1) problemes.push("progression.json : niveauMax doit être au moins 1.");

  return problemes;
}

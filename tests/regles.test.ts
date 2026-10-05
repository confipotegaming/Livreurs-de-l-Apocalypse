import { describe, expect, it } from "vitest";
import { DONNEES, PROBLEMES_DONNEES, trouver } from "../src/client/data";
import { verifierDonnees, type Donnees } from "../src/shared/donnees";
import {
  calculerPourboire,
  multiplicateurRapidite,
  multiplicateurSerie,
  niveauDepuisXp,
  noteDeFin,
  palierQG,
  quartierDebloque,
  tailleTournee,
  tirerModificateurs,
  xpDeTournee,
  xpPourNiveauSuivant,
} from "../src/shared/regles";

// Tests automatiques des règles du jeu. Lancer : npm test
// Ils utilisent les VRAIS fichiers de /data : si un rééquilibrage casse une règle
// (ex. le Cauchemar paie moins que le Tranquille), un test le signale.

const P = DONNEES.pourboires;
const PROG = DONNEES.progression;

describe("fichiers /data", () => {
  it("ne contiennent aucune incohérence", () => {
    expect(PROBLEMES_DONNEES).toEqual([]);
  });

  it("repèrent une créature inconnue dans un quartier", () => {
    const casse: Donnees = structuredClone(DONNEES);
    casse.quartiers[0].creatures.push("licorne");
    expect(verifierDonnees(casse).join()).toContain("licorne");
  });

  it("contiennent les 5 quartiers, 3 difficultés, 6 créatures et 6 colis de la bible", () => {
    expect(DONNEES.quartiers.map((q) => q.id)).toEqual(["lilas", "centre", "galeries", "port", "hopital"]);
    expect(DONNEES.difficultes.map((d) => d.id)).toEqual(["tranquille", "agitee", "cauchemar"]);
    expect(DONNEES.creatures).toHaveLength(6);
    expect(DONNEES.colis).toHaveLength(6);
  });
});

describe("pourboires", () => {
  const base = { base: 10, ratioTemps: 1.2, etat: 1, serie: 1, difficulte: 1 };

  it("pourboire = base × rapidité × état × série × difficulté", () => {
    // Rapidité 1,2 → ×1 ; état parfait ; pas de série ; Tranquille.
    expect(calculerPourboire(base, P)).toBe(10);
    expect(calculerPourboire({ ...base, ratioTemps: 0.4 }, P)).toBe(15); // très rapide ×1,5
    expect(calculerPourboire({ ...base, etat: 0.5 }, P)).toBe(5);
    expect(calculerPourboire({ ...base, serie: 3 }, P)).toBe(20); // série ×2
    expect(calculerPourboire({ ...base, difficulte: 2.5 }, P)).toBe(25); // Cauchemar
  });

  it("plus on est rapide, plus ça paie", () => {
    expect(multiplicateurRapidite(0.3, P)).toBeGreaterThan(multiplicateurRapidite(1, P));
    expect(multiplicateurRapidite(1, P)).toBeGreaterThan(multiplicateurRapidite(3, P));
  });

  it("séries ×2, ×3, ×5", () => {
    expect(multiplicateurSerie(1, P)).toBe(1);
    expect(multiplicateurSerie(3, P)).toBe(2);
    expect(multiplicateurSerie(5, P)).toBe(3);
    expect(multiplicateurSerie(8, P)).toBe(5);
    expect(multiplicateurSerie(20, P)).toBe(5);
  });

  it("un colis détruit rapporte encore un tout petit peu, jamais négatif", () => {
    expect(calculerPourboire({ ...base, etat: 0 }, P)).toBe(1);
    expect(calculerPourboire({ ...base, etat: -3 }, P)).toBeGreaterThanOrEqual(0);
  });

  it("difficultés : ×1 / ×1,5 / ×2,5", () => {
    expect(DONNEES.difficultes.map((d) => d.pourboires)).toEqual([1, 1.5, 2.5]);
  });

  it("note de fin S à D selon les pourboires par joueur", () => {
    expect(noteDeFin(0, 1, P)).toBe("D");
    expect(noteDeFin(500, 2, P)).toBe("S");
    expect(noteDeFin(55, 1, P)).toBe("B");
    expect(noteDeFin(55, 4, P)).toBe("D");
  });
});

describe("XP et niveaux", () => {
  it("niveau 1 au départ, 30 au maximum", () => {
    expect(niveauDepuisXp(0, PROG).niveau).toBe(1);
    expect(niveauDepuisXp(1e9, PROG)).toEqual({ niveau: 30, xpDansNiveau: 0, xpPourSuivant: 0 });
  });

  it("chaque niveau demande un peu plus d'XP que le précédent", () => {
    for (let n = 1; n < 29; n++) {
      expect(xpPourNiveauSuivant(n + 1, PROG)).toBeGreaterThan(xpPourNiveauSuivant(n, PROG));
    }
  });

  it("passe au niveau 2 pile au bon moment", () => {
    const seuil = xpPourNiveauSuivant(1, PROG);
    expect(niveauDepuisXp(seuil - 1, PROG).niveau).toBe(1);
    expect(niveauDepuisXp(seuil, PROG)).toMatchObject({ niveau: 2, xpDansNiveau: 0 });
  });

  it("XP de tournée : livraisons + réanimations + objectifs + note", () => {
    const xp = xpDeTournee({ livraisons: 2, reanimations: 1, objectifs: 0, note: "B" }, PROG);
    expect(xp).toBe(2 * PROG.xp.livraison + PROG.xp.reanimation + PROG.xp.note.B);
  });

  it("même une tournée ratée rapporte de l'XP (pilier « toujours un truc à débloquer »)", () => {
    expect(xpDeTournee({ livraisons: 0, reanimations: 0, objectifs: 0, note: "D" }, PROG)).toBeGreaterThan(0);
  });
});

describe("réputation", () => {
  it("Les Lilas sont ouverts dès le début, l'Hôpital non", () => {
    expect(quartierDebloque(trouver(DONNEES.quartiers, "lilas"), 0)).toBe(true);
    expect(quartierDebloque(trouver(DONNEES.quartiers, "hopital"), 0)).toBe(false);
  });

  it("le QG passe du garage au siège social", () => {
    expect(palierQG(0, PROG).id).toBe("garage");
    expect(palierQG(10_000, PROG).id).toBe("siege");
  });
});

describe("difficulté et nombre de joueurs", () => {
  const lilas = trouver(DONNEES.quartiers, "lilas");
  const [tranquille, agitee, cauchemar] = DONNEES.difficultes;

  it("plus de joueurs = plus de commandes et de créatures", () => {
    const solo = tailleTournee(lilas, tranquille, 1);
    const huit = tailleTournee(lilas, tranquille, 8);
    expect(huit.commandes).toBeGreaterThan(solo.commandes);
    expect(huit.creatures).toBeGreaterThan(solo.creatures);
  });

  it("le nombre de joueurs est limité entre 1 et 8", () => {
    expect(tailleTournee(lilas, tranquille, 0)).toEqual(tailleTournee(lilas, tranquille, 1));
    expect(tailleTournee(lilas, tranquille, 50)).toEqual(tailleTournee(lilas, tranquille, 8));
  });

  it("plus c'est dur, plus il y a de créatures et moins de temps", () => {
    const t = tailleTournee(lilas, tranquille, 4);
    const a = tailleTournee(lilas, agitee, 4);
    const c = tailleTournee(lilas, cauchemar, 4);
    expect(c.creatures).toBeGreaterThan(a.creatures);
    expect(a.creatures).toBeGreaterThan(t.creatures);
    expect(c.dureeSecondes).toBeLessThan(t.dureeSecondes);
  });

  it("une tournée dure entre 12 et 20 minutes en Tranquille", () => {
    for (const q of DONNEES.quartiers) {
      const { dureeSecondes } = tailleTournee(q, tranquille, 1);
      expect(dureeSecondes).toBeGreaterThanOrEqual(12 * 60);
      expect(dureeSecondes).toBeLessThanOrEqual(20 * 60);
    }
  });

  it("tirage des modificateurs de nuit", () => {
    expect(tirerModificateurs(DONNEES.modificateurs, () => 0.99)).toEqual([]);
    expect(tirerModificateurs(DONNEES.modificateurs, () => 0)).toHaveLength(DONNEES.modificateurs.length);
  });
});

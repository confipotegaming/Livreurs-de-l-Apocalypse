import "./style.css";
import { ecouterErreursGlobales, signaler, VERSION } from "./core/diagnostic";
import { PASSAGES, type Ecran } from "./core/ecrans";
import { MachineAEtats, type Etat } from "./core/machine";
import { modifierOptions, options, OPTIONS_PAR_DEFAUT, surChangementOptions, type Qualite } from "./core/options";
import { DONNEES } from "./data";
import { Debug } from "./debug";
import type { Game } from "./game/Game";
import { formaterDuree } from "./game/tournee";
import { AVIS_CLIENTS, auHasard, REPLIQUES_GERARD } from "./textes";
import { noteDeFin, quartierDebloque, tailleTournee, xpDeTournee } from "../shared/regles";

// Point d'entrée du jeu dans le navigateur.
// Il relie la machine à états (quel écran est affiché) aux écrans HTML et au jeu 3D :
//   menu → QG → chargement → tournée → récap → QG…   (+ options, accessibles depuis le menu, le QG et la pause)

ecouterErreursGlobales();

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Le jeu 3D. Il n'est créé qu'au premier chargement d'une tournée, puis réutilisé. */
let jeu: Game | null = null;
/** Réputation du joueur. Toujours 0 pour l'instant (la progression arrive au jalon J3). */
const reputation = 0;
/** Choix faits au QG. */
const choix = { quartier: DONNEES.quartiers[0], difficulte: DONNEES.difficultes[0] };

for (const el of document.querySelectorAll(".version")) el.textContent = `version ${VERSION}`;

/** Affiche un écran HTML (et cache tous les autres). */
function afficher(id: string | null) {
  for (const ecran of document.querySelectorAll<HTMLElement>(".ecran")) {
    ecran.classList.toggle("hidden", ecran.id !== id);
  }
}

// ---------------------------------------------------------------------------
// Souris capturée (pointer lock)
// ---------------------------------------------------------------------------

/** Capture la souris pour jouer. Doit être appelé juste après un clic ou une touche. */
async function capturerSouris() {
  const canvas = jeu?.renderer.domElement;
  if (!canvas) return;
  $("pause-erreur").textContent = "";
  try {
    await canvas.requestPointerLock();
  } catch {
    // Le navigateur refuse si on recapture trop vite après Échap : il suffit de recliquer.
    $("pause-erreur").textContent = "Clique encore une fois pour reprendre.";
    afficher("ecran-pause");
  }
}

document.addEventListener("pointerlockchange", () => {
  if (machine.actuel !== "tournee" || !jeu) return;
  const enJeu = document.pointerLockElement === jeu.renderer.domElement;
  jeu.hud.show(enJeu);
  // Souris libérée (Échap) : pause, sauf si c'est le panneau de debug qui l'a libérée.
  afficher(enJeu || debug.panneauOuvert ? null : "ecran-pause");
});

// ---------------------------------------------------------------------------
// Les écrans
// ---------------------------------------------------------------------------

const menu: Etat<Ecran> = {
  entrer() {
    afficher("ecran-menu");
    $("menu-jouer").focus();
  },
};

const qg: Etat<Ecran> = {
  entrer() {
    afficher("ecran-qg");
    $("qg-gerard").textContent = `${auHasard(REPLIQUES_GERARD)} — Gérard, le patron`;
    dessinerChoixQG();
  },
};

function dessinerChoixQG() {
  const bouton = (titre: string, detail: string, choisi: boolean, actif: boolean, surClic: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = choisi ? "selected" : "";
    b.disabled = !actif;
    b.append(titre);
    const small = document.createElement("small");
    small.textContent = detail;
    b.append(small);
    b.addEventListener("click", () => {
      surClic();
      dessinerChoixQG();
    });
    return b;
  };

  $("qg-quartiers").replaceChildren(
    ...DONNEES.quartiers.map((q) => {
      const ouvert = quartierDebloque(q, reputation);
      // Pour l'instant, seule la rue des Lilas existe en 3D : les autres quartiers arrivent au jalon J6.
      const jouable = ouvert && q.id === "lilas";
      const detail = !ouvert ? `🔒 ${q.reputationRequise} ★ de réputation` : jouable ? q.description : "Bientôt";
      return bouton(q.nom, detail, q === choix.quartier, jouable, () => (choix.quartier = q));
    }),
  );
  $("qg-difficultes").replaceChildren(
    ...DONNEES.difficultes.map((d) =>
      bouton(d.nom, `Pourboires ×${d.pourboires.toLocaleString("fr-FR")}`, d === choix.difficulte, true, () => (choix.difficulte = d)),
    ),
  );
  const taille = tailleTournee(choix.quartier, choix.difficulte, 1);
  $("qg-resume").textContent =
    `Solo · couvre-feu dans ${formaterDuree(taille.dureeSecondes)} · ` +
    `${taille.commandes} commandes et ${taille.creatures} créature(s) prévues (elles arrivent au jalon J1).`;
}

const chargement: Etat<Ecran> = {
  entrer() {
    afficher("ecran-chargement");
    $("chargement-titre").textContent = `En route pour ${choix.quartier.nom}…`;
    $("chargement-erreur").textContent = "";
    $("chargement-retour").classList.add("hidden");
    $<HTMLButtonElement>("chargement-go").disabled = true;
    preparerTournee();
  },
};

async function preparerTournee() {
  const statut = $("chargement-statut");
  const barre = $("progress-fill");
  try {
    verifierNavigateur();
    if (!jeu) {
      // Le code 3D (Three.js, Rapier…) est lourd : il n'est téléchargé qu'au premier chargement.
      statut.textContent = "Chargement du moteur 3D…";
      const { Game } = await import("./game/Game");
      jeu = await Game.create($("game"), (charges, total) => {
        barre.style.width = `${Math.round((charges / total) * 100)}%`;
        statut.textContent = `Chargement de la rue… ${charges}/${total}`;
      });
      for (const f of jeu.loadReport.failed) signaler(`Modèle introuvable : ${f.path} (${f.reason})`);
      // Outil de test : ajouter ?debug à l'adresse pour accéder au jeu depuis la console (window.livreurs).
      if (new URLSearchParams(location.search).has("debug")) {
        (window as unknown as { livreurs: Game }).livreurs = jeu;
      }
    }
    barre.style.width = "100%";
    jeu.nouvelleTournee({ quartier: choix.quartier, difficulte: choix.difficulte, joueurs: 1 });
    const manquants = jeu.loadReport.failed.length;
    statut.textContent = manquants
      ? `Prêt, mais ${manquants} modèle(s) 3D manquant(s) (boîtes roses). Détails : F1.`
      : "La rue est prête. Ta pizza t'attend.";
    const go = $<HTMLButtonElement>("chargement-go");
    go.disabled = false;
    go.focus();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    signaler(`Chargement impossible : ${message}`);
    statut.textContent = "Impossible de charger la tournée.";
    $("chargement-erreur").textContent = message;
    $("chargement-retour").classList.remove("hidden");
  }
}

/** Repère les navigateurs qui ne peuvent pas faire tourner le jeu, avec un message clair. */
function verifierNavigateur() {
  const test = document.createElement("canvas");
  if (!test.getContext("webgl2")) {
    throw new Error(
      "Ton navigateur n'arrive pas à afficher la 3D (WebGL 2 indisponible). " +
        "Essaie Chrome, Firefox ou Edge à jour, et vérifie que « l'accélération matérielle » est activée dans ses paramètres.",
    );
  }
  if (!("requestPointerLock" in HTMLCanvasElement.prototype)) {
    throw new Error("Ce navigateur ne permet pas de capturer la souris : le jeu se joue sur ordinateur, clavier + souris.");
  }
}

const tournee: Etat<Ecran> = {
  entrer(depuis) {
    if (!jeu) throw new Error("La tournée commence avant que le jeu soit chargé.");
    jeu.start();
    // En revenant des options, on retrouve la pause ; sinon, on joue directement.
    afficher(depuis === "options" ? "ecran-pause" : null);
  },
  sortir() {
    jeu?.stop();
    jeu?.hud.show(false);
    if (document.pointerLockElement) document.exitPointerLock();
  },
};

const recap: Etat<Ecran> = {
  entrer() {
    afficher("ecran-recap");
    // Récap provisoire : aucune livraison n'est encore possible (jalon J1).
    const t = jeu?.tournee;
    const pourboires = 0;
    const note = noteDeFin(pourboires, 1, DONNEES.pourboires);
    const xp = xpDeTournee({ livraisons: 0, reanimations: 0, objectifs: 0, note }, DONNEES.progression);
    $("recap-note").textContent = note;
    const lignes: [string, string][] = [
      ["Quartier", `${t?.reglages?.quartier.nom ?? "?"} (${t?.reglages?.difficulte.nom ?? "?"})`],
      ["Durée", formaterDuree(t?.tempsEcoule ?? 0)],
      ["Livraisons", "0"],
      ["Pourboires", `${pourboires} €`],
      ["XP", `+${xp}`],
    ];
    $("recap-details").replaceChildren(
      ...lignes.flatMap(([titre, valeur]) => {
        const dt = document.createElement("dt");
        dt.textContent = titre;
        const dd = document.createElement("dd");
        dd.textContent = valeur;
        return [dt, dd];
      }),
    );
    $("recap-avis").textContent = auHasard(AVIS_CLIENTS);
    $("recap-qg").focus();
  },
};

const ecranOptions: Etat<Ecran> = {
  entrer() {
    afficher("ecran-options");
    afficherOptions();
  },
};

const machine = new MachineAEtats<Ecran>(
  { menu, qg, chargement, tournee, recap, options: ecranOptions },
  PASSAGES,
);

const debug = new Debug({
  machine,
  jeu: () => jeu,
  reprendre: () => capturerSouris(),
  terminerTournee: () => machine.aller("recap"),
});

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

const surClic = (id: string, action: () => void) => $(id).addEventListener("click", action);

surClic("menu-jouer", () => machine.aller("qg"));
surClic("menu-options", () => machine.aller("options"));
surClic("qg-partir", () => machine.aller("chargement"));
surClic("qg-options", () => machine.aller("options"));
surClic("qg-menu", () => machine.aller("menu"));
surClic("chargement-go", () => {
  machine.aller("tournee");
  capturerSouris();
});
surClic("chargement-retour", () => machine.aller("qg"));
surClic("pause-reprendre", () => capturerSouris());
surClic("pause-options", () => machine.aller("options"));
surClic("pause-abandon", () => machine.aller("recap"));
surClic("recap-qg", () => machine.aller("qg"));
surClic("opt-retour", () => machine.retour());
surClic("opt-defaut", () => {
  modifierOptions(OPTIONS_PAR_DEFAUT);
  afficherOptions();
});

// Clic sur le jeu en pause = reprendre.
$("game").addEventListener("click", () => {
  if (machine.actuel === "tournee" && !document.pointerLockElement && !debug.panneauOuvert) capturerSouris();
});

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const curseurs = [
  { id: "opt-sensibilite", cle: "sensibilite", format: (v: number) => `×${v.toFixed(2)}` },
  { id: "opt-fov", cle: "champDeVision", format: (v: number) => `${v}°` },
  { id: "opt-volume", cle: "volume", format: (v: number) => `${v} %` },
] as const;

function afficherOptions() {
  for (const c of curseurs) {
    $<HTMLInputElement>(c.id).value = String(options[c.cle]);
    $(`${c.id}-val`).textContent = c.format(options[c.cle]);
  }
  $<HTMLSelectElement>("opt-qualite").value = options.qualite;
}

for (const c of curseurs) {
  $(c.id).addEventListener("input", (e) => {
    const valeur = Number((e.target as HTMLInputElement).value);
    modifierOptions({ [c.cle]: valeur });
    $(`${c.id}-val`).textContent = c.format(valeur);
  });
}
$("opt-qualite").addEventListener("change", (e) => {
  modifierOptions({ qualite: (e.target as HTMLSelectElement).value as Qualite });
});
surChangementOptions(() => jeu?.applyQuality());

// C'est parti : on démarre sur le menu principal.
machine.aller("menu");

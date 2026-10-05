import { listeProblemes, surProbleme, VERSION } from "./core/diagnostic";
import type { MachineAEtats } from "./core/machine";
import type { Ecran } from "./core/ecrans";
import { DONNEES, PROBLEMES_DONNEES, trouver } from "./data";
import type { Game } from "./game/Game";
import { formaterDuree } from "./game/tournee";

// Outils de debug, touche F1 (ou ² sur un clavier AZERTY, pratique sur les portables
// où F1 demande d'appuyer aussi sur Fn).
// - En haut à gauche : infos en direct (images/s, position, objets chargés, erreurs…).
// - À droite : actions (téléporter, faire apparaître créatures et colis, invincible, couvre-feu…).
// Ouvrir le panneau libère la souris et met la tournée en pause ; le fermer la reprend.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export interface DebugOptions {
  machine: MachineAEtats<Ecran>;
  /** Le jeu 3D, ou null tant qu'aucune tournée n'a été chargée. */
  jeu: () => Game | null;
  /** Ferme le panneau pendant une tournée : il faut recapturer la souris. */
  reprendre: () => void;
  /** Termine la tournée (bouton "Terminer la tournée"). */
  terminerTournee: () => void;
}

export class Debug {
  /** Vrai quand le panneau d'actions est ouvert. */
  panneauOuvert = false;
  private infosVisibles = false;
  private readonly infos = $("debug-infos");
  private readonly texte = $("debug-texte");
  private readonly panneau = $("debug-panneau");
  private readonly actions = $<HTMLFieldSetElement>("dbg-actions");
  private readonly horsTournee = $("dbg-hors-tournee");
  private readonly garder = $<HTMLInputElement>("dbg-garder");
  private readonly listeErreurs = $("dbg-problemes");

  constructor(private readonly o: DebugOptions) {
    for (const p of PROBLEMES_DONNEES) console.error(`[Livreurs] /data : ${p}`);

    window.addEventListener("keydown", (e) => {
      if (e.code !== "F1" && e.code !== "Backquote") return;
      // Empêche l'aide du navigateur de s'ouvrir avec F1.
      e.preventDefault();
      if (!e.repeat) this.basculer();
    });
    $("dbg-fermer").addEventListener("click", () => this.fermer());

    this.remplirListes();
    this.brancherActions();
    surProbleme(() => this.majErreurs());
    this.majErreurs();
    o.machine.surChangement(() => this.majDisponibilite());

    // Les infos sont rafraîchies 4 fois par seconde (assez pour lire, sans ralentir le jeu).
    setInterval(() => this.majInfos(), 250);
  }

  basculer() {
    if (this.panneauOuvert) this.fermer();
    else this.ouvrir();
  }

  ouvrir() {
    this.panneauOuvert = true;
    this.infosVisibles = true;
    this.panneau.classList.remove("hidden");
    this.infos.classList.remove("hidden");
    this.majDisponibilite();
    this.majInfos();
    // On libère la souris pour pouvoir cliquer dans le panneau.
    if (document.pointerLockElement) document.exitPointerLock();
  }

  fermer() {
    this.panneauOuvert = false;
    this.panneau.classList.add("hidden");
    this.infosVisibles = this.garder.checked;
    this.infos.classList.toggle("hidden", !this.infosVisibles);
    if (this.o.machine.actuel === "tournee") this.o.reprendre();
  }

  private get jeuEnTournee(): Game | null {
    return this.o.machine.actuel === "tournee" ? this.o.jeu() : null;
  }

  private majDisponibilite() {
    const actif = this.jeuEnTournee !== null;
    this.actions.disabled = !actif;
    this.horsTournee.classList.toggle("hidden", actif);
    const jeu = this.o.jeu();
    $<HTMLInputElement>("dbg-invincible").checked = jeu?.invincible ?? false;
    // Les points de téléportation dépendent de la rue : on les ajoute une fois le jeu chargé.
    const tp = $<HTMLSelectElement>("dbg-tp");
    if (jeu && tp.options.length === 0) {
      for (const [i, point] of jeu.teleportPoints.entries()) tp.add(new Option(point.nom, String(i)));
    }
  }

  private remplirListes() {
    const creatures = $<HTMLSelectElement>("dbg-creature");
    for (const c of DONNEES.creatures) creatures.add(new Option(`Créature : ${c.nom}`, c.id));
    const colis = $<HTMLSelectElement>("dbg-colis");
    for (const c of DONNEES.colis) colis.add(new Option(`Colis : ${c.nom}`, c.id));
  }

  private brancherActions() {
    const surClic = (id: string, action: (jeu: Game) => void) =>
      $(id).addEventListener("click", () => {
        const jeu = this.jeuEnTournee;
        if (jeu) action(jeu);
        this.majInfos();
      });

    surClic("dbg-tp-go", (jeu) => {
      const point = jeu.teleportPoints[Number($<HTMLSelectElement>("dbg-tp").value)];
      jeu.teleport(point.position.x, point.position.z, point.position.y);
    });
    surClic("dbg-xz-go", (jeu) => {
      jeu.teleport(Number($<HTMLInputElement>("dbg-x").value) || 0, Number($<HTMLInputElement>("dbg-z").value) || 0);
    });
    surClic("dbg-creature-go", (jeu) => {
      jeu.spawnCreature(trouver(DONNEES.creatures, $<HTMLSelectElement>("dbg-creature").value));
    });
    surClic("dbg-colis-go", (jeu) => {
      jeu.spawnColis(trouver(DONNEES.colis, $<HTMLSelectElement>("dbg-colis").value));
    });
    surClic("dbg-couvrefeu", (jeu) => jeu.tournee.passerAuCouvreFeu());
    surClic("dbg-vider", (jeu) => jeu.clearDebugSpawns());
    surClic("dbg-recap", () => {
      this.fermer();
      this.o.terminerTournee();
    });
    $<HTMLInputElement>("dbg-invincible").addEventListener("change", (e) => {
      const jeu = this.o.jeu();
      if (jeu) jeu.invincible = (e.target as HTMLInputElement).checked;
    });
    this.garder.addEventListener("change", () => {
      if (!this.panneauOuvert) {
        this.infosVisibles = this.garder.checked;
        this.infos.classList.toggle("hidden", !this.infosVisibles);
      }
    });
  }

  /** Toutes les erreurs : fichiers /data, puis le carnet (modèles 3D non chargés, erreurs JavaScript…). */
  private toutesLesErreurs(): string[] {
    return [...PROBLEMES_DONNEES.map((p) => `/data : ${p}`), ...listeProblemes().map((p) => p.message)];
  }

  private majErreurs() {
    this.listeErreurs.replaceChildren(
      ...this.toutesLesErreurs().map((texte) => {
        const li = document.createElement("li");
        li.textContent = texte;
        return li;
      }),
    );
  }

  private majInfos() {
    if (!this.infosVisibles) return;
    const jeu = this.o.jeu();
    const ecran = this.o.machine.actuel ?? "?";
    const lignes = [`Livreurs de l'Apocalypse — version ${VERSION}`, `Écran : ${ecran}`];

    if (jeu) {
      const s = jeu.stats();
      const p = jeu.player.feet;
      const t = jeu.tournee;
      const enPause = ecran === "tournee" && !jeu.input.locked;
      lignes.push(
        `Images/s : ${ecran === "tournee" && !enPause ? Math.round(jeu.fps) : "— (en pause)"}  ·  résolution ×${s.pixelRatio.toFixed(2)}`,
        `Position : x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)}  z ${p.z.toFixed(1)}`,
        `Objets 3D : ${s.meshes}  ·  appels de dessin : ${s.drawCalls}`,
        `Modèles chargés : ${s.modelsLoaded}/${s.modelsTotal}`,
        `Physique : ${s.bodies} corps, ${s.colliders} formes`,
        `Mannequins : ${s.creatures} créature(s), ${s.colis} colis`,
      );
      if (t.reglages) {
        const fin = t.couvreFeu ? "COUVRE-FEU" : `couvre-feu dans ${formaterDuree(t.tempsRestant)}`;
        lignes.push(`Tournée : ${t.reglages.quartier.nom} · ${t.reglages.difficulte.nom} · ${fin}`);
      }
      lignes.push(`Invincible : ${jeu.invincible ? "oui" : "non"}`);
    } else {
      lignes.push("Rue 3D : pas encore chargée (lancez une tournée depuis le QG).");
    }

    const erreurs = this.toutesLesErreurs();
    this.texte.textContent = lignes.join("\n");
    const ligneErreurs = document.createElement("span");
    ligneErreurs.className = erreurs.length ? "ko" : "";
    ligneErreurs.textContent = `\nErreurs : ${erreurs.length}${erreurs.length ? ` (dernière : ${erreurs[erreurs.length - 1]})` : ""}`;
    this.texte.append(ligneErreurs);
  }
}

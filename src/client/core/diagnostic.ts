// Le "carnet de bord" des problèmes : modèles 3D qui n'ont pas pu être chargés,
// erreurs JavaScript, fichiers /data incohérents… Tout est affiché dans le panneau de debug (F1)
// et dans la console du navigateur (F12).

export interface Probleme {
  quand: number;
  message: string;
}

const problemes: Probleme[] = [];
const ecouteurs: (() => void)[] = [];

/** Version du jeu : identifiant du commit Git et date du build (voir vite.config.ts). */
export const VERSION = `${__VERSION__} · ${__DATE_BUILD__}`;

export function signaler(message: string) {
  console.error(`[Livreurs] ${message}`);
  problemes.push({ quand: performance.now(), message });
  // On garde les 50 derniers pour ne pas remplir la mémoire si une erreur se répète.
  if (problemes.length > 50) problemes.shift();
  for (const e of ecouteurs) e();
}

export function listeProblemes(): readonly Probleme[] {
  return problemes;
}

export function surProbleme(ecouteur: () => void) {
  ecouteurs.push(ecouteur);
}

/** Capture aussi les erreurs inattendues (bugs) pour les montrer dans F1. */
export function ecouterErreursGlobales() {
  window.addEventListener("error", (e) => signaler(`Erreur : ${e.message}`));
  window.addEventListener("unhandledrejection", (e) => {
    const raison = e.reason instanceof Error ? e.reason.message : String(e.reason);
    signaler(`Erreur : ${raison}`);
  });
}

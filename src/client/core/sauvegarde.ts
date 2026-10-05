// Sauvegarde LOCALE (dans le navigateur, via localStorage).
// Pour l'instant elle ne garde que les options. Au jalon J3, la progression sera sauvegardée
// sur le serveur (PostgreSQL de Render) et ce fichier servira de secours (voir docs/ARCHITECTURE.md).
// Chaque lecture/écriture est protégée : en navigation privée, localStorage peut être interdit.

const PREFIXE = "livreurs.";

export function lireLocal<T>(cle: string, defaut: T): T {
  try {
    const texte = localStorage.getItem(PREFIXE + cle);
    if (texte === null) return defaut;
    // On complète avec les valeurs par défaut (utile quand on ajoute une nouvelle option).
    return { ...defaut, ...JSON.parse(texte) };
  } catch {
    return defaut;
  }
}

export function ecrireLocal(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
  } catch {
    // Stockage impossible (navigation privée…) : tant pis, les options dureront le temps de la partie.
  }
}

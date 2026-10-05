// Petites phrases du jeu. Pour en ajouter : une ligne de plus dans la liste, entre guillemets.

/** Ce que dit Gérard au téléphone avant la tournée. */
export const REPLIQUES_GERARD = [
  "« Alors, la pizza, elle va pas se livrer toute seule. Et non, l'essence n'est pas remboursée. »",
  "« Si tu croises un truc avec des dents, tu souris, tu dis “Express Apocalypse”, et tu cours. »",
  "« Le casque ? Quel casque ? On a un budget, moi. »",
  "« Le dernier livreur a dit qu'il revenait dans cinq minutes. C'était mardi. »",
  "« Un pourboire, c'est un pourboire. Une morsure, c'est un arrêt maladie non payé. »",
];

/** Avis de clients pour le récap (provisoire, en attendant le vrai récap de J1). */
export const AVIS_CLIENTS = [
  "« Le livreur a hurlé en me tendant la pizza. 5 étoiles. » — M. Dupuis, 3e étage",
  "« Je n'ai rien commandé, mais il est quand même venu. Inquiétant. 3 étoiles. »",
  "« Pizza froide. Livreur froid aussi, je crois. 1 étoile. »",
  "« Il a lancé la boîte par la fenêtre. Pile dans mes bras. Bravo. 4 étoiles. »",
];

export function auHasard<T>(liste: readonly T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}

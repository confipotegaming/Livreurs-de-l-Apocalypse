import { MapSchema, Schema, type } from "@colyseus/schema";

// L'"état" du jeu : ce que le serveur envoie automatiquement à tous les joueurs.
// Colyseus n'envoie que ce qui a changé, plusieurs fois par seconde.
// Pour l'instant, on ne garde que le pseudo : les positions 3D viendront avec le multijoueur.

export class Player extends Schema {
  @type("string") name = "Livreur";
}

export class GameState extends Schema {
  /** Les joueurs, rangés par identifiant de connexion (sessionId). */
  @type({ map: Player }) players = new MapSchema<Player>();
}

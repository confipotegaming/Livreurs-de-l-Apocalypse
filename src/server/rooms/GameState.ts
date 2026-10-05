import { MapSchema, Schema, type } from "@colyseus/schema";

// L'"état" du jeu : ce que le serveur envoie automatiquement à tous les joueurs.
// Colyseus n'envoie que ce qui a changé, plusieurs fois par seconde.

export class Player extends Schema {
  @type("string") name = "Livreur";
  @type("uint32") color = 0xffffff;
  @type("number") x = 0;
  @type("number") y = 0;
  /** Angle de la lampe, en radians. */
  @type("number") angle = 0;
  /** Dernière entrée clavier appliquée par le serveur (sert à la prédiction côté navigateur). */
  @type("uint32") lastSeq = 0;
}

export class GameState extends Schema {
  /** Les joueurs, rangés par identifiant de connexion (sessionId). */
  @type({ map: Player }) players = new MapSchema<Player>();
}

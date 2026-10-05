import type { MapSchema } from "@colyseus/schema";

// Forme de l'état du jeu tel que le navigateur le reçoit du serveur.
// (La version "officielle" est dans src/server/rooms/GameState.ts.)

export interface PlayerView {
  name: string;
  color: number;
  x: number;
  y: number;
  angle: number;
  lastSeq: number;
}

export interface GameStateView {
  players: MapSchema<PlayerView>;
}

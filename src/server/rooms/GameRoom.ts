import { Client, Room } from "@colyseus/core";
import { MAX_PLAYERS, ROOM_CODE_LETTERS, sanitizeName } from "../../shared/game.js";
import { GameState, Player } from "./GameState.js";

/** Codes de salon déjà utilisés (pour ne jamais en donner deux identiques). */
const usedCodes = new Set<string>();

interface JoinOptions {
  name?: string;
}

/**
 * Une "salle" Colyseus = un salon de jeu.
 * Son identifiant est le code à 4 lettres que les joueurs se partagent.
 *
 * La tranche visuelle 3D actuelle est en solo et ne s'y connecte pas encore :
 * cette salle est gardée prête pour le retour du multijoueur.
 */
export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  state = new GameState();

  onCreate() {
    this.roomId = generateRoomCode();
    console.log(`[salon ${this.roomId}] créé`);
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.name = sanitizeName(options?.name);
    this.state.players.set(client.sessionId, player);
    console.log(`[salon ${this.roomId}] ${player.name} arrive (${this.clients.length}/${this.maxClients})`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[salon ${this.roomId}] ${player?.name ?? "?"} part`);
  }

  onDispose() {
    usedCodes.delete(this.roomId);
    console.log(`[salon ${this.roomId}] fermé`);
  }
}

function generateRoomCode(): string {
  let code: string;
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += ROOM_CODE_LETTERS[Math.floor(Math.random() * ROOM_CODE_LETTERS.length)];
    }
  } while (usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

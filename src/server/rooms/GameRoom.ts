import { Client, Room } from "@colyseus/core";
import {
  INPUT_STEP_MS,
  MAX_PLAYERS,
  PLAYER_COLORS,
  ROOM_CODE_LETTERS,
  SERVER_TICK_MS,
  SPAWN_POINT,
  collides,
  movePlayer,
  sanitizeName,
  type InputMessage,
} from "../../shared/game.js";
import { GameState, Player } from "./GameState.js";

/** Codes de salon déjà utilisés (pour ne jamais en donner deux identiques). */
const usedCodes = new Set<string>();

/** Au-delà, on jette les vieilles entrées (joueur qui a trop de retard). */
const MAX_QUEUED_INPUTS = 60;
/** Entrées appliquées au maximum par calcul serveur (3 attendues + marge pour le réseau). */
const MAX_INPUTS_PER_TICK = 6;

interface JoinOptions {
  name?: string;
}

/**
 * Une "salle" Colyseus = un salon de jeu.
 * Son identifiant est le code à 4 lettres que les joueurs se partagent.
 */
export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  state = new GameState();

  /** Entrées clavier reçues et pas encore appliquées, par joueur. */
  private inputQueues = new Map<string, InputMessage[]>();

  onCreate() {
    this.roomId = generateRoomCode();
    console.log(`[salon ${this.roomId}] créé`);

    this.onMessage("input", (client, message: InputMessage) => {
      if (!isValidInput(message)) return;
      const queue = this.inputQueues.get(client.sessionId);
      if (!queue) return;
      queue.push(message);
      if (queue.length > MAX_QUEUED_INPUTS) queue.splice(0, queue.length - MAX_QUEUED_INPUTS);
    });

    // Boucle de jeu : 20 calculs par seconde.
    this.setSimulationInterval(() => this.update(), SERVER_TICK_MS);
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new Player();
    player.name = sanitizeName(options?.name);
    player.color = this.pickFreeColor();
    const spawn = this.findSpawnPosition();
    player.x = spawn.x;
    player.y = spawn.y;
    player.angle = -Math.PI / 2; // lampe tournée vers le haut

    this.state.players.set(client.sessionId, player);
    this.inputQueues.set(client.sessionId, []);
    console.log(`[salon ${this.roomId}] ${player.name} arrive (${this.clients.length}/${this.maxClients})`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.inputQueues.delete(client.sessionId);
    console.log(`[salon ${this.roomId}] ${player?.name ?? "?"} part`);
  }

  onDispose() {
    usedCodes.delete(this.roomId);
    console.log(`[salon ${this.roomId}] fermé`);
  }

  /** Applique les entrées clavier en attente de chaque joueur. */
  private update() {
    const dt = INPUT_STEP_MS / 1000;
    this.inputQueues.forEach((queue, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;
      const inputs = queue.splice(0, MAX_INPUTS_PER_TICK);
      for (const input of inputs) {
        const pos = movePlayer(player.x, player.y, input.dx, input.dy, dt);
        player.x = pos.x;
        player.y = pos.y;
        player.angle = input.angle;
        player.lastSeq = input.seq;
      }
    });
  }

  private pickFreeColor(): number {
    const taken = new Set<number>();
    this.state.players.forEach((p) => taken.add(p.color));
    return PLAYER_COLORS.find((c) => !taken.has(c)) ?? PLAYER_COLORS[0];
  }

  /** Place les nouveaux venus en cercle autour du point d'apparition, sans chevauchement. */
  private findSpawnPosition(): { x: number; y: number } {
    const others: Player[] = [];
    this.state.players.forEach((p) => others.push(p));
    for (let i = 0; i < 24; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = i === 0 ? 0 : 48 * Math.ceil(i / 8);
      const x = SPAWN_POINT.x + Math.cos(angle) * dist;
      const y = SPAWN_POINT.y + Math.sin(angle) * dist;
      const free = !collides(x, y) && others.every((p) => Math.hypot(p.x - x, p.y - y) > 40);
      if (free) return { x, y };
    }
    return { ...SPAWN_POINT };
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

function isValidInput(m: unknown): m is InputMessage {
  if (typeof m !== "object" || m === null) return false;
  const i = m as Record<string, unknown>;
  return (
    Number.isInteger(i.seq) &&
    typeof i.dx === "number" &&
    typeof i.dy === "number" &&
    typeof i.angle === "number" &&
    Number.isFinite(i.angle)
  );
}

import Phaser from "phaser";
import { getStateCallbacks, type Room } from "colyseus.js";
import {
  INPUT_STEP_MS,
  LAMP_HALF_ANGLE,
  LAMP_RANGE,
  OBSTACLES,
  PLAYER_RADIUS,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  movePlayer,
  type InputMessage,
  type Rect,
} from "../../shared/game";
import type { GameStateView, PlayerView } from "../types";

/** Opacité du noir (1 = noir total). */
const DARKNESS_ALPHA = 0.97;
/** Nombre de rayons lancés pour dessiner un cône de lampe. */
const LAMP_RAYS = 48;
/** Couches superposées du cône : plus il y en a, plus le dégradé est doux. */
const LAMP_LAYERS = 6;

/** Ce qu'on sait d'un livreur affiché à l'écran. */
interface PlayerSprite {
  body: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  /** Position/angle visés (reçus du serveur), vers lesquels on glisse en douceur. */
  targetX: number;
  targetY: number;
  targetAngle: number;
  /** Petit grain propre à chaque lampe pour qu'elles ne grésillent pas en même temps. */
  flickerSeed: number;
}

/**
 * La salle sombre où se promènent les livreurs.
 *
 * Multijoueur, en résumé :
 * - notre livreur bouge TOUT DE SUITE quand on appuie sur une touche (prédiction) ;
 * - chaque pas est aussi envoyé au serveur, qui fait le même calcul et a le dernier mot ;
 * - quand le serveur répond, on repart de sa position et on rejoue les pas qu'il n'a pas encore vus ;
 * - les autres livreurs glissent doucement vers la position envoyée par le serveur.
 */
export class RoomScene extends Phaser.Scene {
  private readonly room: Room<GameStateView>;
  private readonly players = new Map<string, PlayerSprite>();

  // Notre propre livreur
  private predicted = { x: 0, y: 0 };
  private aimAngle = 0;
  private pendingInputs: InputMessage[] = [];
  private nextSeq = 1;
  private accumulator = 0;
  private lastSentAngle = Number.NaN;

  private keys!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key[]>;
  private darkness!: Phaser.GameObjects.RenderTexture;
  private lightBrush!: Phaser.GameObjects.Graphics;

  constructor(room: Room<GameStateView>) {
    super("room");
    this.room = room;
  }

  create() {
    this.drawFloor();
    this.drawObstacles();

    // L'obscurité : une grande image noire dans laquelle on "gomme" la lumière à chaque image.
    this.darkness = this.add.renderTexture(0, 0, ROOM_WIDTH, ROOM_HEIGHT).setOrigin(0, 0).setDepth(100);
    // Pinceau invisible qui sert à dessiner les zones éclairées avant de les gommer.
    this.lightBrush = this.make.graphics({}, false);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    camera.setRoundPixels(true);

    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const keys = (...codes: number[]) => codes.map((c) => kb.addKey(c));
    // ZQSD (clavier AZERTY), WASD (QWERTY) et les flèches.
    this.keys = {
      up: keys(K.Z, K.W, K.UP),
      down: keys(K.S, K.DOWN),
      left: keys(K.Q, K.A, K.LEFT),
      right: keys(K.D, K.RIGHT),
    };

    this.listenToServer();
  }

  /** Branche les réactions aux changements envoyés par le serveur. */
  private listenToServer() {
    const $ = getStateCallbacks(this.room);

    $(this.room.state).players.onAdd((player: PlayerView, sessionId: string) => {
      const isMe = sessionId === this.room.sessionId;
      const sprite = this.createPlayerSprite(player, isMe);
      this.players.set(sessionId, sprite);

      if (isMe) {
        this.predicted = { x: player.x, y: player.y };
        this.aimAngle = player.angle;
        this.cameras.main.startFollow(sprite.body, true, 0.12, 0.12);
      }

      $(player).onChange(() => {
        if (isMe) this.reconcile(player);
        else {
          sprite.targetX = player.x;
          sprite.targetY = player.y;
          sprite.targetAngle = player.angle;
        }
      });
      this.refreshPlayerList();
    });

    $(this.room.state).players.onRemove((_player: PlayerView, sessionId: string) => {
      const sprite = this.players.get(sessionId);
      sprite?.body.destroy();
      sprite?.label.destroy();
      this.players.delete(sessionId);
      this.refreshPlayerList();
    });
  }

  /**
   * Le serveur a envoyé notre position officielle : on repart de là
   * et on rejoue les pas qu'il n'a pas encore traités.
   */
  private reconcile(server: PlayerView) {
    this.pendingInputs = this.pendingInputs.filter((input) => input.seq > server.lastSeq);
    let pos = { x: server.x, y: server.y };
    for (const input of this.pendingInputs) {
      pos = movePlayer(pos.x, pos.y, input.dx, input.dy, INPUT_STEP_MS / 1000);
    }
    this.predicted = pos;
  }

  update(_time: number, delta: number) {
    const me = this.players.get(this.room.sessionId);
    if (!me) return;

    // Orientation de la lampe vers la souris.
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.aimAngle = Math.atan2(world.y - this.predicted.y, world.x - this.predicted.x);

    // Déplacement par petits pas fixes de 1/60 s, identiques à ceux du serveur.
    // On compte le temps réel (rawDelta) : Phaser "ralentit" son delta quand le PC rame,
    // et notre livreur avancerait alors moins vite que prévu.
    this.accumulator = Math.min(this.accumulator + this.game.loop.rawDelta, 250);
    while (this.accumulator >= INPUT_STEP_MS) {
      this.accumulator -= INPUT_STEP_MS;
      this.stepLocalPlayer();
    }

    me.body.setPosition(this.predicted.x, this.predicted.y);
    me.body.rotation = this.aimAngle;

    // Les autres livreurs glissent vers leur position officielle.
    const smoothing = 1 - Math.exp(-delta / 70);
    this.players.forEach((sprite, sessionId) => {
      if (sessionId === this.room.sessionId) return;
      const body = sprite.body;
      body.x += (sprite.targetX - body.x) * smoothing;
      body.y += (sprite.targetY - body.y) * smoothing;
      body.rotation += Phaser.Math.Angle.Wrap(sprite.targetAngle - body.rotation) * smoothing;
    });

    this.players.forEach((sprite) => {
      sprite.label.setPosition(sprite.body.x, sprite.body.y - PLAYER_RADIUS - 8);
    });

    this.drawLighting();
  }

  /** Un pas de 1/60 s : on bouge tout de suite, et on prévient le serveur. */
  private stepLocalPlayer() {
    const pressed = (list: Phaser.Input.Keyboard.Key[]) => list.some((k) => k.isDown);
    const dx = (pressed(this.keys.right) ? 1 : 0) - (pressed(this.keys.left) ? 1 : 0);
    const dy = (pressed(this.keys.down) ? 1 : 0) - (pressed(this.keys.up) ? 1 : 0);

    const angleChanged = !(Math.abs(Phaser.Math.Angle.Wrap(this.aimAngle - this.lastSentAngle)) < 0.01);
    // Rien ne bouge : inutile d'envoyer un message.
    if (dx === 0 && dy === 0 && !angleChanged) return;

    const input: InputMessage = { seq: this.nextSeq++, dx, dy, angle: this.aimAngle };
    this.predicted = movePlayer(this.predicted.x, this.predicted.y, dx, dy, INPUT_STEP_MS / 1000);
    this.pendingInputs.push(input);
    this.room.send("input", input);
    this.lastSentAngle = this.aimAngle;
  }

  // ---------------------------------------------------------------------------
  // Lumière
  // ---------------------------------------------------------------------------

  private drawLighting() {
    const brush = this.lightBrush;
    brush.clear();
    const now = this.time.now;

    // Néon de la cuisine qui grésille.
    if (Math.sin(now / 90) + Math.sin(now / 37) > -0.6 || Math.random() < 0.02) {
      brush.fillStyle(0xffffff, 0.35);
      brush.fillCircle(250, 290, 120);
      brush.fillStyle(0xffffff, 0.25);
      brush.fillCircle(250, 290, 70);
    }

    this.players.forEach((sprite) => {
      const { x, y, rotation } = sprite.body;
      // Petit halo autour du livreur, pour qu'on se voie soi-même.
      brush.fillStyle(0xffffff, 0.3);
      brush.fillCircle(x, y, 56);
      brush.fillStyle(0xffffff, 0.3);
      brush.fillCircle(x, y, 30);
      this.drawLampCone(x, y, rotation, this.lampFlicker(sprite.flickerSeed, now));
    });

    this.darkness.clear();
    this.darkness.fill(0x000000, DARKNESS_ALPHA);
    this.darkness.erase(brush);
  }

  /** Une lampe qui faiblit parfois un instant (piles fatiguées). */
  private lampFlicker(seed: number, now: number): number {
    const t = now / 1000 + seed;
    const wobble = Math.sin(t * 3.1) * 0.02 + Math.sin(t * 7.7) * 0.015;
    const dip = Math.sin(t * 0.9) > 0.985 ? 0.25 : 0;
    return 1 + wobble - dip;
  }

  /**
   * Dessine le cône de lampe : on lance des rayons qui s'arrêtent sur les obstacles,
   * en plusieurs couches de plus en plus courtes pour obtenir un dégradé.
   */
  private drawLampCone(x: number, y: number, angle: number, intensity: number) {
    const range = LAMP_RANGE * intensity;
    const hits: number[] = [];
    const directions: { cos: number; sin: number }[] = [];
    const spread = LAMP_HALF_ANGLE * 1.15;
    for (let i = 0; i <= LAMP_RAYS; i++) {
      const a = angle - spread + (2 * spread * i) / LAMP_RAYS;
      const dir = { cos: Math.cos(a), sin: Math.sin(a) };
      directions.push(dir);
      // +10 px : on éclaire un peu la face des meubles touchés.
      hits.push(Math.min(range, castRay(x, y, dir.cos, dir.sin, range) + 10));
    }

    for (let layer = 0; layer < LAMP_LAYERS; layer++) {
      const t = layer / (LAMP_LAYERS - 1); // 0 = couche la plus large, 1 = cœur du faisceau
      const radius = range * (1 - 0.65 * t);
      const narrow = 1 - 0.35 * t; // le cœur du faisceau est plus étroit
      const points: Phaser.Types.Math.Vector2Like[] = [{ x, y }];
      for (let i = 0; i <= LAMP_RAYS; i++) {
        const offset = (i / LAMP_RAYS) * 2 - 1; // de -1 (bord gauche) à 1 (bord droit)
        if (Math.abs(offset) > narrow) continue;
        const d = Math.min(hits[i], radius);
        points.push({ x: x + directions[i].cos * d, y: y + directions[i].sin * d });
      }
      this.lightBrush.fillStyle(0xffffff, 0.26 * intensity);
      this.lightBrush.fillPoints(points, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Dessins (formes simples, aucune image externe)
  // ---------------------------------------------------------------------------

  private createPlayerSprite(player: PlayerView, isMe: boolean): PlayerSprite {
    const g = this.add.graphics();
    // Sac de livraison sur le dos
    g.fillStyle(0x1d1d1d, 1);
    g.fillRoundedRect(-PLAYER_RADIUS - 8, -11, 14, 22, 3);
    g.fillStyle(player.color, 1);
    g.fillRect(-PLAYER_RADIUS - 5, -3, 8, 6);
    // Corps
    g.fillStyle(player.color, 1);
    g.fillCircle(0, 0, PLAYER_RADIUS);
    g.lineStyle(3, 0x111111, 1);
    g.strokeCircle(0, 0, PLAYER_RADIUS);
    // Casquette (visière vers l'avant)
    g.fillStyle(0x222222, 1);
    g.fillCircle(-2, 0, 9);
    g.fillRect(4, -6, 8, 12);
    // Lampe tenue devant
    g.fillStyle(0xfff3b0, 1);
    g.fillRect(PLAYER_RADIUS - 2, 4, 10, 6);

    const body = this.add.container(player.x, player.y, [g]).setDepth(isMe ? 11 : 10);
    body.rotation = player.angle;

    const label = this.add
      .text(player.x, player.y, isMe ? `${player.name} (toi)` : player.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#" + player.color.toString(16).padStart(6, "0"),
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(200)
      .setAlpha(0.85);

    return {
      body,
      label,
      targetX: player.x,
      targetY: player.y,
      targetAngle: player.angle,
      flickerSeed: Math.random() * 1000,
    };
  }

  private drawFloor() {
    const g = this.add.graphics().setDepth(0);
    // Carrelage sale
    const tile = 64;
    for (let ty = 0; ty < ROOM_HEIGHT; ty += tile) {
      for (let tx = 0; tx < ROOM_WIDTH; tx += tile) {
        const even = (tx / tile + ty / tile) % 2 === 0;
        g.fillStyle(even ? 0x3b3a42 : 0x34333a, 1);
        g.fillRect(tx, ty, tile, tile);
      }
    }
    g.lineStyle(1, 0x26252b, 1);
    for (let tx = 0; tx <= ROOM_WIDTH; tx += tile) g.lineBetween(tx, 0, tx, ROOM_HEIGHT);
    for (let ty = 0; ty <= ROOM_HEIGHT; ty += tile) g.lineBetween(0, ty, ROOM_WIDTH, ty);

    // Taches (toujours au même endroit pour tout le monde grâce à une graine fixe)
    const random = seededRandom(1337);
    for (let i = 0; i < 26; i++) {
      const x = 60 + random() * (ROOM_WIDTH - 120);
      const y = 60 + random() * (ROOM_HEIGHT - 120);
      const r = 10 + random() * 40;
      const isBlood = random() < 0.3;
      g.fillStyle(isBlood ? 0x5a0d12 : 0x1e1d22, isBlood ? 0.75 : 0.6);
      g.fillEllipse(x, y, r * 2, r * (1 + random()));
    }

    // Porte d'entrée (en bas)
    g.fillStyle(0x6b4423, 1);
    g.fillRect(720, ROOM_HEIGHT - 32, 96, 32);
    g.fillStyle(0xd9b44a, 1);
    g.fillCircle(800, ROOM_HEIGHT - 16, 4);
  }

  private drawObstacles() {
    const g = this.add.graphics().setDepth(5);
    for (const r of OBSTACLES) drawObstacle(g, r);
  }

  private refreshPlayerList() {
    const list = document.getElementById("hud-players");
    if (!list) return;
    list.innerHTML = "";
    this.room.state.players.forEach((player, sessionId) => {
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = "#" + player.color.toString(16).padStart(6, "0");
      li.append(dot, sessionId === this.room.sessionId ? `${player.name} (toi)` : player.name);
      list.append(li);
    });
  }
}

function drawObstacle(g: Phaser.GameObjects.Graphics, r: Rect) {
  switch (r.kind) {
    case "wall":
      g.fillStyle(0x15141a, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(2, 0x2a2930, 1);
      g.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      break;
    case "crate":
      g.fillStyle(0x7a5230, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(3, 0x3d2614, 1);
      g.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      g.lineBetween(r.x + 4, r.y + 4, r.x + r.w - 4, r.y + r.h - 4);
      g.lineBetween(r.x + r.w - 4, r.y + 4, r.x + 4, r.y + r.h - 4);
      break;
    case "shelf":
      g.fillStyle(0x4c5560, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(2, 0x252a30, 1);
      g.strokeRect(r.x, r.y, r.w, r.h);
      // Quelques boîtes posées dessus
      for (let i = 0; i < 6; i++) {
        const horizontal = r.w > r.h;
        const bx = horizontal ? r.x + 8 + i * (r.w / 6) : r.x + 6;
        const by = horizontal ? r.y + 6 : r.y + 8 + i * (r.h / 6);
        g.fillStyle([0xa83232, 0xd9b44a, 0x3f7fbf][i % 3], 1);
        g.fillRect(bx, by, horizontal ? r.w / 9 : r.w - 12, horizontal ? r.h - 12 : r.h / 9);
      }
      break;
    case "counter":
      g.fillStyle(0x8c8c8c, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(3, 0x4a4a4a, 1);
      g.strokeRect(r.x, r.y, r.w, r.h);
      break;
    case "pillar":
      g.fillStyle(0x55545c, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(3, 0x2a2930, 1);
      g.strokeRect(r.x, r.y, r.w, r.h);
      break;
  }
}

/** Distance jusqu'au premier obstacle touché par un rayon (ou maxDist si rien). */
function castRay(ox: number, oy: number, dx: number, dy: number, maxDist: number): number {
  let best = maxDist;
  for (const r of OBSTACLES) {
    const d = rayRectDistance(ox, oy, dx, dy, r);
    if (d !== null && d < best) best = d;
  }
  return best;
}

/** Méthode des "tranches" : intersection d'un rayon avec un rectangle. */
function rayRectDistance(ox: number, oy: number, dx: number, dy: number, r: Rect): number | null {
  let tMin = 0;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [ox, dx, r.x, r.x + r.w],
    [oy, dy, r.y, r.y + r.h],
  ];
  for (const [o, d, min, max] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < min || o > max) return null;
    } else {
      let t1 = (min - o) / d;
      let t2 = (max - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin;
}

/** Générateur pseudo-aléatoire qui donne toujours la même suite pour une même graine. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

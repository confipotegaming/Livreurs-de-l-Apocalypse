import "./style.css";
import Phaser from "phaser";
import { Client, type Room } from "colyseus.js";
import { MAX_PLAYERS, ROOM_NAME, normalizeRoomCode } from "../shared/game";
import { RoomScene } from "./scenes/RoomScene";
import type { GameStateView } from "./types";

// Point d'entrée du jeu dans le navigateur :
// 1. on affiche l'écran d'accueil (pseudo + code de salon) ;
// 2. on se connecte au serveur Colyseus ;
// 3. on lance Phaser avec la scène de la salle.

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const lobby = $<HTMLElement>("lobby");
const form = $<HTMLFormElement>("lobby-form");
const nameInput = $<HTMLInputElement>("name");
const codeInput = $<HTMLInputElement>("code");
const createBtn = $<HTMLButtonElement>("create-btn");
const joinBtn = $<HTMLButtonElement>("join-btn");
const errorText = $<HTMLParagraphElement>("lobby-error");

/**
 * Adresse du serveur multijoueur.
 * - En développement (npm run dev), Vite tourne sur le port 5173 et le serveur sur 2567.
 * - En production (Render), le jeu et le serveur sont à la même adresse.
 */
function serverUrl(): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  if (import.meta.env.DEV) return `${protocol}://${location.hostname}:2567`;
  return `${protocol}://${location.host}`;
}

const client = new Client(serverUrl());

// Pseudo mémorisé dans le navigateur, et code de salon lu dans le lien (?salon=ABCD).
nameInput.value = safeStorageGet("pseudo") ?? "";
codeInput.value = normalizeRoomCode(new URLSearchParams(location.search).get("salon") ?? "");
if (!nameInput.value) nameInput.focus();
else if (codeInput.value) joinBtn.focus();
else createBtn.focus();

codeInput.addEventListener("input", () => {
  codeInput.value = normalizeRoomCode(codeInput.value);
});

createBtn.addEventListener("click", () => {
  connect(() => client.create<GameStateView>(ROOM_NAME, { name: playerName() }), true);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = normalizeRoomCode(codeInput.value);
  if (code.length !== 4) {
    showError("Le code du salon fait 4 lettres.");
    codeInput.focus();
    return;
  }
  connect(() => client.joinById<GameStateView>(code, { name: playerName() }));
});

function playerName(): string {
  return nameInput.value.trim();
}

async function connect(open: () => Promise<Room<GameStateView>>, isHost = false) {
  if (!playerName()) {
    showError("Choisis d'abord un pseudo.");
    nameInput.focus();
    return;
  }
  safeStorageSet("pseudo", playerName());
  setBusy(true);
  showError("");
  try {
    const room = await open();
    startGame(room, isHost);
  } catch (err) {
    showError(describeError(err));
    setBusy(false);
  }
}

function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/not found|invalid/i.test(message)) return "Salon introuvable. Vérifie le code.";
  if (/locked|full/i.test(message)) return `Salon complet (${MAX_PLAYERS} joueurs maximum).`;
  if (/fetch|network|ECONNREFUSED|offline/i.test(message)) return "Impossible de joindre le serveur.";
  return `Erreur : ${message}`;
}

function startGame(room: Room<GameStateView>, isHost: boolean) {
  lobby.classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("hud-code").textContent = room.roomId;

  // Le lien d'invitation est aussi mis dans la barre d'adresse.
  const inviteUrl = `${location.origin}/?salon=${room.roomId}`;
  history.replaceState(null, "", `/?salon=${room.roomId}`);
  setupCopyButton($<HTMLButtonElement>("copy-link"), inviteUrl);

  // Celui ou celle qui crée le salon voit d'abord une fenêtre qui explique comment inviter.
  if (isHost) {
    const panel = $("host-panel");
    $("host-code").textContent = room.roomId;
    setupCopyButton($<HTMLButtonElement>("host-copy"), inviteUrl);
    panel.classList.remove("hidden");
    const startBtn = $<HTMLButtonElement>("host-start");
    startBtn.addEventListener("click", () => panel.classList.add("hidden"));
    startBtn.focus();
  }

  room.onLeave((code) => {
    // 1000 = départ volontaire ; tout le reste = connexion perdue.
    if (code !== 1000) $("disconnected").classList.remove("hidden");
  });

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#000000",
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [new RoomScene(room)],
  });
}

/** Un bouton qui copie le lien d'invitation (et l'affiche si la copie est impossible). */
function setupCopyButton(button: HTMLButtonElement, inviteUrl: string) {
  const label = button.textContent;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      button.textContent = "Lien copié !";
    } catch {
      button.textContent = inviteUrl;
    }
    setTimeout(() => (button.textContent = label), 2000);
  });
}

function setBusy(busy: boolean) {
  createBtn.disabled = busy;
  joinBtn.disabled = busy;
}

function showError(message: string) {
  errorText.textContent = message;
}

// localStorage peut être bloqué (navigation privée) : on ne plante jamais pour ça.
function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* tant pis */
  }
}

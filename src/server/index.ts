import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ROOM_NAME } from "../shared/game.js";
import { GameRoom } from "./rooms/GameRoom.js";

// UN SEUL serveur Node fait deux choses :
//  1. il envoie au navigateur les fichiers du jeu (le build Vite, dans dist/client) ;
//  2. il fait tourner Colyseus, qui gère les salons multijoueurs.

// Render impose le port via la variable PORT. En local, on prend 2567.
const PORT = Number(process.env.PORT) || 2567;

const app = express();

// Petite page de santé : Render l'appelle pour vérifier que le serveur répond.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Les fichiers du jeu compilés par "npm run build".
const clientDir = path.join(process.cwd(), "dist", "client");
const indexHtml = path.join(clientDir, "index.html");
if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDir));
  // Toute autre adresse (ex. /?salon=ABCD) renvoie la page du jeu.
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(indexHtml);
  });
} else {
  console.warn(
    "⚠ dist/client introuvable : lancez \"npm run build\" (ou \"npm run dev\" pour développer avec Vite).",
  );
}

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
  greet: false,
});

gameServer.define(ROOM_NAME, GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`🍕 Livreurs de l'Apocalypse : serveur prêt sur le port ${PORT}`);
  // Lancé avec "npm run dev" (fichier .ts) : le jeu est servi par Vite, sur le port 5173.
  const isDev = import.meta.url.endsWith(".ts");
  if (!process.env.PORT) console.log(`   Ouvrez http://localhost:${isDev ? 5173 : PORT}`);
});

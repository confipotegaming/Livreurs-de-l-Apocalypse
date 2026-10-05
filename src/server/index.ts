import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import compression from "compression";
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
/** Lancé avec "npm run dev" (fichier .ts exécuté par tsx) : le jeu est alors servi par Vite. */
const isDev = import.meta.url.endsWith(".ts");
/** Version en ligne = commit Git déployé (Render fournit RENDER_GIT_COMMIT). */
const VERSION = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "locale";

const app = express();
// Compresse les fichiers envoyés (le jeu passe d'environ 5 Mo à moins de 2 Mo à télécharger).
app.use(compression());

// Petite page de santé : Render l'appelle pour vérifier que le serveur répond.
// On peut l'ouvrir dans le navigateur pour vérifier quelle version est en ligne.
app.get("/health", (_req, res) => {
  res.json({ ok: true, version: VERSION });
});

// Les fichiers du jeu compilés par "npm run build".
const clientDir = path.join(process.cwd(), "dist", "client");
const indexHtml = path.join(clientDir, "index.html");
if (isDev) {
  // En développement, un vieux dossier dist/ (ancien build) pourrait traîner : on ne le sert
  // surtout pas, sinon on joue à une ancienne version sans s'en rendre compte. On redirige vers Vite.
  app.get("/", (_req, res) => {
    res.redirect("http://localhost:5173/");
  });
} else if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDir));
  // Toute autre adresse (ex. /?salon=ABCD) renvoie la page du jeu.
  // Sauf un fichier introuvable (ex. /models/absent.glb) : vraie erreur 404, plus claire à diagnostiquer.
  app.use((req, res, next) => {
    if (req.method !== "GET" || path.extname(req.path)) return next();
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
  console.log(`🍕 Livreurs de l'Apocalypse : serveur prêt sur le port ${PORT} (version ${VERSION})`);
  if (!process.env.PORT) console.log(`   Ouvrez http://localhost:${isDev ? 5173 : PORT}`);
});

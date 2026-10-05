import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Vite compile le jeu (dossier src/client) en fichiers statiques dans dist/client.
// En production, c'est le serveur Node (src/server) qui sert ces fichiers.
export default defineConfig({
  root: "src/client",
  // Le dossier assets/ (modèles 3D + licences) est copié tel quel à la racine du site :
  // assets/models/... devient /models/... et assets/LICENCES/... devient /LICENCES/...
  publicDir: fileURLToPath(new URL("./assets", import.meta.url)),
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    // Three.js + Rapier (moteur physique, livré en un seul fichier) pèsent environ 5 Mo (moins de 2 Mo compressés) : on évite un avertissement inutile.
    chunkSizeWarningLimit: 6000,
  },
  server: {
    port: 5173,
  },
});

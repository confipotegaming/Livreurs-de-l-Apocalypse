import { defineConfig } from "vite";

// Vite compile le jeu (dossier src/client) en fichiers statiques dans dist/client.
// En production, c'est le serveur Node (src/server) qui sert ces fichiers.
export default defineConfig({
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    // Phaser pèse environ 1,5 Mo : on évite un avertissement inutile.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5173,
  },
});

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Version du jeu = identifiant court du commit Git. Sur Render, la variable RENDER_GIT_COMMIT
 * la donne directement. Elle est affichée dans le menu et dans le panneau F1 : ça permet de
 * vérifier en un coup d'œil que la version en ligne est bien la dernière.
 */
function version(): string {
  const render = process.env.RENDER_GIT_COMMIT;
  if (render) return render.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "inconnue";
  }
}

// Vite compile le jeu (dossier src/client) en fichiers statiques dans dist/client.
// En production, c'est le serveur Node (src/server) qui sert ces fichiers.
export default defineConfig({
  root: "src/client",
  // Le dossier assets/ (modèles 3D + licences) est copié tel quel à la racine du site :
  // assets/models/... devient /models/... et assets/LICENCES/... devient /LICENCES/...
  publicDir: fileURLToPath(new URL("./assets", import.meta.url)),
  define: {
    __VERSION__: JSON.stringify(version()),
    __DATE_BUILD__: JSON.stringify(
      new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }),
    ),
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    // Three.js + Rapier (moteur physique, livré en un seul fichier) pèsent environ 5 Mo (moins de 2 Mo compressés) : on évite un avertissement inutile.
    chunkSizeWarningLimit: 6000,
  },
  server: {
    port: 5173,
    // Le dossier /data est hors de src/client : on autorise Vite à le lire.
    fs: { allow: [fileURLToPath(new URL(".", import.meta.url))] },
  },
});

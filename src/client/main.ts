import "./style.css";
import { Game } from "./game/Game";

// Point d'entrée du jeu dans le navigateur :
// 1. on charge la rue (modèles 3D + moteur physique) en affichant la progression ;
// 2. au clic sur "Commencer", le jeu capture la souris (pointer lock) ;
// 3. Échap libère la souris et affiche la pause.

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const menu = $("menu");
const status = $("menu-status");
const progressFill = $("progress-fill");
const playBtn = $<HTMLButtonElement>("play-btn");
const errorText = $("menu-error");

async function boot() {
  let game: Game;
  try {
    game = await Game.create($("game"), (loaded, total) => {
      progressFill.style.width = `${Math.round((loaded / total) * 100)}%`;
      status.textContent = `Chargement de la rue… ${loaded}/${total}`;
    });
  } catch (err) {
    console.error(err);
    status.textContent = "Impossible de charger le jeu.";
    errorText.textContent = err instanceof Error ? err.message : String(err);
    return;
  }

  // Outil de test : ajouter ?debug à l'adresse pour accéder au jeu depuis la console (window.livreurs).
  if (new URLSearchParams(location.search).has("debug")) {
    (window as unknown as { livreurs: Game }).livreurs = game;
  }

  game.start();
  status.textContent = "La rue est prête. Ta pizza t'attend.";
  playBtn.disabled = false;
  playBtn.focus();

  const canvas = game.renderer.domElement;
  const lockPointer = async () => {
    errorText.textContent = "";
    try {
      await canvas.requestPointerLock();
    } catch {
      // Le navigateur refuse si on recapture trop vite après Échap : il suffit de recliquer.
      errorText.textContent = "Clique encore une fois pour reprendre.";
    }
  };
  playBtn.addEventListener("click", lockPointer);
  menu.addEventListener("click", (e) => {
    if (!playBtn.disabled && e.target === menu) lockPointer();
  });

  document.addEventListener("pointerlockchange", () => {
    const playing = document.pointerLockElement === canvas;
    menu.classList.toggle("hidden", playing);
    game.hud.show(playing);
    if (!playing) {
      status.textContent = "Pause";
      playBtn.textContent = "Reprendre la tournée";
    }
  });
}

boot();

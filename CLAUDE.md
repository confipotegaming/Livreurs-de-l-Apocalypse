# CLAUDE.md — Livreurs de l'Apocalypse

## Le projet

Jeu coop d'horreur-comique dans le navigateur (1 à 8 amis) : des livreurs de nuit livrent des
commandes à Saint-Néon, une ville envahie de créatures.

**À relire au début de chaque session :**
- `docs/BIBLE.md` : **la référence du jeu** (univers, boucle, quartiers, créatures, progression).
  Elle prime sur `DESIGN.md` (cahier des charges d'origine, gardé pour les 4 piliers et le détail).
- `docs/ROADMAP.md` : les jalons J0 à J7 et où on en est.
- `docs/ARCHITECTURE.md` : organisation du code (machine à états, /data, debug, sauvegarde).

Toute nouvelle idée doit servir au moins un des 4 piliers (`DESIGN.md`).

La porteuse du projet débute en code : **expliquer simplement** ce qui est fait, en français,
sans jargon inutile.

## Direction artistique (depuis le 5 oct. 2026)

**3D low-poly à la première personne, façon The Headliners.** La 2D vue du dessus (Phaser) est
abandonnée. Nuit, brouillard, lampe torche, lampadaires qui grésillent, néons colorés,
post-traitement (bloom, grain, vignettage, légère aberration chromatique).

## Où on en est

Voir `docs/ROADMAP.md`. **J0 terminé** (réparation, machine à états, /data, debug F1, options).
Prochain : **J1** (une tournée complète en solo dans Les Lilas).

## Stack

- **Three.js** (0.186) pour la 3D, **Rapier** (`@dimforge/rapier3d-compat`, 0.21) pour la physique,
  **postprocessing** (6.x) pour les effets, **Vite** + **TypeScript**.
- **Colyseus 0.16** côté serveur (`src/server`). La salle `GameRoom` (codes à 4 lettres) est gardée
  prête mais **le jeu 3D ne s'y connecte pas encore** (pas de `colyseus.js` côté client pour l'instant).
- **Express** sert le build Vite (avec compression gzip). **Un seul serveur Node** = un seul Web Service Render.

## Organisation du code

Vue d'ensemble dans `docs/ARCHITECTURE.md`. En bref :

| Où | Rôle |
| --- | --- |
| `data/*.json` | **Tous les chiffres de gameplay** (quartiers, créatures, colis, objets, XP, prix…) |
| `src/shared/donnees.ts` | Forme des fichiers /data + `verifierDonnees` |
| `src/shared/regles.ts` | Règles pures (pourboires, XP, niveaux, difficulté), testées dans `tests/` |
| `src/client/main.ts` | Point d'entrée : machine à états ↔ écrans HTML ↔ jeu 3D |
| `src/client/core/` | `machine.ts`, `ecrans.ts` (passages permis), `options.ts`, `sauvegarde.ts`, `diagnostic.ts` |
| `src/client/debug.ts` | Panneau de debug F1 (ou ²) |
| `src/client/game/Game.ts` | Rendu, boucle de jeu, pas de physique, résolution auto, outils de debug |
| `src/client/game/config.ts` | Réglages **techniques** (lampe, brouillard, qualité) ; le gameplay vient de /data |
| `src/client/game/tournee.ts` | Tournée en cours : quartier, difficulté, compte à rebours du couvre-feu |
| `src/client/game/mannequins.ts` | Créatures et colis provisoires (menu debug) |
| `input.ts`, `assets.ts`, `physics.ts`, `street.ts`, `player.ts`, `pizza.ts`, `postfx.ts`, `hud.ts` | Clavier/souris, modèles, Rapier, la rue, le joueur FPS, la pizza, effets, interface |

Ajouter `?debug` à l'adresse expose le jeu dans la console : `window.livreurs`
(ex. `livreurs.teleport(0, 10)`).

## Ressources 3D

- Dans `assets/models/<auteur>-<pack>/`, licences dans `assets/LICENCES/` (+ tableau dans `README.md` de ce dossier).
- **Uniquement des modèles CC0** (Kenney, Quaternius). Copier seulement les fichiers utilisés, avec le
  dossier `Textures/` du kit (chaque kit Kenney a son propre `colormap.png`).
- Vite sert `assets/` à la racine du site (`publicDir`) : `assets/models/x.glb` → `/models/x.glb`.
- Échelles : kits ville Kenney ×8 (1 case de route = 8 m), voitures Kenney ×1,6, Quaternius ×4,5 à ×5,5.
  Les dalles de route Kenney sont orientées selon X (tournées d'un quart de tour).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Vite (http://localhost:5173) + serveur Colyseus (port 2567), rechargement auto |
| `npm run build` | `vite build` → `dist/client`, puis `tsc` → `dist/server` et `dist/shared` |
| `npm start` | `node dist/server/index.js` : sert le jeu + Colyseus sur `process.env.PORT` (2567 par défaut) |
| `npm run typecheck` | Vérification TypeScript du jeu, du serveur et des tests |
| `npm test` | Tests automatiques de la logique (Vitest, dossier `tests/`) |

Render : Build `npm install --include=dev && npm run build`, Start `npm start`, branche `main`.

## Performance (objectif : 60 images/s sur un PC portable moyen)

- Seule la **lampe torche** projette des ombres. Lampadaires = SpotLight sans ombre ; néons = PointLight.
  Limiter le nombre de lumières (≈ 9 actuellement) : chacune coûte sur tous les pixels.
- Objets immobiles : `matrixAutoUpdate = false` (fonction `freeze` dans `street.ts`).
- Effets regroupés en 2 passes `EffectPass` ; l'aberration chromatique (effet de "convolution")
  doit être dans une passe sans autre convolution.
- `Game.adaptQuality` baisse la résolution si < 55 i/s, la remonte prudemment au-dessus de 58,5.
- Le navigateur de test sans GPU tourne à ~3 i/s : les mesures de fluidité se font sur un vrai PC.

## Pièges connus

- Physique : pas de temps limité à 1/30 s, découpé en sous-pas si l'image est lente (`MAX_STEPS`) ;
  les actions (E, clic droit, F, souris) ne sont lues qu'au **premier** sous-pas.
- La caméra est placée **après** `world.step()` (`player.afterPhysics`), sinon elle a une image de retard.
- Pizza tenue en main = corps cinématique + capteur (`setSensor(true)`), sinon elle pousse le joueur ;
  le contrôleur ignore les capteurs (`EXCLUDE_SENSORS`).
- Le modèle Kenney `pizza-box` a le couvercle ouvert : `closeLid()` le referme.
- Matériaux OBJ multi-matériaux : garder un tableau seulement si l'original en est un.
- Le serveur utilise les décorateurs `@type` de Colyseus : `tsconfig.server.json` doit garder
  `experimentalDecorators: true` et `useDefineForClassFields: false`, et `tsx` doit recevoir
  `--tsconfig tsconfig.server.json`.
- Côté serveur (ESM Node), les imports relatifs finissent par `.js` (ex. `../shared/game.js`).
- Écrans : ne jamais afficher/cacher un écran à la main, passer par `machine.aller(...)` ;
  un nouveau passage entre écrans s'ajoute dans `core/ecrans.ts` (et son test).
- La boucle 3D tourne seulement dans l'état `tournee` ; en pause (souris libérée), la physique est figée.
- Le code 3D est chargé à la demande (`import("./game/Game")`) : ne pas l'importer directement
  depuis `main.ts` (sinon le menu attend 5 Mo).
- `localStorage` peut être interdit (navigation privée) : toujours passer par `core/sauvegarde.ts`.
- Serveur : la page du jeu n'est renvoyée que pour les adresses sans extension ; un fichier absent = 404.
- Pour arrêter un serveur de test, ne pas utiliser `pkill -f` avec un motif contenu dans sa propre commande.
- Rester sur **Three 0.186.x** tant que `postprocessing` n'accepte pas plus récent (peer `< 0.187`),
  et sur **Colyseus 0.16**.

## Règles de travail

1. **Un jalon à la fois**, découpé en petites tâches. **Le jeu doit toujours rester lançable.**
2. **Après chaque tâche** : `npm run typecheck`, `npm test`, `npm run build`, test dans le
   navigateur, puis **commit Git avec un message clair**.
3. **Tests automatiques** pour toute logique (pourboires, XP, difficulté…) dans `tests/`.
4. **À la fin de chaque jalon** : mettre à jour `docs/ROADMAP.md`, puis donner à la porteuse
   la **liste exacte de ce qu'elle doit tester en jouant**, et le **ZIP** du projet.
5. **Expliquer simplement**, en français, ce qui est fait (la porteuse débute en code).
6. **Relire régulièrement** le projet pour repérer ce qui est fragile ou mal organisé.
7. Si ça casse : décrire précisément ce qu'on voit et le message d'erreur (F1 les liste).

Conventions : code et commentaires en français pour ce qui est propre au jeu ; chiffres de gameplay
dans `/data`, réglages techniques dans `src/client/game/config.ts` ; ne jamais committer
`node_modules`, `dist` ni `.env`.

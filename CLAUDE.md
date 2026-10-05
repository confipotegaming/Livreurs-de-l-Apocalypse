# CLAUDE.md — Livreurs de l'Apocalypse

## Le projet

Jeu coop d'horreur-comique dans le navigateur (5 à 8 amis) : des livreurs de nuit livrent des
commandes dans une ville envahie de créatures. Le cahier des charges complet est dans
`DESIGN.md` : **le lire avant toute nouvelle fonctionnalité**, et vérifier que l'idée sert au
moins un des 4 piliers.

La porteuse du projet débute en code : **expliquer simplement** ce qui est fait, en français,
sans jargon inutile.

## Direction artistique (depuis le 5 oct. 2026)

**3D low-poly à la première personne, façon The Headliners.** La 2D vue du dessus (Phaser) est
abandonnée. Nuit, brouillard, lampe torche, lampadaires qui grésillent, néons colorés,
post-traitement (bloom, grain, vignettage, légère aberration chromatique).

## Où on en est

- [x] Prototype 2D (Phaser) + multijoueur à deux onglets — **abandonné** (dans l'historique Git).
- [x] Tranche visuelle 3D **solo** : une rue de nuit (immeubles, voitures abandonnées, 6 lampadaires
      dont 1 qui grésille et 2 en panne, 4 néons), vue FPS, ZQSD + souris (pointer lock), Maj pour
      sprinter (endurance), F pour la lampe, une boîte de pizza à ramasser (E) et lancer (clic droit),
      cônes de chantier qu'on peut renverser.
- [ ] Multijoueur 3D (rebrancher Colyseus : positions, regard, lampe, pizza).
- [ ] Étape « cœur du jeu » et suivantes : voir `DESIGN.md`.

Pas encore fait : sons, créatures, règle « porter un colis = pas de lampe » (DESIGN.md), reconnexion.

## Stack

- **Three.js** (0.186) pour la 3D, **Rapier** (`@dimforge/rapier3d-compat`, 0.21) pour la physique,
  **postprocessing** (6.x) pour les effets, **Vite** + **TypeScript**.
- **Colyseus 0.16** côté serveur (`src/server`). La salle `GameRoom` (codes à 4 lettres) est gardée
  prête mais **le jeu 3D ne s'y connecte pas encore** (pas de `colyseus.js` côté client pour l'instant).
- **Express** sert le build Vite (avec compression gzip). **Un seul serveur Node** = un seul Web Service Render.

## Organisation du code (`src/client/game/`)

| Fichier | Rôle |
| --- | --- |
| `Game.ts` | Rendu, boucle de jeu, pas de physique, résolution automatique |
| `config.ts` | **Tous les réglages** (vitesses, lampe, brouillard, qualité) |
| `input.ts` | Clavier (par `event.code`, donc AZERTY et QWERTY) et souris |
| `assets.ts` | Liste et chargement des modèles (GLB Kenney, OBJ+MTL Quaternius) |
| `physics.ts` | Monde Rapier, boîtes de collision à partir des modèles |
| `street.ts` | La rue : placement des modèles, lampadaires, néons, cônes |
| `player.ts` | Joueur FPS (contrôleur de personnage Rapier), sprint, balancement, lampe torche |
| `pizza.ts` | Boîte de pizza : ramasser / poser / lancer |
| `postfx.ts` | Post-traitement |
| `hud.ts` | Viseur, aides, endurance, images/s |

Ajouter `?debug` à l'adresse expose le jeu dans la console : `window.livreurs`
(ex. `livreurs.player.teleport(0, 0, 10)`).

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
| `npm run typecheck` | Vérification TypeScript du jeu et du serveur |

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
- Rester sur **Three 0.186.x** tant que `postprocessing` n'accepte pas plus récent (peer `< 0.187`),
  et sur **Colyseus 0.16**.

## Règles de travail (DESIGN.md)

1. **Une petite étape à la fois.** Ne pas faire plusieurs fonctionnalités d'un coup.
2. **Tester après chaque demande** : `npm run typecheck`, `npm run build`, puis jouer.
   Si ça casse, décrire précisément ce qu'on voit et le message d'erreur.
3. **Sauvegarder avec Git à chaque étape qui marche**, avec un message de commit clair.
4. **Expliquer** les fichiers et choix quand on le demande (ou quand c'est nouveau).
5. **Relire régulièrement** le projet pour repérer ce qui est fragile ou mal organisé.

Conventions : code et commentaires en français pour ce qui est propre au jeu ; réglages dans
`src/client/game/config.ts` ; ne jamais committer `node_modules`, `dist` ni `.env`.

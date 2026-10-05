# CLAUDE.md — Livreurs de l'Apocalypse

## Le projet

Jeu coop d'horreur-comique dans le navigateur (1 à 5 amis) : des livreurs de nuit livrent des
commandes dans une ville envahie de créatures. Le cahier des charges complet est dans
`DESIGN.md` : **le lire avant toute nouvelle fonctionnalité**, et vérifier que l'idée sert au
moins un des 4 piliers.

La porteuse du projet débute en code : **expliquer simplement** ce qui est fait, en français,
sans jargon inutile.

## Où on en est

- [x] Étape 1 — Prototype solo : salle sombre vue du dessus, déplacement ZQSD, lampe à la souris
      (cône avec ombres portées par les meubles).
- [x] Étape 2 — Multijoueur : écran d'accueil (pseudo, créer / rejoindre un salon avec un code de
      4 lettres ou un lien `?salon=ABCD`), jusqu'à 5 joueurs qui se voient bouger.
      L'hôte voit d'abord une fenêtre qui explique comment inviter ; le bandeau affiche « Livreurs 2/5 ».
- [ ] Étape 3 — Le cœur du jeu : commandes, porter et lancer des colis, pourboires, une créature, mort.
- [ ] Étapes 4 à 7 : voir `DESIGN.md`.

Pas encore fait : reconnexion après coupure (prévue : 2 minutes), chat, sauvegarde.

## Stack

- **Phaser 3** + **TypeScript** + **Vite** pour le jeu (`src/client`).
- **Colyseus 0.16** pour le multijoueur (`src/server`), client `colyseus.js` 0.16.
- **Express** sert le build Vite. **Un seul serveur Node** fait tout tourner (un seul Web Service Render).
- Code commun aux deux côtés dans `src/shared` (règles, collisions).
- Graphismes : uniquement des formes dessinées (Graphics Phaser). Pas de ressources externes pour l'instant.

## Architecture réseau

- Le **serveur a le dernier mot** (DESIGN.md) : il calcule le jeu 20 fois par seconde
  (`SERVER_TICK_MS`).
- Le navigateur envoie des **entrées** (`"input"` : `seq`, `dx`, `dy`, `angle`) par pas fixes de 1/60 s.
  Il applique le même pas tout de suite (**prédiction**), puis, à chaque mise à jour du serveur,
  repart de la position officielle et rejoue les entrées non confirmées (`lastSeq`).
- Les autres joueurs sont **lissés** vers la position reçue.
- `movePlayer()` et `collides()` dans `src/shared/game.ts` doivent rester **identiques** des deux côtés :
  ne jamais dupliquer cette logique.
- Le code du salon **est** l'identifiant de la salle Colyseus (`roomId`) ; il est libéré à la fermeture.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Vite (http://localhost:5173) + serveur Colyseus (port 2567), rechargement auto |
| `npm run build` | `vite build` → `dist/client`, puis `tsc` → `dist/server` et `dist/shared` |
| `npm start` | `node dist/server/index.js` : sert le jeu + Colyseus sur `process.env.PORT` (2567 par défaut) |
| `npm run typecheck` | Vérification TypeScript du jeu et du serveur |

Render : Build `npm install --include=dev && npm run build`, Start `npm start`.

## Pièges connus

- Le serveur utilise les décorateurs `@type` de Colyseus : `tsconfig.server.json` doit garder
  `experimentalDecorators: true` et `useDefineForClassFields: false`, et `tsx` doit recevoir
  `--tsconfig tsconfig.server.json` (sinon plantage au démarrage en dev).
- Côté serveur (ESM Node), les imports relatifs finissent par `.js` (ex. `../shared/game.js`).
- Le déplacement local utilise `this.game.loop.rawDelta` (temps réel) : le `delta` de Phaser est
  ralenti quand les images sont lentes.
- Rester sur **Phaser 3** (pas Phaser 4) et sur **Colyseus 0.16** tant qu'on n'a pas décidé de migrer.

## Règles de travail (DESIGN.md)

1. **Une petite étape à la fois.** Ne pas faire plusieurs fonctionnalités d'un coup.
2. **Tester après chaque demande** : `npm run typecheck`, `npm run build`, puis jouer à deux onglets.
   Si ça casse, décrire précisément ce qu'on voit et le message d'erreur.
3. **Sauvegarder avec Git à chaque étape qui marche**, avec un message de commit clair.
4. **Expliquer** les fichiers et choix quand on le demande (ou quand c'est nouveau).
5. **Relire régulièrement** le projet pour repérer ce qui est fragile ou mal organisé.

Conventions : code et commentaires en français pour ce qui est propre au jeu ; constantes de
gameplay dans `src/shared/game.ts` ; ne jamais committer `node_modules`, `dist` ni `.env`.

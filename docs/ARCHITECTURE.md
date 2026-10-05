# ARCHITECTURE — Livreurs de l'Apocalypse

Comment le code est organisé, et pourquoi. À relire avant d'ajouter un gros morceau.

## Vue d'ensemble

```
data/              Tous les CHIFFRES du jeu (JSON) : on rééquilibre ici, sans toucher au code
docs/              BIBLE (référence du jeu), ROADMAP (jalons), ARCHITECTURE (ce fichier)
tests/             Tests automatiques de la logique (npm test)
src/shared/        Code commun au jeu et au serveur, sans 3D :
  donnees.ts         forme des fichiers /data + vérification de cohérence
  regles.ts          règles du jeu (pourboires, XP, niveaux, difficulté…), testées
  game.ts            constantes multijoueur (8 joueurs max, codes de salon)
src/client/        Le jeu dans le navigateur
  main.ts            point d'entrée : relie la machine à états, les écrans et le jeu 3D
  core/              briques générales : machine à états, écrans, options, sauvegarde, diagnostic
  data/              chargement des fichiers /data
  debug.ts           panneau de debug (F1)
  textes.ts          répliques de Gérard, avis clients
  game/              la partie 3D (Three.js + Rapier) : voir CLAUDE.md
src/server/        Serveur Node : sert le jeu + Colyseus (multijoueur, à partir de J2)
```

## 1. Machine à états des écrans

Le jeu est toujours dans **un seul écran** à la fois (`src/client/core/ecrans.ts`) :

```
            ┌──────── options ◄───────┐ (retour à l'écran d'origine)
            ▼            ▲            │
menu ──► qg ──► chargement ──► tournee ──► recap ──► qg …
 ▲        │                     │  (pause = Échap, à l'intérieur de la tournée)
 └────────┘                     └──► menu
```

- Les passages permis sont listés dans `PASSAGES`. Un passage interdit lance une erreur claire
  (et apparaît dans F1) au lieu de laisser un écran à moitié affiché.
- Chaque écran a `entrer()` / `sortir()` dans `main.ts` : afficher le bon HTML, démarrer ou
  arrêter la boucle 3D, libérer la souris…
- La boucle 3D ne tourne **que** pendant la tournée : dans les menus, la carte graphique se repose.
- Le code 3D (≈ 5 Mo) n'est téléchargé qu'au premier chargement d'une tournée : le menu s'affiche
  tout de suite.

## 2. Données dans `/data`

| Fichier | Contenu |
| --- | --- |
| `quartiers.json` | 5 quartiers : réputation requise, créatures, durée, commandes et créatures par joueur |
| `difficultes.json` | Tranquille / Agitée / Cauchemar : multiplicateurs créatures, vitesse, couvre-feu, pourboires |
| `modificateurs.json` | Modificateurs de nuit et leur probabilité |
| `creatures.json` | Vitesses, vision, ouïe, attirances |
| `colis.json` | Pourboire de base, porteurs, refroidissement, bruit… |
| `objets.json` | Équipement : prix, niveau requis, caractéristiques |
| `pourboires.json` | Paliers de rapidité, séries (×2, ×3, ×5), notes S à D |
| `progression.json` | XP, niveaux, étoiles par note, paliers du QG, talents |
| `joueur.json` | Vitesses, endurance, gravité, réanimation, lancer |
| `tension.json` | Directeur de tension |

- Chaque fichier commence par une clé `_aide` qui explique les unités.
- `verifierDonnees` (dans `src/shared/donnees.ts`) repère les erreurs (créature inconnue,
  identifiant en double, paliers dans le désordre…). Elles s'affichent dans F1 et font échouer `npm test`.
- Les **réglages techniques** (lumières, brouillard, qualité) restent dans `src/client/game/config.ts`.

## 3. Règles et tests

- `src/shared/regles.ts` ne contient que des calculs : pas d'affichage ni de 3D. Les chiffres
  sont passés en paramètre depuis `/data`.
- `tests/regles.test.ts` vérifie les règles **avec les vrais fichiers /data** : si un rééquilibrage
  casse une règle de la bible (ex. le Cauchemar paie moins que le Tranquille), un test échoue.
- `tests/machine.test.ts` vérifie la machine à états.
- Règle : toute nouvelle logique de jeu (calcul, règle) a son test.

## 4. Debug (F1 ou ²)

- Infos en direct (en haut à gauche) : version, écran, images/s, position, objets 3D, modèles
  chargés, physique, mannequins, tournée, erreurs.
- Actions (à droite, pendant une tournée) : téléporter, faire apparaître une créature ou un colis
  (mannequins sans comportement pour l'instant), mode invincible, passer au couvre-feu, finir la tournée.
- Le carnet d'erreurs (`core/diagnostic.ts`) reçoit les modèles manquants, les erreurs JavaScript
  et les problèmes de `/data`.
- `?debug` dans l'adresse expose le jeu dans la console : `window.livreurs`.

## 5. Options

`core/options.ts` : sensibilité souris, champ de vision, volume, qualité graphique (basse / moyenne
/ haute : résolution maximale et netteté des ombres). Appliquées tout de suite, sauvegardées dans
le navigateur.

## 6. Sauvegarde (prévue au jalon J3)

- **En ligne** : progression (XP, pourboires, réputation, équipement, cosmétiques) dans la base
  **PostgreSQL de Render**, via le serveur Node (`/api/sauvegarde`). Sans compte : chaque joueur
  reçoit un identifiant secret gardé dans son navigateur.
- **En développement** (pas de variable `DATABASE_URL`) : le serveur écrit un fichier JSON local
  (`.sauvegardes/`, ignoré par Git).
- **Secours** : une copie dans le navigateur (`core/sauvegarde.ts`, déjà utilisé pour les options)
  si le serveur ne répond pas.

## 7. Version en ligne

La version (commit Git) apparaît en bas du menu, dans F1, et sur `https://<site>/health`.
Si elle ne correspond pas au dernier commit de `main`, c'est que Render n'a pas (encore) redéployé.

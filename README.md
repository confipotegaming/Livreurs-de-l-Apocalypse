# Livreurs de l'Apocalypse

Jeu coopératif d'horreur-comique, jouable dans le navigateur, pour 1 à 5 amis.
Le cahier des charges complet est dans [`DESIGN.md`](DESIGN.md).

**Version actuelle : tranche visuelle 3D, en solo** (direction artistique façon *The Headliners*)

- une rue de nuit en 3D low-poly : immeubles, voitures abandonnées, lampadaires (dont un qui grésille
  et deux en panne), néons colorés, brouillard ;
- vue à la première personne : **ZQSD** (ou WASD) pour marcher, **souris** pour regarder,
  **Maj** pour sprinter (jauge d'endurance) ;
- une **lampe torche** qui projette des ombres (**F** pour l'allumer / l'éteindre) ;
- une **boîte de pizza** : **E** pour la ramasser ou la poser, **clic droit** pour la lancer ;
- des cônes de chantier qu'on peut renverser ;
- post-traitement : bloom, grain, vignettage, légère aberration chromatique.

Le multijoueur (salons à code de 4 lettres) reviendra à l'étape suivante : le serveur Colyseus est
déjà prêt.

---

## Lancer le jeu sur son ordinateur

### 1. Une seule fois : installer les outils

- [Node.js](https://nodejs.org/) version 20 ou plus récente (prendre la version « LTS ») ;
- puis, dans un terminal ouvert dans le dossier du projet :

```bash
npm install
```

### 2. Pour développer (rechargement automatique)

```bash
npm run dev
```

Puis ouvrez **http://localhost:5173**. Pour arrêter : `Ctrl + C` dans le terminal.

### 3. Pour tester comme en ligne (comme sur Render)

```bash
npm run build
npm start
```

Puis ouvrez **http://localhost:2567**.

### Comment tester la tranche visuelle

1. Attendez la fin du chargement de la rue, puis cliquez sur **Commencer la tournée** :
   la souris est « capturée » par le jeu.
2. Regardez autour de vous avec la souris, marchez avec ZQSD, sprintez avec Maj.
3. La pizza est posée sur la chaussée, à quelques pas devant vous, un peu à droite. Regardez-la de près :
   le viseur devient orange et « E Ramasser la pizza » s'affiche. Appuyez sur **E**.
4. **Clic droit** pour la lancer (elle part en tournant), ou **E** pour la reposer.
   Essayez de la lancer sur les cônes de chantier, plus loin près de la camionnette en travers.
5. **F** éteint la lampe : on ne voit plus que les lampadaires et les néons.
6. **Échap** met en pause et libère la souris.

En haut à droite, le compteur indique les **images par seconde** (objectif : 60). Si le PC n'arrive
pas à suivre, le jeu baisse un peu la résolution tout seul.

> Conseil : utilisez Chrome, Edge ou Firefox à jour. Sur un PC portable, branchez le chargeur :
> sur batterie, la carte graphique est souvent bridée.

---

## Mettre en ligne sur Render

Le dépôt GitHub est relié à un **Web Service** Render (langage Node), qui suit la branche **`main`**.
À chaque envoi sur `main`, Render reconstruit et redémarre le jeu.

Dans Render, onglet **Settings** du service, vérifiez :

| Réglage | Valeur |
| --- | --- |
| Language / Runtime | `Node` |
| Branch | `main` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path (facultatif) | `/health` |
| Variable d'environnement (facultatif) | `NODE_VERSION` = `22` |

À ne **pas** faire : définir vous-même la variable `PORT`. Render la fournit automatiquement.

> Sur l'offre gratuite de Render, le serveur s'endort après 15 minutes sans visite :
> le premier chargement peut alors prendre une minute. C'est normal.

---

## Organisation des fichiers

```
DESIGN.md              Cahier des charges du jeu
CLAUDE.md              Résumé du projet et règles de travail pour l'IA
render.yaml            Réglages Render
package.json           Liste des bibliothèques et des commandes (dev, build, start)
vite.config.ts         Réglages de Vite (outil qui compile le jeu)
assets/
  models/              Modèles 3D gratuits (Kenney, Quaternius)
  LICENCES/            Licences des modèles (toutes CC0, domaine public)
src/
  client/              Le jeu, qui tourne dans le navigateur
    index.html         La page : écran titre + interface en jeu
    style.css          L'apparence des menus
    main.ts            Chargement, bouton « Commencer », pause
    game/
      Game.ts          Le chef d'orchestre : rendu, boucle de jeu
      config.ts        Tous les réglages (vitesses, lampe, brouillard…)
      street.ts        La rue : immeubles, voitures, lampadaires, néons
      player.ts        Le livreur : déplacement, sprint, lampe torche
      pizza.ts         La boîte de pizza : ramasser, poser, lancer
      postfx.ts        Effets : bloom, grain, vignettage, aberration chromatique
      physics.ts       Collisions (Rapier)
      assets.ts        Chargement des modèles 3D
      input.ts         Clavier et souris
      hud.ts           Viseur, aides, endurance, images/s
  server/              Le serveur Node (sert le jeu + Colyseus pour le multijoueur)
  shared/              Règles communes au jeu et au serveur
```

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm install` | Installe les bibliothèques |
| `npm run dev` | Lance le jeu en mode développement (http://localhost:5173) |
| `npm run build` | Compile le jeu et le serveur dans `dist/` |
| `npm start` | Lance le serveur compilé (http://localhost:2567) |
| `npm run typecheck` | Vérifie le code TypeScript sans rien lancer |

## Crédits

Modèles 3D : [Kenney](https://kenney.nl) (City Kit Commercial, City Kit Roads, Car Kit, Food Kit) et
[Quaternius](https://quaternius.com) (Modular Streets), sous licence CC0. Détails dans
[`assets/LICENCES`](assets/LICENCES/README.md).

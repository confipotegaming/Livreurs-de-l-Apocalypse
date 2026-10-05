# Livreurs de l'Apocalypse

Jeu coopératif d'horreur-comique, jouable dans le navigateur, pour 1 à 8 amis.
La référence du jeu est la [**bible**](docs/BIBLE.md) ; les étapes sont dans la [**roadmap**](docs/ROADMAP.md).

**Version actuelle : jalon J0 terminé (fondations), en solo** — direction artistique façon *The Headliners*

- menu → **QG** (choix du quartier et de la difficulté) → **tournée** → **récap** → QG ;
- une rue de nuit en 3D low-poly (Les Lilas, provisoire) : immeubles, voitures abandonnées,
  lampadaires, néons, brouillard ; **compte à rebours du couvre-feu** ;
- vue à la première personne : **ZQSD** (ou WASD), **souris**, **Maj** pour sprinter ;
- **lampe torche** (**F**), **boîte de pizza** (**E** pour ramasser/poser, **clic droit** pour lancer) ;
- **options** : sensibilité de la souris, champ de vision, volume, qualité graphique ;
- **outils de debug** avec **F1** (ou **²**) ;
- tous les chiffres du jeu dans le dossier [`data/`](data) (fichiers JSON modifiables).

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

### Comment tester

1. Menu → **Jouer** → au QG, choisissez **Les Lilas** et une difficulté → **Partir en tournée**.
2. À la fin du chargement, cliquez **C'est parti !** : la souris est « capturée » par le jeu.
3. Marchez (ZQSD), sprintez (Maj), ramassez la pizza (E), lancez-la (clic droit), lampe (F).
4. **Échap** : pause (Reprendre, Options, Abandonner la tournée → récap).
5. **F1** (ou **²**) : panneau de debug (images/s, position, erreurs, téléportation, créatures…).

**Quelle version est en ligne ?** Elle est écrite en bas du menu (`version 1a2b3c4 · date`), dans F1,
et sur l'adresse `/health` du site. Si ce n'est pas le dernier commit de `main`, Render n'a pas
encore redéployé (onglet *Events* du service sur Render).

### Rééquilibrer le jeu

Modifiez un fichier de `data/` (ex. `data/difficultes.json`), enregistrez : avec `npm run dev`, le jeu
se recharge tout seul. Lancez ensuite `npm test` : les tests vérifient que les règles tiennent toujours.
Une erreur dans un fichier (créature inconnue, identifiant en double…) s'affiche aussi dans F1.

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
docs/BIBLE.md          LA référence du jeu (univers, boucle, quartiers, créatures, progression)
docs/ROADMAP.md        Les jalons J0 à J7, ce qui est fait et ce qui reste
docs/ARCHITECTURE.md   Comment le code est organisé
DESIGN.md              Cahier des charges d'origine (les 4 piliers)
CLAUDE.md              Résumé du projet et règles de travail pour l'IA
data/                  Tous les chiffres du jeu (JSON) : quartiers, créatures, colis, objets, XP…
tests/                 Tests automatiques de la logique (npm test)
assets/                Modèles 3D gratuits (Kenney, Quaternius) et leurs licences (CC0)
src/
  client/              Le jeu, dans le navigateur
    index.html         Les écrans (menu, QG, chargement, pause, récap, options) + debug
    main.ts            Point d'entrée : passe d'un écran à l'autre
    core/              Machine à états, options, sauvegarde locale, carnet d'erreurs
    debug.ts           Panneau de debug (F1)
    game/              La partie 3D : rue, joueur, pizza, lumière, physique, effets
  server/              Le serveur Node (sert le jeu + Colyseus pour le multijoueur)
  shared/              Règles du jeu (pourboires, XP…) communes au jeu et au serveur
```

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm install` | Installe les bibliothèques |
| `npm run dev` | Lance le jeu en mode développement (http://localhost:5173) |
| `npm run build` | Compile le jeu et le serveur dans `dist/` |
| `npm start` | Lance le serveur compilé (http://localhost:2567) |
| `npm run typecheck` | Vérifie le code TypeScript sans rien lancer |
| `npm test` | Lance les tests automatiques des règles du jeu |

## Crédits

Modèles 3D : [Kenney](https://kenney.nl) (City Kit Commercial, City Kit Roads, Car Kit, Food Kit) et
[Quaternius](https://quaternius.com) (Modular Streets), sous licence CC0. Détails dans
[`assets/LICENCES`](assets/LICENCES/README.md).

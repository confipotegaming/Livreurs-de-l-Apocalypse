# Livreurs de l'Apocalypse

Jeu coopératif d'horreur-comique, jouable dans le navigateur, pour 1 à 8 amis.
Le cahier des charges complet est dans [`DESIGN.md`](DESIGN.md).

**Version actuelle : étapes 1 et 2 de la feuille de route**

- une salle sombre vue du dessus ;
- un livreur qui se déplace en **ZQSD** (ou WASD, ou les flèches) ;
- une lampe qui suit la **souris** et éclaire un cône (les meubles projettent de l'ombre) ;
- un écran d'accueil : on choisit un pseudo, puis on **crée** un salon (code de 4 lettres) ou on en **rejoint** un ;
- jusqu'à 8 joueurs par salon, chacun voit les autres bouger et éclairer.

Tout est dessiné avec des formes simples : aucune image ni son externe pour l'instant.

---

## Lancer le jeu sur son ordinateur

### 1. Une seule fois : installer les outils

- [Node.js](https://nodejs.org/) version 20 ou plus récente (prendre la version « LTS ») ;
- puis, dans un terminal ouvert dans le dossier du projet :

```bash
npm install
```

Cela télécharge les bibliothèques (Phaser, Colyseus…) dans un dossier `node_modules`.

### 2. Pour développer (rechargement automatique)

```bash
npm run dev
```

Puis ouvrez **http://localhost:5173** dans le navigateur.
Deux programmes tournent en même temps :

- **[jeu]** : Vite, qui sert le jeu et le recharge dès qu'on modifie un fichier ;
- **[serveur]** : le serveur multijoueur Colyseus, sur le port 2567.

Pour arrêter : `Ctrl + C` dans le terminal.

### 3. Pour tester comme en ligne (comme sur Render)

```bash
npm run build
npm start
```

Puis ouvrez **http://localhost:2567**. Ici, un seul serveur sert à la fois le jeu et le multijoueur,
exactement comme sur Render.

### Tester le multijoueur avec deux onglets

1. Ouvrez le jeu dans un premier onglet, tapez un pseudo et cliquez sur **Créer un salon**.
2. Notez le code de 4 lettres affiché en haut à gauche (ou cliquez sur **Copier le lien**).
3. Ouvrez un deuxième onglet (ou une fenêtre de navigation privée), entrez un autre pseudo,
   tapez le code et cliquez sur **Rejoindre** (ou collez simplement le lien copié).
4. Mettez les deux fenêtres côte à côte : quand vous bougez dans l'une, le livreur bouge dans l'autre.

> Astuce : un onglet en arrière-plan est mis en pause par le navigateur. Pour bien voir les deux
> en même temps, utilisez deux **fenêtres** côte à côte plutôt que deux onglets.

---

## Mettre en ligne sur Render

Le dépôt GitHub est relié à un **Web Service** Render (langage Node).
À chaque `git push` sur la branche suivie, Render reconstruit et redémarre le jeu.

Dans Render, onglet **Settings** du service, vérifiez :

| Réglage | Valeur |
| --- | --- |
| Language / Runtime | `Node` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path (facultatif) | `/health` |
| Variable d'environnement (facultatif) | `NODE_VERSION` = `22` |

À ne **pas** faire : définir vous-même la variable `PORT`. Render la fournit automatiquement,
et le serveur l'utilise (`process.env.PORT`).

Le fichier `render.yaml` contient les mêmes réglages. Il ne sert que si vous créez le service via
**New > Blueprint** ; avec un service déjà existant, recopiez simplement les valeurs ci-dessus.

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
tsconfig.json          Réglages TypeScript du jeu
tsconfig.server.json   Réglages TypeScript du serveur
src/
  client/              Le jeu, qui tourne dans le navigateur
    index.html         La page : écran d'accueil + bandeau en jeu
    style.css          L'apparence de l'écran d'accueil
    main.ts            Accueil, connexion au serveur, lancement de Phaser
    scenes/RoomScene.ts  La salle : dessin, déplacements, lampe, obscurité
    types.ts           Forme des données reçues du serveur
  server/              Le serveur Node
    index.ts           Démarre le serveur web + Colyseus sur le port PORT
    rooms/GameRoom.ts  Un salon : code à 4 lettres, joueurs, calcul des déplacements
    rooms/GameState.ts Les données partagées avec tous les joueurs
  shared/
    game.ts            Règles communes au jeu et au serveur (salle, vitesse, collisions)
```

Les dossiers `node_modules` (bibliothèques) et `dist` (résultat du build) sont recréés
automatiquement : ils ne sont pas enregistrés dans Git.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm install` | Installe les bibliothèques |
| `npm run dev` | Lance le jeu en mode développement (http://localhost:5173) |
| `npm run build` | Compile le jeu et le serveur dans `dist/` |
| `npm start` | Lance le serveur compilé (http://localhost:2567) |
| `npm run typecheck` | Vérifie le code TypeScript sans rien lancer |

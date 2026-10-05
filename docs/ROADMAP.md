# ROADMAP — Livreurs de l'Apocalypse

Chaque jalon doit être **JOUABLE** à la fin. On ne passe au suivant que lorsque le précédent
est testé en jouant. Référence du contenu : [`BIBLE.md`](BIBLE.md). Organisation du code :
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Légende : ✅ fait · 🔨 en cours · ⬜ à faire

---

## ✅ J0 — Réparation + fondations

*Jouable : menu → QG (choix quartier/difficulté) → tournée dans la rue des Lilas avec compte à
rebours du couvre-feu → récap → QG. Outils de debug complets.*

- ✅ Diagnostic de la « salle vide » : le code fonctionnait, c'était une **ancienne version** servie
  (vieux `dist/` en local ou déploiement Render pas à jour). Désormais :
  - la **version** (commit Git + date) s'affiche dans le menu, dans F1 et sur `/health` ;
  - en dev, `localhost:2567` redirige vers Vite (`localhost:5173`) au lieu de servir un vieux build ;
  - un modèle 3D manquant devient une **boîte rose** + erreur listée dans F1 (au lieu de tout bloquer) ;
  - fichier absent = vrai 404 ; message clair si le navigateur n'a pas WebGL 2.
- ✅ Machine à états des écrans : menu, QG, chargement, tournée (+ pause), récap, options.
- ✅ `/data` : quartiers, difficultés, modificateurs, créatures, colis, objets, pourboires,
  progression, joueur, tension. Vérification automatique de cohérence au démarrage.
- ✅ Règles pures + tests automatiques (`npm test`) : pourboires, séries, note de fin, XP,
  niveaux, réputation, taille de tournée selon joueurs et difficulté.
- ✅ Menu debug F1 (ou ²) : infos (images/s, position, objets, modèles, erreurs), téléportation,
  mannequins de créatures et de colis, mode invincible, passer au couvre-feu, finir la tournée.
- ✅ Options sauvegardées : sensibilité souris, champ de vision, volume, qualité graphique.
- ✅ Jusqu'à 8 joueurs par salon (côté serveur).

Reporté exprès : sauvegarde serveur PostgreSQL → **J3** (rien à sauvegarder avant la progression).

## ⬜ J1 — Une tournée complète en solo dans Les Lilas

*Jouable : une vraie tournée du début à la fin, seul.*

- ⬜ Téléphone (Tab) : une commande pizza (retrait + adresse + pourboire estimé).
- ⬜ Point de retrait (pizzeria) et adresse de livraison (porte qui s'ouvre, client).
- ⬜ Pizza qui refroidit ; porter un colis = pas de lampe torche en main.
- ⬜ Pourboire calculé avec les règles de J0 (rapidité, état, série, difficulté).
- ⬜ Un **Rôdeur** : patrouille, charge à vue, distrait par une pizza lancée (navmesh simple).
- ⬜ Mort (et respect du mode invincible).
- ⬜ Couvre-feu qui rend le Rôdeur enragé ; **van** de retour ; pourboires perdus si on n'y est pas.
- ⬜ Vrai récap : note S à D, pourboires, avis clients, XP.

## ⬜ J2 — Multijoueur

- ⬜ Salons à code de 4 lettres (Colyseus), 1 à 8 joueurs.
- ⬜ Synchronisation des joueurs (position, regard, lampe, colis).
- ⬜ Colis portés à plusieurs (colis Lourd).
- ⬜ À terre / réanimation (30 s).
- ⬜ Dispatcheur fantôme (vue de la map, pings) ; badge rapporté au van.

## ⬜ J3 — QG et progression

- ⬜ QG en 3D (on s'y balade), boutique, équipement (4 emplacements).
- ⬜ XP, niveaux 1 à 30, talents (Porteur, Éclaireur, Baratineur).
- ⬜ Réputation, déblocage des quartiers, paliers du QG.
- ⬜ Sauvegarde serveur (PostgreSQL de Render) + secours local en dev.

## ⬜ J4 — Contenu

- ⬜ Tous les types de colis (Lourd, Fragile, Bruyant, Vivant, Maudit).
- ⬜ Génération procédurale des Lilas (blocs modulaires).
- ⬜ Difficultés appliquées, modificateurs de nuit, directeur de tension.

## ⬜ J5 — Ressenti

- ⬜ Sons, notifications « ding +12 € », compteur de série.
- ⬜ Ragdolls, avis clients, récap animé, titres drôles.
- ⬜ Appels de Gérard.

## ⬜ J6 — Quartiers 2 à 5

- ⬜ Centre-ville, Galeries Saint-Néon, Le Port, Hôpital Saint-Néon.
- ⬜ Timide, Essaim, Mimic, Sirène, boss Le Gros ; la fin ; mode Cauchemar partout.

## ⬜ J7 — Finitions

- ⬜ Équilibrage, performances (60 i/s sur un portable moyen), mise en ligne finale.

# BIBLE — Livreurs de l'Apocalypse

> **C'est la référence du jeu.** À relire au début de chaque session de travail.
> En cas de désaccord avec `DESIGN.md` (le cahier des charges d'origine), c'est **ce fichier qui gagne**.
> Tous les chiffres cités ici sont des valeurs de départ : les vrais réglages sont dans `/data`.

---

## 1. Univers

- **Saint-Néon**, ville fictive. Depuis l'arrivée de **« la Brume »**, des créatures envahissent les
  rues chaque nuit.
- Les habitants vivent barricadés. Une seule entreprise livre encore : **Express Apocalypse**, une
  petite boîte minable.
- Le patron, **Gérard**, appelle les joueurs au téléphone avant chaque tournée : briefings drôles,
  radin, de mauvaise foi.
- **Ton** : horreur réelle + humour absurde.
- **Style visuel** proche de *The Headliners* : 3D à la première personne, low-poly, nuit, néons,
  brouillard, lampe torche.

## 2. Boucle de jeu

```
Menu → QG (lobby 3D : on se balade, on s'équipe)
     → choix du quartier et de la difficulté
     → tournée de 12 à 20 min
     → retour au van
     → récap (note S à D, pourboires, avis clients drôles, XP)
     → QG
```

## 3. Quartiers (= les niveaux, débloqués par la réputation)

| # | Quartier | Ambiance | Nouvelle(s) créature(s) |
| --- | --- | --- | --- |
| 1 | **Les Lilas** | Résidentiel, tutoriel | Rôdeur |
| 2 | **Centre-ville** | Néons, ruelles | + Timide |
| 3 | **Galeries Saint-Néon** | Centre commercial intérieur | + Essaim, + Mimic |
| 4 | **Le Port** | Zone industrielle, grues, conteneurs | + Sirène |
| 5 | **Hôpital Saint-Néon** | Final | + boss « Le Gros » |

- Terminer l'Hôpital débloque **la fin** et le **mode Cauchemar partout**.
- Chaque quartier est **assemblé aléatoirement** à partir de blocs modulaires (rues, bâtiments,
  intérieurs) : jamais deux fois la même map.

## 4. Difficultés

- 3 niveaux par quartier : **Tranquille**, **Agitée**, **Cauchemar**
  (plus de créatures, plus rapides, couvre-feu plus court).
  Pourboires **×1 / ×1,5 / ×2,5**.
- **Modificateurs aléatoires de nuit** :
  - brouillard épais ;
  - panne de courant ;
  - pleine lune (créatures +20 % de vitesse) ;
  - nuit VIP (commandes rares).
- Le nombre de commandes et de créatures **s'adapte au nombre de joueurs (1 à 8)**.
- Un **« directeur de tension »** (comme *Left 4 Dead*) : quand l'équipe est calme depuis longtemps,
  il envoie une menace ; quand elle vient de souffrir, il la laisse respirer.

## 5. Commandes et colis

- Les commandes arrivent sur le **téléphone** (en jeu : touche **Tab**) : point de retrait +
  adresse + pourboire estimé.
- **Porter un colis occupe les mains** : pas de lampe torche en main (seule la lampe frontale marche).

| Colis | Règle |
| --- | --- |
| **Pizza** | Refroidit |
| **Lourd** | 2 à 4 porteurs |
| **Fragile** | Casse si on court ou si on le lance |
| **Bruyant** | Attire les créatures |
| **Vivant** | S'échappe si on le pose |
| **Maudit** | Attire tout, mais pourboire énorme |

- **Pourboire = base × rapidité × état du colis × série × difficulté.**
- **Séries** : livraisons enchaînées sans échec = ×2, ×3, ×5.
- **Clients bizarres** : livraison par la fenêtre, client qui est une créature, client qui refuse
  de payer.

## 6. Créatures

| Créature | Comportement |
| --- | --- |
| **Rôdeur** | Patrouille, charge à vue, adore la nourriture (lui lancer une pizza le distrait) |
| **Timide** | Ne bouge que quand personne ne la regarde |
| **Essaim** | Nuée attirée par la lumière |
| **Mimic** | Déguisé en colis abandonné |
| **Sirène** | Imite la sonnette et la voix des clients pour attirer les livreurs |
| **Le Gros** (boss) | Lent, énorme, traverse les murs |

Toutes réagissent **au bruit et à la lumière**, avec une IA de déplacement (**navmesh**).

## 7. Survie, mort, fin de tournée

- **À terre** : relevable pendant **30 s** par un coéquipier.
- **Mort** : ragdoll, puis **« dispatcheur fantôme »** (vue de toute la map, pings, appels clients).
- **Résurrection** en rapportant le **badge** du mort au van.
- **Couvre-feu** : à zéro, les créatures deviennent enragées.
  Pourboires perdus si on ne revient pas au van (sauf si un coéquipier rapporte la **sacoche**).

## 8. Progression

- **Pourboires** = argent (boutique du QG).
- **Réputation** = étoiles cumulées. Débloque les quartiers et les améliorations du QG en
  **5 paliers** : garage → atelier → cuisine → garage à vans → siège social.
- **Niveau de livreur 1 à 30** (XP : livraisons, réanimations, objectifs, note de fin).
  Chaque niveau débloque un cosmétique, un objet ou un point de talent.
- **Talents en 3 branches** (bonus légers, pour se répartir les rôles) :
  - **Porteur** : force, endurance ;
  - **Éclaireur** : lampe, vision, discrétion ;
  - **Baratineur** : pourboires, clients, téléphone.
- **Équipement (4 emplacements)** :
  - lampes : torche, frontale, longue portée, UV ;
  - transport : diable, chariot, sangles ;
  - utilitaires : leurre, fusée, cadenas, trousse, sac isotherme.
- **Personnalisation 100 % cosmétique** : uniforme, casquette, couleurs, accessoires, effet de mort,
  emotes, logo du van.

## 9. Récompenses et ressenti

- Notifications **« ding » + « +12 € »**, compteur de série.
- **Loot à 4 raretés** (gris, bleu, violet, doré) avec son et lumière.
- Ralentis courts, **récap animé** avec les meilleurs moments, **titres drôles**
  (« Livreur le plus lent »).

**Garde-fous** :
- pas d'achat avec de l'argent réel ;
- une partie a toujours une fin nette ;
- pas de récompense quotidienne qui punit ceux qui ne jouent pas tous les jours.

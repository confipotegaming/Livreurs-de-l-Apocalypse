# Cahier des charges — Jeu coop web (titre provisoire : LIVREURS DE L'APOCALYPSE)

> **Depuis le 5 oct. 2026, la référence du jeu est [`docs/BIBLE.md`](docs/BIBLE.md)** (1 à 8 joueurs,
> 5 quartiers, 6 créatures…). Ce cahier des charges d'origine reste utile pour les 4 piliers et les
> détails ; en cas de désaccord, la bible gagne.

Oct 5, 2026 · @Elisa

> **Changement de direction (5 oct. 2026)** : on abandonne la 2D vue du dessus (Phaser) pour de la
> **3D à la première personne low-poly, façon The Headliners** (Three.js + Rapier). Le serveur Node +
> Colyseus et l'hébergement Render restent. Les sections « Direction artistique », « Vue et choix
> techniques » et « Étapes » ci-dessous sont à jour.

## Concept

LIVREURS DE L'APOCALYPSE est un jeu coop d'horreur-comique pour 1 à 5 amis, jouable dans le navigateur : une équipe de livreurs de nuit doit livrer des commandes dans une ville envahie de créatures, avant que tout refroidisse, se casse ou se fasse dévorer.

**Pitch en une phrase** : les clients barricadés paient très cher leurs livraisons — encore faut-il traverser la ville à pied, dans le noir, avec un frigo sur le dos.

**Ce qu'on reprend de chaque inspiration**

- **The Headliners** : le lobby, le stuff, la personnalisation du perso, puis une partie lancée sur une map ; l'horreur absurde et les morts ridicules entre amis.
- **The Outlast Trials** : le hub social entre deux parties, des objectifs précis par partie, une note de fin, des cosmétiques à débloquer.
- **Planet Crafter** : la progression visible à long terme — votre QG passe d'un garage avec un scooter rouillé à une vraie entreprise de livraison.

**Ce qui le rend unique** : les colis. Chacun a ses règles (il refroidit, il est trop lourd, fragile ou bruyant) et force l'équipe à s'organiser : qui porte, qui éclaire, qui fait diversion.

## Cible, contraintes et piliers

Le jeu vise un groupe d'amis fixe, pas le grand public : priorité au fun entre potes et à la facilité de lancement, pas au matchmaking ni à l'anti-triche.

| Contrainte | Exigence |
| --- | --- |
| Plateforme | Navigateur web sur PC (Chrome, Firefox, Edge), aucune installation |
| Contrôles | Clavier + souris uniquement |
| Joueurs | 1 à 5 par partie |
| Mode | 100 % coopératif contre le jeu |
| Durée d'une tournée | 12 à 20 minutes |
| Rejoindre | Un lien ou un code de salon de 4 lettres, sans création de compte |
| Performances | 60 images/s sur un PC portable moyen |

**Les 4 piliers de design** (toute nouvelle idée doit en servir au moins un) :

1. **Peur et fou rire** : la tension monte, puis une mort ridicule fait rire tout le monde.
2. **Risque = récompense** : les plus gros pourboires sont toujours là où c'est dangereux.
3. **On a besoin des autres** : un joueur seul s'en sort mal ; l'équipe se répartit les rôles.
4. **Toujours un truc à débloquer** : chaque partie, même ratée, fait avancer quelque chose.

## Boucle de jeu

Une session enchaîne des tournées courtes séparées par un passage au QG, exactement comme le lobby puis la partie de The Headliners.

&#91;embedded content: boucle de jeu · 5 étapes\]

Même une tournée ratée rapporte un peu de pourboires et de réputation, pour que chaque partie fasse avancer quelque chose.

## Mécaniques en partie

En tournée, on ne tue pas les monstres : on récupère des commandes, on les transporte ensemble et on les livre en évitant les créatures.

**Contrôles**

| Action | Touche |
| --- | --- |
| Se déplacer | ZQSD (ou WASD) |
| Regarder (et orienter la lampe torche) | Souris |
| Prendre ou poser un colis, interagir, réanimer | E |
| Lancer un colis à un coéquipier | Clic droit (maintenu pour viser) |
| Utiliser l'objet en main | Clic gauche |
| Sprinter | Maj (jauge d'endurance) |
| Allumer / éteindre sa lampe | F |
| Changer d'objet | Molette ou 1 à 4 |
| Ping « regardez ici » | Clic molette |
| Emote | T |

**Commandes et colis**

- Les commandes arrivent sur le téléphone du livreur : un point de retrait (restaurant, magasin, entrepôt) et une adresse de livraison sur la map.
- Porter un colis occupe les mains : impossible de tenir sa lampe en même temps. Les autres doivent éclairer et escorter le porteur.

| Colis | Règle | Ce que ça demande |
| --- | --- | --- |
| Pizza, plats chauds | Refroidit : le pourboire baisse avec le temps | Aller vite, sac isotherme |
| Frigo, piano, canapé | Trop lourd pour un seul : 2 à 4 porteurs, déplacement lent | Coordination, escorte |
| Fragile (vase, gâteau de mariage) | Se casse si on court, tombe ou le lance | Marcher, protéger le porteur |
| Bruyant (poules, réveil, enceinte) | Fait du bruit en continu et attire les créatures | Diversion, chemin discret |

- **Pourboire** selon la rapidité, l'état du colis et des bonus absurdes (« livré avec un monstre à moins de 2 mètres »).
- **Séries** : enchaîner les livraisons sans échec multiplie les pourboires (x2, x3, x5…).
- **Clients bizarres** : un client qui veut être livré par la fenêtre du 3e étage, un autre qui est lui-même une créature. Des commandes VIP rares et très bien payées apparaissent au hasard.

**Survie**

- Champ de vision limité au cône de la lampe ; le reste de la map est sombre.
- Les créatures réagissent au bruit (sprint, portes, colis bruyants) et à la lumière.
- Outils de survie : leurres sonores, fusées éclairantes, cadenas pour bloquer une porte, adrénaline.

**Créatures (3 au lancement)**

| Créature | Comportement | Contre |
| --- | --- | --- |
| Le Rôdeur | Patrouille et charge quand il vous voit ; adore la nourriture | Casser la ligne de vue, fermer une porte, lui sacrifier une pizza |
| La Timide | Ne bouge que quand personne ne la regarde | Toujours garder un œil dessus, à tour de rôle |
| L'Essaim | Nuée attirée par la lumière | Éteindre sa lampe, utiliser une fusée comme appât |

**Mort et réanimation**

- Un joueur à terre peut être relevé par un coéquipier pendant 30 secondes.
- Un joueur mort devient le « dispatcheur fantôme » : il voit toute la map, pinge les dangers et les itinéraires, et reçoit les appels des clients. Il reste utile et ne s'ennuie pas.
- Un mort peut être ressuscité en rapportant son badge de livreur au van.

**Fin de partie**

- Couvre-feu : quand le compte à rebours atteint zéro, les créatures deviennent enragées.
- Il faut rejoindre le van. Les pourboires d'un livreur qui ne revient pas sont perdus, sauf si un coéquipier rapporte sa sacoche.

## Progression, loot et personnalisation

Deux monnaies font tourner la progression : les **pourboires** (l'argent, dépensé en équipement) et la **réputation** (les étoiles cumulées à vie, qui font monter le niveau de l'entreprise et débloquent du contenu).

**Les trois couches de progression**

| Couche | Portée | Exemples |
| --- | --- | --- |
| Dans la partie (roguelike) | Perdue à la fin de la tournée | Objets ramassés en route, bonus temporaires choisis parmi 3 (« bras costauds », « semelles silencieuses », « sac isotherme XXL ») |
| Personnelle | Gardée par chaque joueur | Équipement acheté, cosmétiques, niveau de livreur |
| D'équipe (le QG) | Partagée par le groupe | Améliorations du QG, nouveaux quartiers, nouveaux colis, nouvelles créatures |

**Loot sur la map** : des objets cachés dans les maisons et magasins, et des colis perdus à livrer en bonus. Quatre raretés identifiables à la couleur et au son (commun gris, rare bleu, épique violet, légendaire doré). Les plus rares sont dans les zones les plus dangereuses.

**Équipement (4 emplacements par joueur)**

- Lampes : torche standard, frontale (éclaire même en portant un colis, mais faible portée), lampe longue portée.
- Transport : diable, chariot de supermarché (rapide mais bruyant), sangles de déménageur.
- Utilitaires : leurre, fusée, cadenas, trousse de réanimation, sac isotherme.

**Personnalisation du personnage**

- Corps, couleur, uniforme, casquette ou casque, accessoire, effet de mort (confettis, pluie de frites…).
- Pour l'équipe : logo et couleurs du van.
- Emotes à débloquer, utilisables en partie et au QG.
- Tout est purement cosmétique : aucun avantage de jeu.

**Le QG (inspiré de Planet Crafter)** : il commence en garage avec un scooter rouillé, puis s'améliore par paliers (atelier, cuisine pour les commandes spéciales, garage à vans, tableau du livreur du mois). Chaque palier change visiblement le décor et débloque une fonction.

## Boucles de récompense (dopamine)

La sensation de « encore une partie » vient de récompenses empilées sur plusieurs échelles de temps, chacune avec un retour sensoriel fort.

| Échelle | Récompense | Retour à l'écran |
| --- | --- | --- |
| Toutes les quelques secondes | Pourboire reçu, série qui monte | Notification de téléphone avec « ding », « +12 € » qui s'envole, compteur de série qui grossit |
| Toutes les quelques minutes | Loot trouvé, commande VIP, ami sauvé de justesse, gros colis livré | Faisceau de couleur selon la rareté, ralenti d'une demi-seconde, confettis à la porte du client |
| À chaque fin de partie | Récap, note de S à D, pourboires et réputation | Barres qui se remplissent une par une, avis clients drôles (« Le livreur a hurlé en me tendant la pizza. 5 étoiles. »), titres (« Livreur le plus lent : Kevin ») |
| Entre les sessions | Palier du QG, nouveau quartier, cosmétique rare | Écran de déblocage, changement visible du QG |

**Leviers à utiliser**

- **Récompenses variables** : les commandes, les clients bizarres, les commandes VIP et le contenu des caisses sont aléatoires ; on ne sait jamais ce qui va tomber.
- **Le « presque »** : afficher « il manquait 8 € de pourboire pour la note S » donne envie de relancer.
- **Le juice** : tremblement d'écran, sons punchy, particules, petits ralentis. C'est ce qui rend chaque livraison satisfaisante.
- **Les moments partagés** : les livraisons les plus folles sont rejouées à tout le groupe au QG.

**Garde-fous** (pour que ça reste un bon moment entre amis) : pas d'achat réel ni de caisse payante ; une partie a toujours une fin nette ; pas de récompenses quotidiennes qui punissent si on ne se connecte pas.

## Direction artistique et son

L'ambiance mélange vraie tension et humour absurde : une ville de nuit inquiétante, traversée par des livreurs ronds et ridicules en uniforme criard. **Référence visuelle : The Headliners.**

- **Style visuel** : 3D low-poly à la première personne, formes simples et couleurs franches (kits Kenney / Quaternius), rendu « caméra bon marché » grâce au post-traitement. Livreurs mignons et maladroits, créatures dérangeantes : le contraste entre les deux fait l'humour.
- **Lumière** : c'est l'élément clé de la peur. Obscurité quasi totale et brouillard ; on ne voit que ce qu'éclaire sa lampe torche (avec ombres portées), les lampadaires (dont certains grésillent ou sont en panne) et quelques néons colorés.
- **Post-traitement** : bloom (les lumières bavent), grain de pellicule, vignettage, légère aberration chromatique. C'est ce qui donne le « look » à des modèles très simples.
- **Interface** : façon appli de livraison sur téléphone, avec carte des commandes, minuteurs, notifications de pourboires, notes et avis clients.
- **Lieux** : quartier résidentiel au lancement, puis centre-ville, centre commercial, zone industrielle.
- **Son** : il porte la moitié de la peur. Bruits de pas spatialisés, respiration, silence soudain avant une apparition. Côté humour : « ding » de notification, sonnette du client, cris exagérés, bruitages cartoon à la mort.
- **Ressources** : modèles 3D gratuits et libres de droits (CC0) de Kenney et Quaternius, rangés dans `assets/models`, avec leurs licences dans `assets/LICENCES` ; on remplace par du sur-mesure plus tard si le jeu vous plaît.

## Vue et choix techniques

**Choix retenu : 3D à la première personne, low-poly, façon The Headliners.**
(Le premier prototype était en 2D vue du dessus avec Phaser ; on l'a abandonné pour une direction artistique plus immersive.)

| Critère | 2D vue du dessus (abandonnée) | 3D première personne (retenue) |
| --- | --- | --- |
| Difficulté à coder avec une IA | Faible | Plus élevée (physique, caméra, animations 3D) |
| Ressources graphiques gratuites | Très nombreuses | Nombreuses en low-poly (Kenney, Quaternius) |
| Performances navigateur à 5 joueurs | Excellentes | À surveiller : objectif 60 images/s sur un PC portable moyen |
| Peur ressentie | Bonne grâce à la lumière | Très forte |
| Temps avant une première version jouable | Quelques semaines | Plus long |

Pour tenir les 60 images/s : peu de lumières qui projettent des ombres (seulement la lampe torche),
brouillard qui cache le lointain, effets de post-traitement regroupés, résolution qui baisse
automatiquement si le PC n'arrive pas à suivre.

**Stack**

| Brique | Outil | Rôle |
| --- | --- | --- |
| Langage | TypeScript | Le même langage côté jeu et côté serveur |
| Moteur 3D | Three.js | Affichage 3D, lumières, ombres, chargement des modèles dans le navigateur |
| Physique | Rapier | Collisions, déplacement du personnage, objets qu'on lance |
| Post-traitement | postprocessing | Bloom, grain, vignettage, aberration chromatique |
| Serveur multijoueur | Colyseus (Node.js) | Salons, synchronisation des joueurs, logique de partie |
| Construction des niveaux | Kits modulaires (Kenney, Quaternius) placés par le code | Rues et bâtiments assemblés aléatoirement |
| Sauvegarde | PostgreSQL (base Render) | Profils, équipement, progression du QG |
| Outil de build | Vite | Lancer et compiler le projet |
| Hébergement | Render (Web Service Node.js), déployé automatiquement depuis GitHub | Faire tourner le jeu pour vos amis, quelques euros par mois |

Ces outils sont très répandus, donc une IA les connaît bien et produit du code fiable avec eux.

## Multijoueur et réseau

Le serveur décide de tout (positions des créatures, loot, pourboires gagnés) et les navigateurs affichent ce qu'il envoie : c'est plus simple à garder cohérent pour 5 joueurs.

- **Salons** : un joueur crée un salon, reçoit un code de 4 lettres et un lien ; les autres rejoignent en un clic. Le créateur est le chef et lance la partie.
- **Lobby / QG** : tous les joueurs du salon se retrouvent au QG, se déplacent librement, s'équipent, se customisent et votent pour le quartier.
- **Synchronisation** : le serveur calcule le jeu 20 fois par seconde ; chaque navigateur lisse les mouvements des autres pour qu'ils paraissent fluides. Son propre personnage réagit immédiatement aux touches.
- **Reconnexion** : un joueur déconnecté peut revenir dans la partie en cours pendant 2 minutes.
- **Communication** : chat écrit, pings et emotes au lancement. Pour la voix, utilisez Discord au début ; un chat vocal de proximité (on entend les amis proches, et les créatures aussi) est une amélioration prévue plus tard.
- **Comptes** : un simple pseudo + un identifiant gardé dans le navigateur suffit au départ, pas de mot de passe.

## Première version et étapes

La première version jouable (MVP) doit tenir en une seule soirée de test entre amis : un quartier, trois créatures, trois types de colis, la boucle QG → tournée → récap complète. Tout le reste vient après.

**Contenu du MVP**

- [ ] Salon avec code, jusqu'à 5 joueurs
- [ ] QG simple : choisir sa couleur et 1 chapeau, acheter 4 objets
- [ ] 1 map (quartier résidentiel) faite de rues et bâtiments assemblés aléatoirement
- [ ] Lampe, obscurité, commandes à récupérer et livrer : pizza, colis lourd, colis fragile
- [ ] 3 créatures : Rôdeur, Timide, Essaim
- [ ] Mise à terre, réanimation, dispatcheur fantôme
- [ ] Couvre-feu et retour au van
- [ ] Écran de récap avec note, pourboires et avis clients

**Les étapes, dans l'ordre**

0. ~~Prototype 2D (Phaser) : salle sombre, lampe, multijoueur à deux onglets~~ — fait, puis abandonné au profit de la 3D.
1. **Tranche visuelle 3D (solo)** : une rue de nuit low-poly à la première personne, lampe torche, lampadaires, néons, post-traitement, une pizza à ramasser et lancer. Objectif : que l'ambiance soit déjà là. — **fait**
2. **Multijoueur** : deux onglets du navigateur voient la même rue et les mêmes livreurs.
3. **Le cœur du jeu** : commandes, porter et lancer des colis, pourboires, une première créature, mort.
4. **Une partie complète** : quartier généré, retour au van, récap. Premier test avec les amis.
5. **Le QG** : lobby, équipement, personnalisation, sauvegarde.
6. **Le juice** : sons, particules, notifications de pourboires, avis clients, commandes VIP. C'est là que le jeu devient addictif.
7. **Mise en ligne** sur un serveur, puis ajout de contenu (maps, créatures, cosmétiques) selon vos envies.

Après chaque étape, on joue, on note ce qui est fun ou ennuyeux, et on ajuste avant de passer à la suivante.

## Développer avec une IA

Le plus efficace est un assistant de code qui travaille directement dans les fichiers du projet (comme Claude Code) plutôt que du copier-coller depuis un chat : il peut créer les fichiers, lancer le jeu et corriger ses erreurs.

**Installation de départ**

- [ ] Installer Node.js, VS Code et Git
- [ ] Installer l'assistant de code IA
- [ ] Créer un dossier de projet et y mettre ce cahier des charges en Markdown (`DESIGN.md`), pour que l'IA s'y réfère à chaque demande

**Règles de travail**

1. **Une petite étape à la fois.** « Fais un personnage qui se déplace avec ZQSD », pas « fais le jeu ».
2. **Tester après chaque demande.** Si ça casse, décrire précisément ce qu'on voit et le message d'erreur.
3. **Sauvegarder avec Git à chaque étape qui marche**, pour pouvoir revenir en arrière si l'IA casse quelque chose.
4. **Demander des explications** quand on ne comprend pas un fichier : on apprend en route et on guide mieux l'IA.
5. **Faire relire régulièrement** : « relis le projet et dis-moi ce qui est fragile ou mal organisé ».

**Exemple de première demande**

> Lis DESIGN.md. Crée une rue de nuit en 3D avec Three.js + Rapier, vue à la première personne, déplacement ZQSD, souris pour regarder, et une lampe torche. Explique-moi comment lancer le jeu.

**Budget indicatif** : un abonnement à l'assistant IA et quelques euros par mois de serveur une fois le jeu en ligne ; les ressources graphiques et sonores de départ peuvent être gratuites.

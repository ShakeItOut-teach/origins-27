# Palier 3 — La carte : conception

Date : 2026-11-23 · État : **proposé, à valider par le propriétaire**

Le palier 3 est le moment où le jeu cesse d'être un jeu de clics : la cellule découvre qu'il
y a un monde autour d'elle, et le joueur commence à **choisir** où dépenser un bien rare.

## Décisions du propriétaire

| #   | Question              | Décision                                                                          |
| --- | --------------------- | --------------------------------------------------------------------------------- |
| 1   | Forme de la carte     | Une goutte d'eau vivante : des lieux qui flottent, pas de cases                   |
| 2   | Un monde ou plusieurs | Un seul monde pour les 500 organismes ; au palier 3, on ne voit que son voisinage |
| 3   | Ce qu'on y fait       | Envoyer une expédition vers un lieu. Pas de brouillard à explorer                 |
| 4   | Énergie               | Une petite jauge qui se remplit toute seule                                       |

## Ce que le joueur vit

1. Il vient de choisir sa première mutation. Une note : **« Votre cellule sent le monde autour
   d'elle. »** La vue recule : la cellule devient petite, au centre d'une goutte plus large où
   flottent quelques lieux.
2. Un seul nouveau bouton permet de passer de la **cellule** à la **goutte** et retour. Un
   nouveau compteur apparaît : l'**énergie**.
3. Il touche un lieu. Une fiche dit trois choses : ce que ça rapporte, le temps de
   l'aller-retour, le coût en énergie. Un bouton : **Envoyer**.
4. Un filament part de la cellule, atteint le lieu, revient chargé. Au retour, le butin entre
   dans la réserve.
5. Après 5 expéditions revenues, le palier 4 s'ouvrira (troupes et chasse — hors de ce document).

Un écran, une idée : la fiche d'un lieu a la même forme que la fiche d'un organite
(un gain, une durée, un coût, un bouton).

## Règles

### Le monde

- Une goutte par saison, la même pour tout le serveur. Chaque joueur y reçoit une **place**
  à son arrivée : la 1ʳᵉ au centre, les suivantes en spirale régulière vers l'extérieur
  (chacun a ainsi des voisins à distance comparable, sans tirage au sort à équilibrer).
- Les autres joueurs **existent** déjà sur la carte dans les données, mais ne sont ni affichés
  ni atteignables avant le palier 5. Le palier 5 sera un dévoilement, pas un déménagement.
- Les **lieux** ne sont pas stockés : ils se calculent à partir de la graine de la saison et
  de la position. Deux joueurs voisins voient les mêmes lieux aux mêmes endroits.

### Les lieux (palier 3)

| Lieu          | Rapporte | Où                       |
| ------------- | -------- | ------------------------ |
| Amas de sucre | Sucre    | Fréquent, souvent proche |
| Débris        | Briques  | Plus rare, plus loin     |

- Chaque joueur voit entre 5 et 7 lieux autour de lui, à trois distances : proche, moyen, loin.
- Plus c'est loin, plus ça rapporte, plus c'est long et plus ça coûte d'énergie.
- **Un lieu ne s'épuise pas pour les autres.** Après votre passage, il met un moment à se
  regarnir _pour vous_. La dispute pour un même lieu est une mécanique de rivalité : elle
  arrivera avec le palier 5, pas avant. (Choix de conception, à contester si vous voulez de la
  rareté partagée plus tôt.)

### Les expéditions

- **Une seule à la fois** au palier 3. (Une deuxième sera une récompense plus tard.)
- Le butin est fixé au départ, livré au retour. Ce qui dépasse la réserve est perdu : cela
  donne enfin une raison d'améliorer la Réserve.
- **Une expédition peut être annulée** tant qu'elle n'est pas revenue (décision du
  propriétaire). Le filament se rétracte tout de suite : pas de butin, l'énergie dépensée est
  rendue, le lieu reste intact. Annuler ne coûte donc rien : c'est un droit à l'erreur, pas
  une tactique.
- Elle continue pendant l'absence ; le résumé « Pendant votre absence » la raconte.
- Le compteur « récoltes sur la carte » augmente au retour.

### L'énergie

- Jauge de **10 points**, pleine à l'ouverture du palier 3.
- **1 point regagné toutes les 20 minutes** (pleine en 3 h 20 environ).
- Coût : 1 point (proche), 2 (moyen), 3 (loin).
- L'énergie ne sert qu'à la carte. Toucher la cellule et construire restent gratuits.

### Chiffres de départ (à régler par les robots)

| Distance | Aller-retour | Énergie | Butin (ordre de grandeur) | Se regarnit en |
| -------- | ------------ | ------- | ------------------------- | -------------- |
| Proche   | 30 s         | 1       | 40 sucres                 | 2 min          |
| Moyen    | 3 min        | 2       | 120 sucres ou 40 briques  | 10 min         |
| Loin     | 10 min       | 3       | 300 sucres ou 120 briques | 30 min         |

## Cibles d'équilibrage (deviendront des tests)

- Première expédition envoyée **moins de 30 secondes** après l'ouverture du palier 3.
- Le palier 4 (5 expéditions revenues) est atteignable **dans la première session**, en
  10 minutes environ, sans vider l'énergie.
- À temps égal, une expédition rapporte **nettement plus** que toucher la cellule : la carte
  doit devenir l'activité principale, le toucher un appoint.
- Un joueur qui revient toutes les 8 heures retrouve sa jauge pleine et a toujours un envoi
  utile à faire.
- Jamais plus de 90 secondes sans rien d'utile à faire en première session (cible déjà en place).

## Ce que ça change dans le code

| Paquet   | Changement                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| `data`   | Lieux, distances, énergie dans l'équilibrage ; ordre `sendExpedition` ; textes FR/EN ; `MAX_RELEASED_TIER = 3`   |
| `core`   | Génération des lieux depuis la graine ; énergie ; expédition dans l'état du joueur ; retour traité par `advance` |
| `server` | Une place attribuée à chaque joueur à sa création (migration) ; la graine de saison passée au moteur             |
| `client` | Vue « goutte » en PixiJS, bascule cellule/goutte, fiche de lieu, compteur d'énergie, filament animé              |
| `bots`   | Les robots envoient des expéditions ; nouvelles cibles ci-dessus                                                 |

L'état du joueur change de forme (énergie, expédition, place) : les parties existantes sont
converties automatiquement, sans rien perdre.

## Hors de ce palier

Autres joueurs visibles, brouillard, troupes, chasse, coffres, quêtes du jour, plusieurs
expéditions en même temps, lieux qui s'épuisent pour tous.

## Questions ouvertes

Aucune ne bloque le démarrage. Les chiffres du tableau sont des points de départ : les robots
les ajusteront, et chaque changement sera noté dans le journal d'équilibrage.

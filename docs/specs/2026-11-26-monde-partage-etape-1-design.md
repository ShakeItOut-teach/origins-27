# Monde partagé, étape 1 : « Le même océan » — conception

Date : 2026-11-26 · État : **demandé par le propriétaire** (« Parfait ça on veut ! » pour le
monde hybride, puis « Oui, prépare-la »). Suit le bilan
`docs/veille/2026-11-25-bilan-jeux-comparables.md` (partie 4.1) et l'ADR 0006.

## L'idée

Aujourd'hui, chaque joueur vit seul avec 499 organismes simulés. Tous les joueurs d'une saison
ont pourtant la même graine : ils voient le même océan, avec les mêmes noms aux mêmes places.
Chaque vrai joueur occupe déjà une place (`prendre_place`), mais pour les autres cette place
reste tenue par un organisme simulé.

L'étape 1 fait la chose la plus simple et la plus sûre : **un vrai joueur prend sa place aux
yeux des autres.** Son nom d'espèce, sa puissance et ses scores remplacent ceux de l'organisme
simulé partout où l'océan est compté. Un badge dit qu'il est humain. Aucun combat entre humains
à cette étape : on sait que d'autres sont là, on se compare, on ne se fait pas de mal.

## Ce que voient les joueurs

1. **Les classements** (cinq catégories) et **les ligues** mêlent humains et organismes
   simulés. Une ligne humaine porte le badge « humain ». La ligue, donc le coffre de minuit,
   tient compte des humains.
2. **Le concours de la semaine** aussi : la progression d'un humain est la sienne.
3. **La Gazette** cite les humains quand ils sont en tête.
4. **L'océan et Les rivaux** : à la place d'un humain, on voit son nom et le badge. On ne
   l'espionne pas et on ne l'attaque pas (« Un autre joueur : pas d'attaque entre joueurs pour
   l'instant »). Le serveur refuse l'ordre (`human`).
5. **Un compteur** : « N espèces humaines dans l'océan cette saison ».

## Les règles

- **La vitrine.** Ce que les autres voient d'un joueur tient sur une petite fiche : sa place,
  son nom d'espèce, sa teinte, son palier, sa zone, ses cinq scores, sa progression au concours
  de la semaine, l'instant de sa dernière visite. Rien d'autre : ni identifiant de compte, ni
  ressources, ni troupes détaillées.
- **Elle se met à jour à chaque visite et à chaque ordre**, après la réponse (comme la mesure
  d'audience), sans jamais retarder ni faire échouer le jeu.
- **Un absent garde sa dernière fiche.** Ses scores restent ceux de sa dernière visite. (Le
  retour au contrôle de l'ordinateur après 48 h arrive avec l'étape 3, quand l'absence compte.)
- **Le serveur fait foi.** Le moteur reste pur : la foule (`crowd`) est une entrée du calcul,
  donnée par le serveur avant d'avancer le temps, et renvoyée à l'appareil avec l'état. Elle
  n'est pas sauvegardée dans la partie. L'appareil prévoit avec la dernière foule reçue ; un
  petit écart de rang entre deux visites est corrigé à la visite suivante.
- **Lecture des vitrines** : une seule requête par appel, gardée une minute en mémoire par la
  fonction du serveur. Aucun appel de plus pour le joueur, donc aucun effet sur le quota
  gratuit.

## Ce qu'on mesure

- Le nombre d'espèces humaines par saison et par jour (déjà dans `presences`).
- Le rang de puissance moyen des humains, et combien sont dans la première ligue.
- Combien d'ordres refusés pour `human` : s'il y en a beaucoup, les joueurs veulent se battre
  entre eux, ce qui avance l'étape 3.

## Hors de cette étape

- **La part de chaque famille de gènes publiée chaque jour** et **les gisements vraiment
  partagés** : deuxième morceau de l'étape 1 (ils demandent une table des prises de chaque
  gisement et un calcul quotidien).
- **Les bancs** (étape 2) et **la prédation entre humains** (étape 3, avec le bouclier de nuit,
  le mode absence et les notifications).

## Découpage

| Tâche | Contenu                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------- |
| 1     | `core` : `HumanCard`, `Crowd`, `humanCard(state)`, `readCrowd` ; classements, concours, océan. |
| 2     | Base : table `vitrines`, fonctions `montrer_vitrine` et `lire_vitrines`, tests d'accès.        |
| 3     | `server` et fonction : lire la foule, la donner au moteur, écrire la vitrine après la réponse. |
| 4     | Écran : badge humain dans les classements, le concours et l'océan ; compteur ; textes FR/EN.   |
| 5     | Mesures : humains dans les statistiques du gardien ; ordres refusés pour `human`.              |
| 6     | Deuxième morceau : gisements partagés et part des familles de gènes.                           |

## Deuxième morceau (livré le 26/11/2026)

- **Gisements vraiment partagés.** Quand un humain récolte un gisement, le serveur note la
  quantité (table `prises`, sans dire qui l'a prise). La foule envoyée au moteur porte ces
  prises : ce que les autres humains ont pris n'est plus là pour personne. Lecture comprise
  dans la même requête que les vitrines (`lire_foule`), une fois par minute au plus.
- **Familles de gènes chez les humains.** Chaque vitrine porte la famille la plus travaillée.
  La Gazette publie leur part dès que **trois humains au moins** ont des gènes (en dessous,
  la part désignerait presque chaque joueur). Aucun effet sur les règles pour l'instant : c'est
  une information. En faire un ressort (une famille rare mieux récompensée, par exemple) est une
  décision d'équilibrage à prendre quand il y aura des chiffres.
- **Mesures pour le gardien** : espèces humaines de la saison et des dernières 24 h, puissance
  moyenne et maximale, familles, total pris dans les gisements, et **les ordres refusés par
  motif** sur sept jours (`usage_refus`), dont `human` : les tentatives d'attaquer un joueur.

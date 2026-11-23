# Palier 4 — Troupes et chasse : conception

Date : 2026-11-23 · État : **proposé, à valider par le propriétaire**

Au palier 3, le joueur choisit où envoyer un filament. Au palier 4, il prend son premier
**risque** : lever des cellules filles et les envoyer chasser. C'est aussi le premier pas vers
les combats entre joueurs du palier 5.

## Décisions du propriétaire

| #   | Question           | Décision                                                                                                                         |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Périmètre          | Troupes et chasse seulement. Coffres et quêtes du jour : étape suivante, à part                                                  |
| 2   | Troupes            | Trois types dès le départ                                                                                                        |
| 3   | Issue d'une chasse | Un petit combat à jouer si on le souhaite ; sinon, une chance de victoire avec du hasard. Si on touche, la victoire est certaine |
| 4   | Butin              | Une ressource nouvelle, qu'on n'obtient qu'en chassant                                                                           |

## Ce que le joueur vit

1. Sa cinquième expédition rentre. Une note : **« Votre cellule apprend à se diviser. »**
   Un nouvel emplacement apparaît sur la cellule : la **Pouponnière**.
2. Dans la Pouponnière, il fait naître des **cellules filles**, de trois sortes.
3. Sur la goutte, des **proies** sont apparues parmi les lieux. Il en touche une : la fiche
   montre la proie, son point faible, et ses chances de victoire avec les cellules choisies.
4. Il envoie. Le groupe part comme un filament. Quand il atteint la proie, deux possibilités :
   - le joueur est là : la proie se débat quelques secondes, **il la touche, la chasse est gagnée** ;
   - il n'est pas là (ou ne touche pas) : le sort décide, selon les chances annoncées.
5. Le groupe revient avec des **protéines**, moins les cellules perdues.
6. Les protéines servent à provoquer une **nouvelle mutation** : la chasse est le chemin de
   l'évolution de la créature.

## Règles

### Les trois cellules filles

| Cellule   | Idée        | Forte contre          |
| --------- | ----------- | --------------------- |
| Chasseuse | Frappe fort | les proies molles     |
| Cuirassée | Encaisse    | les proies agressives |
| Rapide    | Rattrape    | les proies fuyantes   |

- Chaque cellule fille coûte du sucre (et un peu de briques) et met une vingtaine de secondes
  à naître. On peut en commander plusieurs : elles naissent à la suite.
- La Pouponnière fixe le nombre maximal de cellules filles (10 au départ, plus à chaque niveau).
- Une cellule du bon type contre la bonne proie **compte double**.

### Les proies

- Trois sortes, une par point faible : **molle**, **agressive**, **fuyante**.
- Elles apparaissent sur la goutte comme les lieux : proches, moyennes, lointaines. Plus c'est
  loin, plus la proie est grosse et plus elle rapporte.
- Comme les lieux, une proie chassée met un moment à revenir _pour vous_.
- Une chasse coûte de l'énergie, comme une expédition.
- On peut avoir **une chasse et une expédition en même temps**, pas deux chasses.

### L'issue

- La **force** du groupe = somme des cellules, celles du bon type comptant double.
- Les **chances** = force du groupe comparée à celle de la proie. À force égale : une chance
  sur deux. La fiche affiche le pourcentage avant l'envoi.
- **Le petit combat.** Quand le groupe arrive sur la proie, une fenêtre de quelques secondes
  s'ouvre. Si le joueur touche la proie pendant cette fenêtre, la victoire est certaine.
  Sinon, le serveur tire au sort selon les chances.
- **Victoire** : protéines selon la taille de la proie, et quelques cellules perdues (d'autant
  moins que le groupe était fort).
- **Défaite** : pas de protéines, et davantage de cellules perdues. Jamais toutes : les
  survivantes rentrent.
- Une chasse peut être rappelée avant d'atteindre la proie, comme une expédition.

### Les protéines

- Troisième ressource, avec son compteur. Elle se garde dans la Réserve comme les autres.
- Elle paie une **nouvelle mutation** : contre un prix en protéines qui monte à chaque fois,
  le joueur reçoit un nouveau choix parmi trois.
- La première chasse gagnée compte pour l'ouverture du palier 5 (rivaux), au jour 2 de la saison.

## Trois points à confirmer

1. **« Si on touche, on est certain » — sans condition ?** Tel quel, une seule cellule fille
   envoyée contre la plus grosse proie gagne à coup sûr, pourvu qu'on soit là pour toucher. Je
   propose une borne : le toucher garantit la victoire **si les chances annoncées sont d'au
   moins 1 sur 4**. En dessous, toucher double les chances mais ne les rend pas certaines.
2. **Triche possible.** Le toucher est envoyé par l'appareil du joueur. Le serveur vérifie qu'il
   arrive bien pendant la fenêtre, une seule fois par chasse, mais un joueur outillé pourrait
   l'automatiser. Contre des proies neutres, le tort est limité. Pour les combats entre joueurs
   (palier 5), je recommande de **ne pas** reprendre la victoire certaine.
3. **Être présent au bon moment.** Une chasse lointaine dure 10 minutes : la fenêtre s'ouvre à
   la cinquième. Le jeu affichera un compte à rebours ; une alerte sur le téléphone viendra
   avec l'installation de l'application (pas dans ce palier).

## Chiffres de départ (à régler par les robots)

| Élément            | Valeur de départ                                               |
| ------------------ | -------------------------------------------------------------- |
| Pouponnière        | 200 sucres, 60 briques, 2 minutes ; 10 cellules, +5 par niveau |
| Chasseuse          | 30 sucres, 20 s                                                |
| Cuirassée          | 20 sucres + 10 briques, 20 s                                   |
| Rapide             | 25 sucres + 5 briques, 20 s                                    |
| Proie proche       | force 6, 5 protéines, 1 minute, 1 énergie                      |
| Proie moyenne      | force 15, 15 protéines, 3 minutes, 2 énergies                  |
| Proie lointaine    | force 35, 40 protéines, 10 minutes, 3 énergies                 |
| Fenêtre du toucher | 8 secondes                                                     |
| Mutation suivante  | 20 protéines, puis 50, puis 100                                |

## Cibles d'équilibrage (deviendront des tests)

- Première chasse envoyée **moins de 5 minutes** après l'ouverture du palier 4.
- Première chasse gagnée dans la **première session** pour un joueur appliqué.
- Deuxième mutation atteignable **le premier jour** pour un joueur qui revient deux ou trois fois.
- Un joueur qui ne touche jamais (il laisse le sort décider) progresse quand même, environ
  deux fois moins vite.
- Aucune défaite ne ramène un joueur à zéro cellule fille.

## Hors de ce palier

Coffres, quêtes du jour, autres joueurs, alerte sur téléphone, troupes spécialisées
supplémentaires, proies qui se déplacent.

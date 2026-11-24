# Journal d'équilibrage

Une entrée par changement : intention, changement, mesure avant, mesure après.

## 2026-11-23 — Premiers chiffres des paliers 0 à 2

**Intention :** palier 1 au premier toucher ; palier 2 en quelques minutes pour un joueur
appliqué, moins d'un quart d'heure pour un joueur qui ne touche presque pas.

**Changement :** valeurs de départ dans `packages/data/src/balance.ts` (toucher 1 sucre,
centrale 10 sucres / 5 s, réserve 60 / 45 s, cils 150 / 90 s, fabrique 120 / 60 s).

**Mesure avant :** aucune (première version).

**Mesure après :** pas encore mesuré. Les robots joueurs (phase 6 du plan) donneront les temps
réels ; ces chiffres sont une estimation à la main.

## 2026-11-23 — Première mesure par les robots

**Intention :** inchangée.

**Changement :** aucun chiffre modifié ; ajout des robots joueurs et des cibles en tests
(`packages/bots/src/cibles.test.ts`).

**Mesure (graine 1) :**

| Robot    | Palier 1 | Palier 2 et mutation | Plus longue attente sans rien à faire |
| -------- | -------- | -------------------- | ------------------------------------- |
| appliqué | 0 s      | 2 min 57             | 32 s                                  |
| débutant | 0 s      | 4 min 16             | 0 s                                   |
| absent   | 0 s      | au retour, 8 h après | 15 s                                  |

**Lecture :** la conception supposait 10 à 15 minutes pour le palier 2. La mesure donne 3 à
4 minutes. On garde les chiffres : une première récompense forte en moins de 5 minutes sert
mieux l'entrée dans le jeu. Cibles retenues : appliqué 2 à 6 min, débutant moins de 10 min.

## 2026-11-23 — Le palier 1 s'ouvre au dixième toucher

**Intention :** laisser le joueur sentir le geste de base avant de lui montrer autre chose,
et faire coïncider l'arrivée des emplacements avec le moment où il peut payer la centrale.

**Changement :** condition du palier 1 passée de 1 à 10 récoltes.

**Mesure avant :** palier 1 au premier toucher ; la note de déblocage coupait le tout premier geste.

**Mesure après :** palier 1 en 4 s (appliqué) à 10 s (débutant) ; cible « moins de 15 s ».

## 2026-11-23 — Palier 3 : premiers chiffres de la carte

**Ce qui est posé.** Énergie : 10 points, 1 point toutes les 20 minutes. Trois bandes de
distance : 30 s / 3 min / 10 min, pour 1 / 2 / 3 points d'énergie. Butin : 60 / 150 / 400
sucres ou 20 / 50 / 120 briques. Un lieu se regarnit en 2 / 10 / 30 minutes.

**Mesure avec les chiffres de la conception** (lieux surtout en sucre, le plus proche en
sucre) : la réserve est déjà pleine de sucre quand le filament revient, parce que toucher la
cellule en rapporte beaucoup. Sur 5 expéditions, 240 à 390 unités de butin perdues, soit la
plus grande partie.

**Changements.**

- Le lieu le plus proche donne des **briques** (c'est ce qui manque à ce stade), et un lieu sur
  deux environ donne des briques au lieu d'un sur trois. Un amas de sucre reste toujours visible.
- Briques des bandes moyenne et lointaine ramenées à 50 et 120 : 120 tient dans la réserve de
  base (100) dès la première amélioration de la Réserve.
- La fiche d'un lieu prévient quand le butin ne tiendra pas dans la réserve.

**Mesure après** (8 graines, 5 expéditions revenues) :

| Robot                                     | Première expédition       | 5 expéditions       | Butin perdu           |
| ----------------------------------------- | ------------------------- | ------------------- | --------------------- |
| Appliqué, soigneux                        | à l'ouverture de la carte | 5 à 15 min de carte | presque rien          |
| Débutant, envoie sans regarder la réserve | à l'ouverture de la carte | environ 5 min       | la plus grande partie |

**Reste à surveiller.** Le débutant perd encore l'essentiel de son butin en sucre : toucher la
cellule remplit la réserve trop vite par rapport à ce qu'elle contient. L'avertissement dans la
fiche aide, mais la vraie réponse est sans doute de rendre le toucher moins rentable une fois la
carte ouverte, ou d'agrandir la réserve de base. À décider avec le propriétaire avant le palier 4.

## 2026-11-23 — Décision du propriétaire : la réserve se paie

La réserve de base n'est **pas** agrandie. Si le butin déborde, c'est au joueur d'améliorer la
Réserve, en payant : « c'est comme ça que ça fonctionne ». Aucun chiffre ne change.

Ce qui change, c'est que le jeu le dit :

- la fiche d'un lieu prévient avant l'envoi et nomme la solution (« Améliorez la Réserve ») ;
- au retour, si du butin est perdu, une étiquette annonce combien et pourquoi.

Repère : passer la Réserve au niveau 2 coûte 96 sucres et 30 briques, soit deux expéditions
proches ; elle passe alors de 200 à 320 places.

## 2026-11-24 — Palier 4 : premiers chiffres des troupes et de la chasse

**Ce qui est posé.** Pouponnière : 10 cellules filles, +5 par niveau. Cellules : chasseuse
30 sucres ; cuirassée 20 sucres + 10 briques ; rapide 25 sucres + 5 briques ; 20 secondes
chacune. Proies : force 6 / 15 / 35, pour 5 / 15 / 40 protéines, en 1 / 3 / 10 minutes et
1 / 2 / 3 points d'énergie. Fenêtre du toucher : 8 secondes. Mutations suivantes : 20, 50,
puis 100 protéines.

**Mesure avec les chiffres de la conception** (Pouponnière à 200 sucres, 60 briques, 2 minutes) :
le palier 4 s'ouvre au retour de la cinquième expédition, c'est-à-dire quand l'énergie est
presque vide. Le robot appliqué attendait 15 à 20 minutes avant de pouvoir envoyer sa première
chasse : la nouveauté s'ouvrait sans qu'on puisse y toucher.

**Changements.**

- **Chaque nouveau palier remplit la jauge d'énergie.** C'est une règle nouvelle, pas un chiffre :
  elle vaut pour tous les paliers à venir.
- Pouponnière ramenée à 150 sucres, 40 briques, 90 secondes.

**Mesure après** (8 graines) :

| Robot                             | Première chasse                    | Première victoire                          | Deuxième mutation |
| --------------------------------- | ---------------------------------- | ------------------------------------------ | ----------------- |
| Appliqué, touche la proie         | 3 min 30 à 5 min après l'ouverture | environ 1 minute plus tard, aucune défaite | 30 min à 1 h 20   |
| Débutant, ne touche jamais        | 3 à 6 min                          | parfois après une ou deux défaites         | 20 min à 1 h 30   |
| Absent (2 minutes toutes les 8 h) | le deuxième jour                   | le deuxième jour                           | pas en 48 h       |

Aucune chasse n'a laissé un robot sans cellule fille (minimum observé : 5).

**Reste à surveiller.**

- Une fois l'énergie vide, il ne reste qu'à attendre (jusqu'à 19 minutes mesurées pour le robot
  appliqué). C'est la fin naturelle d'une session, voulue par la conception, mais rien ne le
  dit au joueur : il faudra un mot à l'écran (« revenez dans 20 minutes »).
- Le joueur qui ne passe que deux minutes toutes les 8 heures avance très lentement. Ce n'est
  sans doute pas un vrai profil ; à revoir avec des données de vrais joueurs.
- Débutant et appliqué atteignent la deuxième mutation en des temps voisins : le toucher évite
  les défaites, mais ne fait pas gagner beaucoup de temps. À surveiller si l'on veut que la
  présence soit mieux récompensée.

## 2026-11-24 — Chasse sans toucher, quêtes du jour et coffres

**Chasse sans toucher (décision du propriétaire : « un peu plus de défaites, mais marginal »).**
Laisser le sort décider coûte 10 points de chance (50 % annoncés deviennent 40 %). La fiche de la
proie affiche ce chiffre-là, puisque c'est celui qui vaut si on ne fait rien.

**Quêtes du jour.** Trois quêtes et un défi par jour de saison, tirés au hasard d'après la graine
du joueur et le jour : différents pour chacun, sans rotation, jamais ceux de la veille. Douze
quêtes ordinaires et cinq défis au départ ; l'objectif chiffré est lui aussi tiré dans une
fourchette. Une quête impossible ce jour-là (Réserve au maximum, plus de mutation à prendre)
n'est jamais proposée.

**Coffres.** Quête ordinaire : une récompense parmi 80 sucres, 40 briques, 6 protéines ou
2 points d'énergie. Défi : deux récompenses parmi 200 sucres, 100 briques, 15 protéines ou
4 points d'énergie. Un coffre est un cadeau : son contenu entre même réserve pleine. Un coffre
gagné mais pas ouvert s'ouvre tout seul à minuit.

**Mesure** (8 graines, 6 premières heures) : le robot appliqué ouvre au moins deux coffres, le
débutant au moins un, et le défi n'est pas réussi par tous les débutants.

**À faire quand les rivaux existeront (palier 5).** Ajouter des défis contre d'autres joueurs à
la même liste : c'est prévu par la structure, il suffit d'une ligne par défi.

**Reste à surveiller.** 6 protéines par coffre ordinaire, c'est un tiers de la première mutation
payante : à vérifier que les coffres ne remplacent pas la chasse.

## 2026-11-24 — Palier 5 : premiers chiffres des rivaux

**Décidé par l'agent en l'absence du propriétaire** (voir la conception du palier 5). Tout est à relire.

**Ce qui est posé.** Six voisins simulés par joueur. Garde d'un rival moyen : 8 le premier jour,
+4 par jour de saison ; force d'attaque : 5, +3 par jour ; butin : 120 sucres (+40 par jour),
60 briques (+20), 6 protéines (+2). Chaque rival vaut entre 70 % et 130 % de ces valeurs.
Attaquer : 2 points d'énergie, 4 ou 8 minutes aller-retour, toucher ajoute 15 points de chance,
chaque survivante rapporte l'équivalent de 40 sucres, le rival se referme 6 heures.
Espionner : 1 point d'énergie, valable 2 heures. Paroi : 180 sucres, 80 briques, 2 minutes,
+4 de défense par niveau. Attaques subies : protection de 12 heures à l'arrivée, puis une
attaque toutes les 5 à 11 heures ; une attaque qui passe prend 20 % du sucre et des briques
et 20 % des cellules à la maison, puis protège 8 heures.

**Règle corrigée au passage.** Un palier soumis à un jour de saison s'ouvre désormais à minuit
pile, pas « au retour du joueur » : c'était un défaut, révélé par les tests du palier 5.

**Mesure** (robots, trois jours de jeu) :

| Robot    | Palier 5                   | Première attaque | Attaques gagnées / perdues en 48 h | Attaques subies : repoussées / passées |
| -------- | -------------------------- | ---------------- | ---------------------------------- | -------------------------------------- |
| Appliqué | première seconde du jour 2 | aussitôt         | 1 à 3 / 0 à 1                      | 1 à 2 / 1 à 2                          |
| Débutant | première seconde du jour 2 | aussitôt         | 1 à 2 / 0 à 2                      | 1 à 2 / 1 à 2                          |

**Reste à surveiller.**

- Les robots attaquent peu (une à trois fois en deux jours) : leurs cellules sont presque
  toujours en chasse, et un rival pillé se referme six heures. À voir avec de vrais joueurs
  si les rivaux pèsent assez dans une journée.
- Les protéines s'accumulent vite (plus de 1 000 en trois jours pour un robot qui chasse sans
  arrêt) alors que les six mutations coûtent 370 au total. Il manque une dépense de fin de
  parcours pour les protéines.
- La garde des rivaux grandit de 4 par jour : au jour 20, un rival moyen a une garde de 84,
  hors de portée d'une Pouponnière de niveau 5 (30 cellules, 60 de force au mieux). C'est
  voulu comme plafond provisoire, mais il faudra des troupes plus fortes ou des alliés avant.

## 2026-11-24 — Les rivaux, revus pour le pillage (décisions du propriétaire)

Le propriétaire veut que le jeu soit aimé pour ses combats entre joueurs. Les règles changent :

| Réglage                            | Avant                        | Après                                              |
| ---------------------------------- | ---------------------------- | -------------------------------------------------- |
| Garde d'un rival                   | 8 + 4 par jour               | 6 + 2 par jour                                     |
| Attaque d'un rival                 | 5 + 3 par jour               | 4 + 2 par jour                                     |
| Butin en sucre d'un rival          | 120 + 40 par jour            | 150 + 60 par jour                                  |
| Butin en briques                   | 60 + 20 par jour             | 80 + 30 par jour                                   |
| Protéines d'un rival               | 6 + 2 (tout)                 | 40 + 15 de réserve, dont 20 % au plus à prendre    |
| Charge d'une cellule               | 40                           | 50                                                 |
| Rival fermé après un pillage       | 6 h                          | 2 h                                                |
| Protection après une attaque subie | 8 h                          | 1 h                                                |
| Ce que prend une attaque subie     | 20 % du sucre et des briques | tout ce que les survivantes de l'attaquant portent |
| Protéines volées chez le joueur    | jamais                       | en dernier, 20 % au plus                           |
| Attaquer quand on est protégé      | sans effet                   | fait tomber la protection                          |
| Mode absent                        | n'existait pas               | 3 jours de protection, puis 1 jour d'attente       |

Au jour 27, un rival moyen a 58 de garde (41 à 75 selon son tempérament) : trente cellules du
bon type en valent 60. Avant, il en avait 112.

Mesure (robot appliqué, 3 jours, graine 1) : 3 attaques envoyées avant, 74 après (54 gagnées,
20 perdues), une fois que le robot garde 2 points d'énergie pour attaquer.

Le toucher devient une bulle de protéines : deux bulles par combat, visibles 1,8 seconde
chacune, qui filent du centre vers le bord de l'écran. En attraper une ajoute 15 points de chance.

Reste à régler : la réserve plafonne le butin (le robot perd encore une part de ce qu'il
rapporte), donc piller ne rend pas encore plus riche que produire.

Ajout du même jour : bouclier de nuit de 8 heures par jour (heure choisie par le joueur,
modifiable une fois par 24 heures). Un joueur est donc exposé au plus 16 heures par jour.

Ajout du même jour : la protection de 12 heures à l'arrivée est remplacée par une protection
du nouveau joueur jusqu'au palier 6, perdue à sa première attaque envoyée.

## 2026-11-24 — Palier 6 : premiers chiffres de la grande carte

| Réglage                         | Valeur                                    |
| ------------------------------- | ----------------------------------------- |
| Portée                          | 3 cases dans chaque direction (48 cibles) |
| Durée                           | 4 minutes d'aller-retour par pas          |
| Supplément de butin             | +15 % par pas au-delà de deux             |
| Fin de la protection du nouveau | à l'entrée au palier 6                    |

Le classement, les ligues et la Gazette passent au palier 7 (5 combats contre des rivaux,
jour 4). À surveiller : avec 48 cibles, le joueur trouve toujours un organisme faible ; il
faudra peut-être que les plus riches soient aussi les mieux gardés.

## 2026-11-24 — Palier 6 refait : l'océan

La carte en grille (portée 3 cases, +15 % de butin par pas) est retirée. Premiers chiffres de
l'océan :

| Réglage                   | Valeur                                                   |
| ------------------------- | -------------------------------------------------------- |
| Rayon du monde            | 124 cases ; terre ferme : 20 cases                       |
| Ouverture des zones       | jours 1, 6, 12, 18                                       |
| Places par zone           | 500, 450, 380, 300                                       |
| Richesse par zone         | 100 %, 140 %, 190 %, 250 %                               |
| Garde des rivaux par zone | 100 %, 130 %, 170 %, 220 %                               |
| Chargement (abysses)      | 300 sucres, 100 briques ou 20 protéines, pour 2 énergies |
| Gisement neuf             | 12 chargements, vidé par les autres en 3 à 8 heures      |
| Trajet vers un gisement   | 12 s par case, aller simple ; 1 minute au moins          |
| Trajet d'attaque          | 4 minutes par tranche de 8 cases                         |
| Remonter                  | 300/150/40, puis 450/300/90, puis 600/450/160            |

À surveiller : la garde des rivaux près de la surface dépasse ce que 35 cellules de rang 1
peuvent battre. C'est voulu : les troupes de rang supérieur arrivent aux paliers suivants.

## 2026-11-24 — Palier 7 : premiers chiffres

| Réglage                         | Valeur                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Condition                       | 3 combats contre des rivaux (au lieu de 5), jour 4                           |
| Puissance                       | 20 par niveau d'organite, 30 par mutation, 100 par zone, 8 par cellule fille |
| Puissance d'un organisme simulé | (150 + 60 par jour) × tempérament, +15 % par zone                            |
| Ligues                          | 1 %, 5 %, 15 %, 35 %, 65 %, le reste                                         |
| Récompense de minuit            | 100/50/10 × 300 %, 200 %, 150 %, 110 %, 80 %, 50 %                           |
| Prédateurs (abysses)            | force 12, 25, 45 pour 20, 45, 90 protéines                                   |

Mesure à l'écran, jour 7, une cellule de 10 niveaux d'organites et 20 cellules filles :
puissance 410 avec 5 par cellule fille, rang 435 sur 500, et 496 sur 500 au classement des
troupes. Passé à 8 par cellule fille pour que les troupes pèsent. À reprendre après une
saison jouée par les robots.

## 2026-11-24 — Entretien des troupes, fin du plafond

| Réglage                   | Avant                              | Après                                                              |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Nombre de cellules filles | 10 au niveau 1, +5 par niveau (35) | sans plafond                                                       |
| Effet du Centrosome       | place pour les cellules filles     | naissances 25 % plus rapides par niveau                            |
| Entretien                 | aucun                              | 0,015 sucre par seconde et par cellule                             |
| Famine                    | —                                  | réserve vide : 10 % des cellules à la maison meurent chaque minute |

Mesure à l'écran : 50 cellules filles avec une Centrale de niveau 1 donnent −0,2 sucre par
seconde, et une puissance de 900 qui place le joueur premier du classement au jour 7. Les
organismes simulés sont donc trop faibles face à une armée sans plafond : à reprendre.

## 2026-11-24 — Forces relevées après la fin du plafond

Une Centrale nourrit 33 cellules filles par niveau, soit 166 au niveau 5. Les forces étaient
réglées pour 35 au plus.

| Réglage                     | Avant             | Après             |
| --------------------------- | ----------------- | ----------------- |
| Garde d'un rival moyen      | 6 + 2 par jour    | 12 + 7 par jour   |
| Attaque d'un rival moyen    | 4 + 2 par jour    | 8 + 5 par jour    |
| Proies (force)              | 6, 15, 35         | 6, 25, 70         |
| Proies (protéines)          | 5, 15, 40         | 5, 25, 70         |
| Prédateurs (force, abysses) | 12, 25, 45        | 30, 80, 180       |
| Prédateurs (protéines)      | 20, 45, 90        | 30, 90, 220       |
| Puissance par cellule fille | 8                 | 5                 |
| Puissance d'un organisme    | 150 + 60 par jour | 200 + 60 par jour |

Ce que cela donne, garde d'un rival moyen des abysses : 19 au jour 2, 54 au jour 7, 131 au
jour 18, 194 au jour 27 ; multipliée par 1,3 à 2,2 en remontant. Vérifié par test : 35
cellules ne battent plus un rival moyen du jour 7 une fois sur deux ; 20 cellules du bon type
suffisent le jour de l'ouverture ; une armée de 166 garde plus d'une chance sur deux au
jour 18 dans les abysses, et entre 25 et 50 % contre un rival moyen de la zone éclairée au
dernier jour. La première proie n'a pas changé : le débutant gagne toujours sa première
chasse. Le butin des rivaux n'a pas été relevé : la réserve ne pourrait pas le contenir.

## 2026-11-24 — Palier 8 : premiers chiffres

| Réglage                       | Valeur                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cellule de rang 2             | 2 gènes de sa famille ; entretien double ; 50 à 60 s                                                             |
| Venimeuse                     | attaque 4 ; 90 sucres, 30 briques, 4 protéines                                                                   |
| Gardienne                     | attaque 2, défense 5 ; 60 sucres, 60 briques, 4 protéines                                                        |
| Éclaireuse                    | attaque 3, charge 2 ; 80 sucres, 30 briques, 4 protéines                                                         |
| Porteuse                      | défense 2, charge 6 ; 70 sucres, 50 briques, 2 protéines                                                         |
| Lignée                        | 3 gènes : +20 % sucre, +20 % attaque, −25 % trajets, +30 % défense                                               |
| Nouveaux gènes                | +25 % protéines de chasse, +30 % charge, −25 % temps de naissance, −20 % trajets, +25 % défense, −15 % entretien |
| Puissance d'une cellule fille | 5 × la moyenne de son attaque et de sa défense                                                                   |

À entretien égal (une Centrale de niveau 5 nourrit 166 parts), 83 venimeuses frappent pour
332 là où 166 cellules de rang 1 frappent pour 166 : la force des armées double au palier 8.
Les rivaux n'ont pas été relevés pour autant ; à surveiller.

## 2026-11-24 — Ouvertures à date fixe, organites, évolutions

| Réglage                   | Avant                                | Après                                                         |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Palier 6                  | 1 combat contre un rival, jour 3     | jour 3                                                        |
| Palier 7                  | 3 combats contre des rivaux, jour 4  | jour 4                                                        |
| Palier 8                  | première récompense de ligue, jour 5 | jour 5                                                        |
| Golgi, Noyau, Lysosome    | —                                    | 160 à 200 sucres, 100 à 120 briques                           |
| Évolution, niveau 1       | —                                    | 120 à 150 sucres, 80 à 120 briques, 15 à 25 protéines, 10 min |
| Évolution, niveau suivant | —                                    | coût × 1,3 ; durée × 1,8                                      |
| Tirage de saison          | —                                    | 1 dormante et 1 favorisée (× 1,5) par branche                 |
| Puissance                 | —                                    | 15 par niveau d'évolution                                     |

Vérifié par test : le dernier niveau d'une évolution reste payable avec une Vacuole au maximum.
Tout exprimer (9 évolutions, 5 niveaux) demande environ 31 heures de Noyau au niveau 1, moins
avec un Noyau plus haut : c'est un objectif de saison, pas d'une journée.

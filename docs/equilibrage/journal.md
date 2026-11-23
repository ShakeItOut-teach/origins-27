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

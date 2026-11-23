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

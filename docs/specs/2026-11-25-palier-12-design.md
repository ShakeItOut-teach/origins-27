# Palier 12 (jour 21) : la course à l'APEX — conception

Date : 2026-11-25 · État : **demandé par le propriétaire** (« Oui, palier 12 »). Reprend la
fin de l'ancien jeu (`js/03-regles.js` : « Sortie des eaux » ; `js/16-apex.js` : les lignées ;
`js/27-saison.js` : le Muséum).

## Ce qui s'ouvre au jour 21

- **La sortie des eaux.** Depuis la zone éclairée, avec un Noyau de niveau 15, la lignée du
  joueur peut quitter l'océan : 20 000 ATP, 15 000 lipides, 1 200 protéines, et un jour entier.
  Aucune forme aquatique ne gagne : c'est le but de la saison.
- **Une course.** Les organismes simulés sortent des eaux à partir du jour 22, quarante par
  jour, les plus ambitieux d'abord. À l'arrivée, la place du joueur est fixée, et un coffre
  l'attend :

  | Place    | Accélérateurs | ATP    | Lipides | Protéines |
  | -------- | ------------- | ------ | ------- | --------- |
  | 1        | 20            | 20 000 | 15 000  | 3 000     |
  | 2 à 10   | 12            | 12 000 | 9 000   | 1 800     |
  | 11 à 50  | 6             | 6 000  | 4 500   | 900       |
  | 51 à 150 | 3             | 3 000  | 2 000   | 400       |
  | au-delà  | 1             | 1 000  | 700     | 150       |

- **Neuf lignées de la terre ferme**, celles de l'ancien jeu. La famille de gènes la plus
  travaillée donne la branche, la seconde la nuance : Prédation donne le Tyrannosaure (ou le
  Dromaéosaure avec de la Mobilité), Résilience l'Ankylosaure (Tricératops, Stégosaure),
  Mobilité le Ptérosaure (Oiseau primitif), Métabolisme le Brachiosaure (Parasaurolophe).
- **Niveaux 16 à 20** pour les organites, et **cellules filles de rang 5** avec la lignée :
  Euryptéride (attaque × 45), Trilobite (défense × 55), Conodonte (attaque × 32, butin × 25),
  Nautiloïde (butin × 70).
- **Le Muséum.** La planche de l'espèce : nom latin, rang, ligue, cousin fossile, lignée
  sortie des eaux et sa place, crise traversée (« Survivant »). À la fin de la saison, elle
  entre au Muséum, gardé sur l'appareil comme dans l'ancien jeu.

## Réglage fait en même temps

Les organismes simulés grandissent plus vite à partir du jour 13 (700 de puissance de plus par
jour) : sans cela, un bon joueur redevenait premier du serveur dès le jour 15.

## Mesure (trois saisons au rythme humain, dix connexions par jour)

| Jour | Puissance | Rang (sur 500) | Niveaux d'organites | Cellules filles | Connexions sans rien à lancer |
| ---- | --------- | -------------- | ------------------- | --------------- | ----------------------------- |
| 9    | 2 752     | 52             | 44                  | 78              | 0 (10 faute de ressources)    |
| 13   | 2 815     | 298            | 54                  | 36              | 0                             |
| 17   | 8 835     | 122            | 89                  | 122             | 0                             |
| 19   | 14 715    | 1              | 102                 | 214             | 0                             |
| 21   | 17 112    | 29             | 108                 | 200             | 0                             |
| 25   | 19 437    | 165            | 113                 | 167             | 0                             |
| 27   | 19 477    | 228            | 115                 | 167             | 0                             |

- **Plus aucun jour vide** du jour 12 au jour 27 : il y a toujours un chantier à lancer.
- **Le classement bouge** : le même joueur passe de la 298e à la 1re place, puis redescend.
- **Les trois joueurs sortent des eaux au jour 22**, parmi les premiers.
- **Il reste le creux du jour 9** (dix connexions sans pouvoir rien payer) et un joueur encore
  premier au jour 5.

## Limites connues

- Les lignées n'ont pas de dessin : seulement un nom et une phrase.
- Sortir des eaux ne change rien d'autre : pas de jeu sur la terre ferme, pas de lignée
  d'alliance qui « règne » comme l'annonçait l'ancien jeu.
- Le Muséum est gardé sur l'appareil, pas sur le serveur.
- Chiffres jamais joués par de vrais joueurs.

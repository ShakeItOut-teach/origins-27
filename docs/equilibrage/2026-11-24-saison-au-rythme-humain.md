# Une saison au rythme humain : mesure et conclusion

Date : 2026-11-24 · Demandé par le propriétaire : « tester au rythme humain ce que serait le
serveur s'il jouait avec dix connexions par jour, pillages moyens et assez bonne compréhension
du jeu », puis conclure sur l'équilibrage par rapport aux dates.

## Le joueur simulé

`packages/bots/src/human.ts`, profil `HUMAN_TEN_A_DAY` : dix connexions de cinq minutes par
jour, réparties de 7 h à 23 h (quinze minutes le premier jour), deux pillages par jour au plus.
Il construit ce qui produit d'abord, agrandit la Vacuole quand un coût dépasse la réserve,
exprime l'évolution favorisée de la saison, nourrit autant de cellules filles que 85 % de sa
production le permet, remonte dès qu'une zone s'ouvre, donne à son alliance avec ce qui déborde,
ouvre ses coffres. Trois saisons, graines 7, 11 et 23, places 4, 120 et 333.

Limite : il joue seul contre des organismes simulés. Il ne mesure pas ce que de vrais joueurs
se feraient entre eux.

## Ce que l'on mesure (graine 7 ; les deux autres donnent la même forme)

| Jour | Ouverture du jour       | Puissance | Rang | Niveaux d'organites | Organites finis | Niveaux d'évolution | Cellules filles | Connexions sans rien à lancer |
| ---- | ----------------------- | --------- | ---- | ------------------- | --------------- | ------------------- | --------------- | ----------------------------- |
| 1    | paliers 0 à 4           | 1 410     | —    | 22                  | 2               | 0                   | 170             | 0                             |
| 3    | océan                   | 1 555     | —    | 31                  | 3               | 0                   | 151             | 0 (8 faute de ressources)     |
| 5    | gènes, compagnon        | 1 925     | 1    | 41                  | 5               | 18                  | 55              | 0                             |
| 7    |                         | 2 237     | 1    | 42                  | 6               | 32                  | 46              | 0                             |
| 9    | événements, alliances   | 3 712     | 1    | 44                  | 8               | 36                  | 148             | 0 (10 faute de ressources)    |
| 11   |                         | 3 800     | 1    | 44                  | 8               | 36                  | 155             | 0 (10 faute de ressources)    |
| 13   | zone crépusculaire (12) | 3 342     | 1    | 45                  | 9 sur 9         | 45 (maximum)        | 98              | **10 sur 10**                 |
| 18   | zone éclairée           | 4 117     | 1    | 45                  | 9               | 45                  | 152             | 10 sur 10                     |
| 27   | fin de saison           | 3 317     | 3    | 45                  | 9               | 45                  | 88              | 10 sur 10                     |

Étapes (jour atteint, sur les trois saisons) :

| Étape                                    | Jour                                        |
| ---------------------------------------- | ------------------------------------------- |
| Premier organite au niveau maximum       | 1                                           |
| Première cellule fille de rang 2         | 5                                           |
| Compagnon apprivoisé, puis adulte        | 5, 6 à 8                                    |
| Officier d'alliance                      | 9                                           |
| Tous les organites au niveau maximum     | 11 à 13                                     |
| Toutes les évolutions au niveau maximum  | 12 à 13                                     |
| Zones de minuit, crépusculaire, éclairée | 6 à 8, 12, 18 (le jour même de l'ouverture) |
| Premier Léviathan vaincu                 | jamais                                      |

## Conclusion

1. **Le jeu est fini au jour 13.** Organites et évolutions sont tous au maximum entre le jour 11
   et le jour 13. Ensuite, dix connexions sur dix n'ont plus rien à lancer, pendant quatorze
   jours. Les ouvertures des jours 12 et 18 (zones) n'apportent qu'un déménagement.
2. **L'armée est faite le premier jour.** 170 cellules filles dès le jour 1, 170 à 180 au jour
   27 : le plafond est la production d'ATP, et la Mitochondrie est au maximum le premier jour.
   Rien, dans la saison, ne fait grandir l'armée ensuite, sauf le rang 2 au jour 5.
3. **Le joueur est premier du serveur du jour 4 au jour 27.** Les organismes simulés partent de
   200 de puissance et gagnent 60 par jour ; un joueur appliqué en a 1 400 dès le premier soir.
   Les classements, les ligues et le concours n'ont donc pas d'enjeu.
4. **Les jours 8 à 11 sont un creux.** Dix connexions sur dix se terminent sans rien pouvoir
   payer : les dernières évolutions coûtent plus que la réserve ne laisse accumuler entre deux
   connexions.
5. **Les dates sont le seul verrou de la remontée.** Le joueur remonte le jour même de chaque
   ouverture : le prix du déménagement ne retient personne.
6. **Les accélérateurs s'entassent.** 11 à 21 en réserve à la fin : il n'y a plus de chantier
   assez long pour les dépenser. Même constat pour les coffres de concours.
7. **Le Léviathan est hors de portée.** Aucune des trois saisons n'en vient à bout : il lui
   faudrait une armée que la production ne peut pas nourrir.
8. **Ce qui marche.** Aucune famine ; deux pillages gagnés par jour ; une attaque subie tous
   les trois jours ; alliance presque au maximum en fin de saison (44 sur 46) : son rythme,
   lui, tient les 27 jours.

## Ce qu'il faut changer

| Problème                       | Remède proposé                                                                                               | Où              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------- |
| Cellule finie au jour 13       | Des niveaux au-delà de 5, ouverts par paliers (10 au jour 13, 15 au jour 17, 20 au jour 21), bien plus longs | palier 10       |
| Armée faite au jour 1          | Cellules filles de rang 3, 4 et 5 ; la Mitochondrie de haut niveau nourrit plus                              | paliers 10 à 12 |
| Premier du serveur sans effort | Organismes simulés bien plus forts : un joueur appliqué doit viser le premier quart, pas la première place   | palier 10       |
| Accélérateurs sans usage       | Réglé par les niveaux longs                                                                                  | palier 10       |
| Creux des jours 8 à 11         | Réserve plus grande aux hauts niveaux de Vacuole                                                             | palier 10       |
| Léviathan imbattable           | À revoir une fois le rang 3 en place : sa force doit suivre l'armée que l'on peut nourrir                    | palier 10       |
| Jours 21 à 27 sans but         | Crise de saison, puis course à l'APEX                                                                        | paliers 11, 12  |

Pour rejouer la mesure : le test `packages/bots/src/human.test.ts` fait tourner la même saison.

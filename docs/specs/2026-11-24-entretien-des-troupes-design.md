# Entretien des troupes : conception

Date : 2026-11-24 · État : **demandé par le propriétaire** (« enlever la quantité de troupes max
dans le centrosome ; que les troupes consomment des ressources »), chiffres proposés par
l'agent et à régler en jouant.

## Pourquoi

Un plafond fixe (35 cellules filles au mieux) rendait tous les joueurs égaux. Sans plafond,
mais avec des troupes à nourrir, celui qui produit, récolte et pille le plus entretient la plus
grande armée. C'est le ressort des jeux du genre : l'armée grossit avec l'économie.

## Règles

- **Plus de plafond.** Dès que le Centrosome (la Pouponnière) est construit, on fait naître
  autant de cellules filles qu'on peut en payer, par 1 ou par 10.
- **Le Centrosome accélère les naissances** : 25 % plus vite par niveau au-delà du premier
  (20 s au niveau 1, 10 s au niveau 5).
- **Entretien** : chaque cellule fille vivante consomme 0,015 sucre (ATP) par seconde, à la
  maison comme en sortie. Celles qui ne sont pas encore nées ne mangent pas.
- **Ce que l'écran montre** : le compteur de sucre affiche le gain net, en rouge s'il est
  négatif ; le Centrosome affiche l'entretien et prévient quand on dépense plus qu'on ne
  produit.
- **Famine** : si la réserve de sucre est vide et que la production ne suffit pas, des
  cellules filles meurent par vagues, à chaque minute pleine : un dixième de celles qui sont à
  la maison (au moins une), jamais plus qu'il n'en faut pour que la production suffise. Les
  plus nombreuses meurent d'abord. Les cellules en sortie ne meurent pas en route.
- Une Centrale de niveau 1 nourrit 33 cellules filles ; au niveau 5, 166. Au-delà, il faut
  récolter et piller.

## Avec la même livraison

L'âge du serveur est affiché en haut de l'écran : « Jour 7 / 27 ».

## Limites connues

- Rivaux, proies et prédateurs ont été renforcés le jour même pour suivre les grandes armées
  (voir le journal d'équilibrage). Ces chiffres n'ont pas encore été joués sur une saison.
- La réserve de sucre est petite face à ce que mange une grande armée : en pratique, la
  taille d'une armée est fixée par la production, pas par le pillage. Pour que le pillage
  nourrisse une armée, il faudra de plus grandes réserves et de plus gros butins.
- Le butin d'une attaque reste limité par ce que le rival possède, pas par la charge.
- Un seul type de ressource est consommé : le sucre.

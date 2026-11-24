# Palier 5 — Les rivaux : conception

Date : 2026-11-24 · État : **décidé par l'agent en l'absence du propriétaire — à relire et corriger**

Le propriétaire a demandé d'avancer seul pendant la nuit. Chaque choix ci-dessous est donc
une proposition déjà construite, pas une décision validée. Tout est réglable.

## L'idée

Au palier 5, le joueur découvre qu'il n'est pas seul dans la goutte. Il a des **voisins**. Il
peut les espionner, les attaquer pour leur prendre des ressources, et il peut être attaqué.

## Le choix le plus important : des rivaux simulés

Les voisins du palier 5 sont des **organismes simulés**, pas d'autres joueurs.

- Pourquoi : le serveur compte aujourd'hui un ou deux vrais joueurs. La conception d'origine
  prévoit que des organismes simulés complètent le serveur jusqu'à 500.
- Ce que ça permet : tout se calcule dans la partie du joueur. Aucun risque qu'un joueur en
  abîme un autre, aucune triche entre joueurs possible.
- Ce que ça ne fait pas : **un vrai joueur ne peut pas encore attaquer un autre vrai joueur.**
  C'est un chantier à part côté serveur (deux parties modifiées d'un seul coup, protections
  contre l'acharnement), à cadrer avec le propriétaire.

Chaque rival a un nom, une couleur, un point faible et une force qui **grandit avec les jours
de la saison** : un voisin facile le jour 2 ne l'est plus le jour 10.

## Ce que le joueur vit

1. Sa première chasse est gagnée et la saison en est au moins à son deuxième jour. Une note :
   **« Vous n'êtes pas seul dans la goutte. »** Un troisième onglet apparaît : **Les rivaux**.
2. Il y voit six voisins. De chacun il connaît le nom et la distance ; le reste est flou.
3. **Espionner** (1 point d'énergie) révèle pendant deux heures la garde exacte du rival, son
   point faible et ce qu'il y a à prendre.
4. **Attaquer** : il choisit son groupe, comme pour une chasse. Le groupe part, arrive, se bat.
   Le joueur présent peut **toucher** pour aider ses cellules.
5. Victoire : le groupe rentre avec du sucre, des briques et quelques protéines.
6. Lui aussi est attaqué, de temps en temps. Ses cellules restées à la maison et sa **Paroi**
   (nouvel organite) le défendent. Après une attaque subie, il est **protégé** quelques heures.

## Règles

### Les voisins

- Six par joueur : les organismes des places voisines dans la spirale de la goutte.
- Garde, butin et force d'attaque suivent le jour de saison, avec un tempérament propre à
  chacun (certains plus forts, d'autres plus riches).
- Un rival pillé se **referme** six heures : on ne peut pas s'acharner sur le même.

### Espionner

- Coûte 1 point d'énergie, effet immédiat, valable deux heures.
- Sans espionnage, la fiche montre une fourchette (« garde : entre 10 et 20 ») et l'attaque
  reste possible, à l'aveugle.

### Attaquer

- Même mécanique que la chasse : groupe choisi, trajet, combat, retour. 2 points d'énergie.
- Les chances se calculent comme à la chasse ; la cellule du bon type compte double.
- **Toucher pendant le combat ajoute 15 points de chance. Il ne rend pas la victoire certaine**
  (c'est la différence avec la chasse, annoncée lors du palier 4).
- Le butin dépend du nombre de **survivantes** : chacune porte une charge limitée.
- Une attaque et une chasse ne partent pas en même temps : ce sont les mêmes cellules.
  (Une expédition, elle, reste possible en parallèle.)

### Être attaqué

- Un nouveau venu au palier 5 est **protégé 12 heures**.
- Ensuite, une attaque arrive toutes les 5 à 11 heures environ, d'un voisin tiré au sort.
- Défense = cellules filles à la maison + niveaux de la Paroi.
- Attaque repoussée : rien de perdu. Attaque subie : 20 % du sucre et des briques, et une
  partie des cellules à la maison. Les protéines ne sont jamais volées.
- Après une attaque subie, **protection de 8 heures**.
- Le résumé « Pendant votre absence » raconte les attaques.

### La Paroi

Sixième organite, palier 5. Chaque niveau ajoute de la défense. C'est la réponse du joueur qui
ne veut pas garder toutes ses cellules à la maison.

### Quêtes

Trois quêtes s'ajoutent à la liste : espionner un rival (ordinaire), gagner une attaque, et
gagner plusieurs attaques (défis, donc gros coffre) — ce que le propriétaire avait demandé.

## Choix faits sans le propriétaire, à contester

1. Rivaux simulés plutôt que vrais joueurs (voir plus haut).
2. Toucher = +15 points en attaque, pas la certitude.
3. Les protéines ne se volent pas (ni dans un sens ni dans l'autre pour le joueur attaqué).
4. Attaquer ne fait pas tomber sa propre protection.
5. Les rivaux sont une **liste**, pas des points sur la goutte : celle-ci porte déjà neuf boutons.
6. Le palier 5 reste soumis au **jour 2 de la saison**, comme écrit dans la table de déblocage.

## Hors de ce palier

Vrais joueurs contre vrais joueurs, classement, ligues, gazette, alliances, vengeance,
messages entre joueurs.

# Le Noyau, « hôtel de ville » de la cellule — conception

Date : 2026-11-26 · État : **demandé par le propriétaire** (« notre noyau […] devienne un peu
notre hôtel de ville […], cher à upgrader, qu'il augmente un peu toutes les stats et qu'il
bloque l'évolution des bâtiments », puis « Oui, construis »).

## Les règles

- **Le Noyau est là dès le départ, au niveau 1.** On le touche dès que la cellule a ses
  emplacements ; on le monte dès que les améliorations apparaissent (palier 2). Une partie
  d'avant reçoit son Noyau au niveau 1.
- **Il commande la cellule** : aucun organite ne monte plus haut que lui. Seule la Vacuole peut
  avoir un niveau d'avance (`BALANCE.nucleusRule.storageAhead`), sinon la réserve ne pourrait
  pas contenir le prix du Noyau suivant et le joueur serait bloqué. Un test vérifie, jusqu'au
  niveau 20, que la réserve contient toujours ce prix.
- **Un Noyau en chantier ou en file compte déjà** : on peut mettre derrière lui l'organite
  qu'il débloque.
- **Il donne un peu à tout** : +2 % par niveau au-delà du premier sur toutes les statistiques ;
  −2 % sur les durées, les coûts, l'entretien et les pertes (`statPercentPerLevel`).
- **Il coûte cher** : ses prix étaient déjà trois à sept fois ceux des premiers organites.
- **Les évolutions** qu'il exprime à partir du palier 7 ne changent pas.
- Un organite déjà plus haut que le Noyau dans une partie en cours garde son niveau ; il attend
  que le Noyau le rattrape.
- Aucun plafond daté (règle du propriétaire du 25/11/2026) : le Noyau s'achète.

## À l'écran

- La fiche du Noyau dit son rôle et son bonus (« +N % à tout »).
- Un organite bloqué ne montre ni prix ni bouton, mais « Le Noyau commande la cellule :
  montez-le d'abord au niveau N », avec un lien qui ouvre le Noyau.

## Plus tard, si on le décide

Des conditions entre organites (par exemple Vacuole 6 demande Paroi 3), une tous les cinq
niveaux, toujours avec un bouton qui mène à l'organite demandé.

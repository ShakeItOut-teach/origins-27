# Inventaire de l'ancien jeu

L'ancien jeu (branche `main`, dossier `js/`) est **la référence de contenu** du nouveau : on en
reprend les mécaniques en entier, on ne les appauvrit pas. Ce tableau dit, pour chaque mécanique,
où elle en est. Il est tenu par l'agent `memoire-ancien-jeu` : on le met à jour à chaque palier.

Pour lire l'ancien code sans changer de branche : `git show origin/main:js/<fichier>`.

États : **repris** (dans le nouveau jeu), **partiel** (une partie seulement), **prévu** (palier
désigné), **à placer** (pas encore au planning), **écarté** (décision notée).

| Mécanique de l'ancien jeu                                                    | Fichier             | État     | Dans le nouveau jeu / palier visé                                                                  |
| ---------------------------------------------------------------------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| Quatre ressources (ATP, protéines, lipides, nucléotides)                     | 03-regles           | partiel  | trois ressources ; les nucléotides sont **à placer**                                               |
| Stades de la cellule (procaryote → pluricellulaire fortifié)                 | 03-regles           | à placer | la créature change avec les mutations, pas par stades                                              |
| Canaux de membrane (un « champ » par ressource)                              | 03-regles, 07       | écarté   | la production vient des organites                                                                  |
| Organites et noyau (niveaux, noyau qui ouvre la suite)                       | 03-regles           | partiel  | neuf organites, niveau 10 au palier 10, niveau 15 au palier 11                                     |
| Arbre d'évolution à embranchements, voies offensives qui se battent en cycle | 03-regles, 14       | partiel  | douze évolutions en trois branches, tirage de saison ; pas d'embranchement exclusif : **à placer** |
| Mutations (une carte parmi trois), familles, lignées, malus                  | 04-mutations        | partiel  | repris sans malus ; les malus sont **à placer**                                                    |
| Troupes de rang T1 à T5, deux branches (récolte/espionnage, attaque)         | 05-troupes          | partiel  | rangs 1 à 4 (paliers 10 et 11) ; rang 5 **prévu palier 12**                                        |
| Recherche militaire, compositions d'envoi enregistrées                       | 05-troupes          | partiel  | pouvoirs des troupes (jour 5) ; compositions d'envoi enregistrées **à placer**                     |
| Entretien des troupes, digestion des récoltes                                | 05-troupes, 07      | partiel  | entretien en ATP et famine repris ; digestion **à placer**                                         |
| Vision, brouillard, exploration des cases                                    | 07-economie, 19     | écarté   | l'océan est visible ; seules les zones fermées sont dans l'ombre                                   |
| Photosynthèse plus forte près de la surface                                  | 07-economie         | à placer | bonne raison de remonter : à étudier avec les niveaux supérieurs                                   |
| Énergie (jauge, coûts par action)                                            | 08-recompenses      | repris   | palier 3                                                                                           |
| Récompenses quotidiennes de connexion                                        | 08-recompenses      | à placer |                                                                                                    |
| Coffres à ouverture animée, quêtes du jour                                   | 08-recompenses      | repris   | paliers 4 et 9                                                                                     |
| Héros (expérience, niveaux, combat)                                          | 08-recompenses, 10  | partiel  | remplacé par le compagnon (palier 8) ; il ne se bat pas : **à placer**                             |
| 499 rivaux simulés, nuit et bouclier, pillages, attaques entrantes           | 09-rivaux           | repris   | paliers 5 et 6 ; alerte d'attaque palier 9                                                         |
| Rivaux qui s'adaptent aux choix du joueur                                    | 12-evenements       | à placer |                                                                                                    |
| Classement en cinq catégories, tendances jour après jour, ligues             | 10-classement       | partiel  | palier 7 ; les tendances (flèches) sont **à placer**                                               |
| Migration libre sur la carte                                                 | 10-classement, 19   | partiel  | on remonte de zone en zone ; déplacement latéral **à placer**                                      |
| Événements de zone (éruption, efflorescence, Léviathan, zone anoxique)       | 12-evenements       | repris   | palier 9                                                                                           |
| Récolte automatique (« réflexes » : esquive, récolte en boucle)              | 12-evenements, 27   | partiel  | récolte en boucle au palier 4 ; esquive automatique **à placer**                                   |
| Alliances : technologies, dons, Officier, entraide, cadeau, boutique         | 26-alliances        | repris   | palier 9                                                                                           |
| Rapports : en route, combats, récoltes, journal                              | 15-panneaux         | repris   | palier 9                                                                                           |
| Fiches d'aide et infobulles sur chaque élément                               | 17-fiches           | partiel  | lexique des vrais termes ; aide par écran **à placer**                                             |
| Carte à zoom, mini-carte                                                     | 19-carte            | partiel  | océan à zoom ; mini-carte **à placer**                                                             |
| Premiers pas guidés                                                          | 23-premiers-pas     | repris   | paliers 0 à 5, par accomplissement                                                                 |
| Carnet d'apprentissage (missions facultatives par bâtiment)                  | 24-apprentissage    | à placer |                                                                                                    |
| Options (vitesse, vocabulaire, sons)                                         | 25-options, 29-mots | partiel  | choix des vrais termes ; pas de son                                                                |
| Dormance de 8 h choisie par le joueur                                        | 27-saison           | repris   | bouclier de nuit, palier 5                                                                         |
| Espèce : nom latin, cousin fossile réel, planche à partager                  | 27-saison           | repris   | palier 11                                                                                          |
| Fossiles de la saison en vitrine, bonus aux espèces ressemblantes            | 27-saison           | partiel  | fossile du jour dans la Gazette ; le bonus est **prévu palier 11**                                 |
| Crise de saison                                                              | 27-saison           | repris   | palier 11 ; badge de survivant **prévu palier 12**                                                 |
| Gazette du serveur, à copier sur Discord                                     | 27-saison           | repris   | palier 9                                                                                           |
| Fin de saison au jour 27, Muséum                                             | 27-saison           | prévu    | palier 12                                                                                          |
| Lignées de l'APEX (dinosaures), course vers la terre ferme                   | 16-apex             | prévu    | palier 12 (`apexRace`)                                                                             |
| Compte, sauvegarde en ligne                                                  | 28-compte           | repris   | première version                                                                                   |
| Avis des joueurs                                                             | 22-avis             | à placer |                                                                                                    |

## Ajouté par le nouveau jeu (absent de l'ancien)

Océan en zones de profondeur, gisements communs, prédateurs du Cambrien, compagnon à faire
évoluer, tirage d'évolutions par saison, calendrier à comptes à rebours, concours de la semaine,
accélérateurs, coffres de ligue et de concours.

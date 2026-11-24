# Origins 27 — principe général (extrait du brouillon)

Ce document ne garde que l'intention : histoire, jeu, gameplay, direction artistique.
Aucun chiffre, aucun choix technique du brouillon n'est repris ici.

## 1. La promesse

> Vous naissez bactérie dans un monde hostile. Irez-vous au bout du chemin pour devenir l'APEX légendaire ?

Un jeu de stratégie persistant, dans le navigateur (mobile d'abord), où l'on fait
évoluer un organisme depuis la cellule unique jusqu'à la créature qui sort de l'eau,
sur un serveur partagé qui dure **27 jours** et réunit **500 organismes**.
Gratuit, sans aucun avantage achetable.

## 2. L'histoire

- **Le cadre :** un océan primitif, vu comme une lame de microscope. Le joueur est une
  souche bactérienne prélevée par un naturaliste (souches, lieux et chercheurs imaginaires,
  mais crédibles).
- **L'arc :** cinq stades de vie — Procaryote → Eucaryote → Colonie → Pluricellulaire → APEX.
  La victoire, c'est sortir de l'eau.
- **Le ton :** science réelle. Le jeu emploie les vrais termes (ATP, lipides, mitochondrie),
  expliqués un par un dans un lexique ; le joueur peut choisir les mots simples (sucre,
  briques, centrale) à la place. Décision du propriétaire du 2026-11-24.
- **La trace :** à la fin de la saison, l'espèce du joueur est unique (nom latin, apparence
  façonnée par ses mutations, cousin fossile réel) et entre dans un Muséum. On repart
  de zéro à la saison suivante, avec ce souvenir.

## 3. Les piliers du jeu

1. **Grandir** — une cellule qui produit des ressources et se construit, organite par organite.
2. **Évoluer** — des gènes à exprimer et des mutations tirées au sort à choisir : aucune
   partie ne ressemble à une autre, et les choix se voient sur la créature.
3. **S'étendre** — une carte du monde à explorer : récolter, chasser, repérer.
4. **S'affronter** — des troupes (rangs T1 à T5), l'espionnage, le pillage, la défense
   ou l'esquive, la riposte.
5. **S'allier** — des alliances avec dons, entraide, technologies communes, objectifs partagés.
6. **Se mesurer** — classements, ligues, récompenses quotidiennes, une grande crise de
   saison (glaciation, anoxie, météorite) qui resserre le classement sans rien détruire.

## 4. La boucle de jeu

- **Session courte (2 à 5 min) :** récolter ce qui a été produit, lancer une construction,
  envoyer des troupes, ouvrir une récompense, repartir.
- **Journée :** une énergie limitée oblige à choisir ses actions ; quêtes et coffres du jour ;
  protections (nuit choisie par le joueur, bouclier après un pillage subi) pour que
  personne ne soit puni de dormir.
- **Saison (27 jours) :** montée en puissance par paliers, une crise annoncée, un final
  où les meilleurs atteignent l'APEX. Puis Muséum et nouvelle saison.
- **Rythme asynchrone :** le monde avance quand le joueur est absent ; un seul écran
  « pendant votre absence » résume tout au retour.

## 5. Ce qui a bien marché dans le brouillon (à garder comme intention)

- La créature qui change d'apparence à chaque mutation, et la planche d'espèce à partager.
- Le vocabulaire « mots simples » par défaut, termes scientifiques en option.
- Les protections anti-frustration (dormance, bouclier, esquive, « rien n'est perdu »).
- Des rivaux simulés qui se comportent comme des humains (sommeil, connexions) pour
  remplir le serveur.
- La Gazette du serveur, qui raconte la saison.
- Le conseiller « que faire ? » qui emmène toujours au bon endroit.

## 6. Ce qui n'a pas marché (la raison du nouveau départ)

- **Trop de choses dès le début :** quatre ressources, huit emplacements, énergie, coffres,
  quêtes, troupes, carte, classement… Le dévoilement progressif a été ajouté après coup,
  il n'était pas dans la conception.
- **Deux identités visuelles** (Abysses puis Carnet de laboratoire) empilées.
- **Solo déguisé en multijoueur :** tout tourne dans le navigateur, le vrai multijoueur
  aurait demandé de tout réécrire.
- **Code sans garde-fous :** variables globales, pas de tests des règles, pas de séparation
  entre règles et affichage.

## 7. Direction artistique attendue

- **Univers :** le carnet de laboratoire d'un naturaliste. Papier, encre, annotations ;
  les vues vivantes (cellule, carte) sont des lames de microscope sombres et lumineuses
  collées dans le carnet.
- **Exigence :** « super beau » dès la première seconde. La cellule est vivante : elle
  respire, bouge, réagit au toucher. C'est elle le personnage principal.
- **Lisibilité :** un écran = une idée. Gros éléments tactiles, très peu de texte,
  chiffres rares au début.
- **Palette de référence :** encre bleu nuit, éosine (actions), algue (vie, gains),
  iode (récompenses), lame (évolution). Titres à empattements, texte sans, chiffres en chasse fixe.
- **Progression visible :** plus le joueur avance, plus sa créature, ses troupes et son
  interface deviennent riches. La complexité se lit à l'écran comme une récompense.
- **Son :** discret, organique, facultatif.

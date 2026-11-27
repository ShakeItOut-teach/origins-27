# Charte d'Origins 27 — l'identité « Atlas »

Choisie par le propriétaire le 25 novembre 2026, parmi trois directions (voir l'ADR 0014).
**Tout ce qui se voit dans le jeu et autour du jeu suit cette charte** : écrans, icône, planches
d'APEX, page de présentation, vidéo, images pour les réseaux.

La même charte existe en artefact « Design System » (avec les aperçus des composants) :
<https://claude.ai/artifact/XwvgaSx7AFVYga3nwQ9E9s>. En cas d'écart, **ce fichier fait foi**
et l'artefact est corrigé.

## 1. L'idée, en une phrase

> Origins 27 est un atlas d'histoire naturelle gravé au XIXᵉ siècle, dont les planches sont vivantes.

Trois mots : **gravé, savant, patiné.**

Ce qu'on doit reconnaître au premier coup d'œil :

1. **La planche noire.** Tout ce qui vit (la cellule, la carte) est gravé en clair sur un disque
   noir, cerclé d'un double filet et d'un cercle gradué.
2. **Le trait de gravure.** De l'encre, des hachures pour l'ombre, du pointillé pour la matière.
   La couleur n'est qu'un lavis d'aquarelle, posé un peu à côté du trait.
3. **La page d'atlas.** Capitales de Bodoni, numéros de planche en chiffres romains, légendes
   « Fig. 1. — », lignes de sommaire à points de conduite.

## 2. Ce qu'on ne fait plus

L'ancienne apparence (carnet de laboratoire) a été jugée générique. Ne reviennent pas :

- le papier quadrillé ;
- les ombres dures décalées sous les boutons et les cartes (sur le papier, jamais d'ombre ;
  sur la planche noire, voir « Le relief ») ;
- l'italique à empattements partout, le fond crème avec un accent rouille ;
- les boutons en pilule, les coins très arrondis ;
- les dégradés de couleur, les halos lumineux, les émojis ;
- une forme pleine et colorée sans trait d'encre autour.

## 3. Couleurs

Les valeurs vivent dans `packages/client/src/theme/tokens.css` (et dans `jetons.json`, à côté
de ce fichier, pour les outils). Aucune couleur n'est écrite ailleurs.

| Jeton          | Valeur    | Nom            | Rôle                                                               | Contraste sur le papier |
| -------------- | --------- | -------------- | ------------------------------------------------------------------ | ----------------------- |
| `--paper`      | `#EDE6D6` | Papier         | Le fond de toutes les pages.                                       | —                       |
| `--paper-deep` | `#E0D7C3` | Papier foncé   | Un bouton éteint, une zone en retrait. Texte à l'encre seulement.  | —                       |
| `--ink`        | `#1E1B18` | Encre          | Texte, traits, filets.                                             | 13,8                    |
| `--ink-soft`   | `#5A5148` | Encre pâle     | Légendes, texte secondaire.                                        | 6,2                     |
| `--prussian`   | `#1D4F73` | Bleu de Prusse | **Agir** : le bouton principal, ce qui est choisi.                 | 7,0                     |
| `--madder`     | `#A63D60` | Garance        | **Alerter** : ce qui manque, ce qui menace.                        | 4,9                     |
| `--verdigris`  | `#356B5E` | Vert-de-gris   | **Gagner** : production, vie, ce qui pousse.                       | 4,9                     |
| `--gamboge`    | `#D9A520` | Gomme-gutte    | **Récompenser** : coffres, niveaux. Jamais en texte sur le papier. | 1,8 (fond seulement)    |
| `--plate`      | `#14110E` | Planche noire  | Le fond des vues vivantes.                                         | —                       |
| `--bone`       | `#F1EBDD` | Os             | Le trait et le texte sur la planche noire.                         | 15,8 sur la planche     |

Règles :

- **Une teinte, un rôle.** Le bleu de Prusse ne sert pas à décorer ; la garance ne sert pas à un bouton.
- Sur la gomme-gutte, le texte est à l'encre (contraste 7,6). Sur le bleu de Prusse et la
  garance, il est couleur papier (7,0 et 4,9).
- Sur le papier foncé, la garance et le vert-de-gris ne passent plus (4,2 et 4,3) : texte à l'encre.
- **Sur la planche noire, les quatre teintes sont éclaircies** (elles seraient trop sombres) :
  `--plate-prussian` `#8FB4CF`, `--plate-madder` `#D98BA6`, `--plate-gamboge` `#E6B94A`,
  `--plate-verdigris` `#8DBFAF`, plus `--plate-moss` `#B9C48A` pour le plancton. Elles ne servent
  nulle part ailleurs. PixiJS les lit dans `packages/client/src/cell/plate.ts`.
- Deux états qu'on doit distinguer diffèrent aussi par la forme ou par un mot, pas seulement
  par la teinte.
- Les anciens noms (`--eosin`, `--algae`, `--iodine`, `--slide`, `--lens-*`, `--on-dark`,
  `--grid`) restent des renvois vers les nouveaux, pour le code déjà écrit. Le code neuf
  emploie les nouveaux noms.

## 4. Typographie

| Usage              | Police                              | Réglage                                                    |
| ------------------ | ----------------------------------- | ---------------------------------------------------------- |
| Titres             | **Bodoni Moda** (`--font-title`)    | Capitales, graisse 700, interlettrage 0,06 em.             |
| Texte, boutons     | **Spectral** (`--font-text`)        | 17 px, interligne 1,35 ; 600 pour les boutons.             |
| Légendes de figure | Spectral italique                   | 14 à 15 px, encre pâle. « Fig. 1. — Votre cellule. »       |
| Chiffres           | **IBM Plex Mono** (`--font-number`) | Graisse 500, chiffres alignés. Toujours pour une quantité. |
| Étiquettes         | Spectral, capitales                 | 11 à 13 px, interlettrage 0,12 em.                         |

Échelle des tailles : 11 · 13 · 15 · 17 · 19 · 23 · 34 · 40 px. Pas de taille entre deux.

- Le Bodoni ne descend pas sous 17 px : ses déliés deviennent trop fins sur un téléphone.
- Jamais de Bodoni en italique pour une phrase entière ; l'italique est le rôle de Spectral.
- Les polices sont embarquées dans le jeu (`@fontsource`), jamais chargées depuis un autre site.

## 5. Espacements, filets, formes

- Espacements : 4 · 8 · 12 · 16 · 24 · 32 px (`--space-1` à `--space-6`).
- **Le filet** (`--line`) : un trait d'encre de 1,5 px. Il sépare, il encadre.
- **Le double filet** (`--shadow`, `--shadow-big`) : un filet, un mince intervalle de papier,
  un second filet. Il remplace toute ombre. Il entoure ce qu'on peut toucher ou ce qui compte.
- **Le filet double horizontal** (`border-top: 3px double`) : en tête et en pied de page, comme
  dans un livre.
- **Les points de conduite** : entre un mot et son chiffre, une ligne pointillée, comme dans
  un sommaire.
- Coins : 2 px (`--radius`). Seuls les médaillons (boutons ronds des organites, planche noire) sont ronds.
- Zone tactile : 48 px (`--touch`), jamais moins de 44.

## 6. Composants

Les aperçus sont dans l'artefact « Design System ». Les règles :

| Composant            | Règle                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bouton principal     | Fond bleu de Prusse, texte papier, double filet. Un seul par écran. Enfoncé : le double filet se resserre.                                                                                                                                                                     |
| Bouton discret       | Fond papier, texte encre, filet simple.                                                                                                                                                                                                                                        |
| Bouton éteint        | Fond papier foncé, texte encre pâle, sans double filet. Il dit toujours ce qui manque.                                                                                                                                                                                         |
| Onglets              | Une rangée encadrée ; l'onglet ouvert est à l'encre, texte papier ; un filet entre deux onglets.                                                                                                                                                                               |
| Compteur             | Le chiffre en Plex Mono, son nom dessous en légende ; le gain en vert-de-gris, le manque en garance.                                                                                                                                                                           |
| Ligne de sommaire    | Mot, points de conduite, chiffre. Toute la ligne se touche (48 px de haut).                                                                                                                                                                                                    |
| Étiquette            | Petit rectangle de papier cerclé d'un filet, chiffres en Plex Mono (« Niv. 2 »).                                                                                                                                                                                               |
| Page                 | Un écran de papier (rivaux, recherche, rapports) est une page d'atlas : « Planche III », le titre en capitales de Bodoni, un double filet. Dessous, des lignes séparées par un filet fin — **jamais de boîtes empilées**. Un intertitre : petites capitales entre deux filets. |
| Vignette de rival    | Petite planche noire de 48 px, la cellule du rival gravée dans sa teinte ; sa silhouette vient de son nom et ne change jamais.                                                                                                                                                 |
| Signe de marge       | Dans un journal, un signe dit l'issue avant les mots, par sa **forme** autant que sa couleur : disque plein (gagné), losange vide (perdu), anneau (récolte).                                                                                                                   |
| Fiche                | Feuille de papier qui monte du bas, filet en haut, titre en capitales de Bodoni.                                                                                                                                                                                               |
| Planche noire        | Disque noir, double filet, cercle gradué ; trait couleur d'os ; échelle « 10 µm ».                                                                                                                                                                                             |
| Médaillon d'organite | Rond de 48 px sur la planche, filet couleur d'os, pictogramme au trait. **Son niveau se lit d'un coup d'œil** : une petite étiquette de papier accrochée en bas. Le Noyau, au centre, est un double cercle transparent : on voit le noyau gravé à travers.                     |

## 7. Illustration

**Tout dessin est une gravure.** Les règles, dans l'ordre où on dessine :

1. **Le trait d'ombre** : la forme en encre, décalée de 2 px vers le bas à droite.
2. **Le papier** : la forme remplie couleur papier, qui cache ce qui est derrière.
3. **Le lavis** : une seule teinte, floue, décalée de 3 à 4 px, opacité 0,4 à 0,6. Il déborde
   un peu, comme sur une gravure coloriée à la main.
4. **Les hachures** : des traits parallèles de 0,9 px, espacés de 5 à 7 px, plus serrés vers
   le bas de la forme ; croisés dans l'ombre la plus forte.
5. **Le pointillé et les écailles** : pour la matière (peau, cytoplasme), plus serrés vers le bord.
6. **Le contour** : 2,2 à 2,6 px pour le premier plan, 1,7 à 1,9 px pour l'arrière-plan.

Les parties à l'arrière-plan (membres du fond) sont entièrement hachurées et lavées de vert-de-gris.

Sur la planche noire, on inverse : trait couleur d'os, pas de hachures pleines, du pointillé,
et un lavis très léger par organite (gomme-gutte pour la mitochondrie, bleu de Prusse pour la
vacuole, garance pour le noyau, vert-de-gris pour le réticulum).

**Le relief** (gardé par le propriétaire le 26/11/2026 : « c'est mieux »). Sur la planche
noire, tout a du volume, comme une gravure éclairée de côté :

- **La lumière vient d'en haut à gauche**, partout et toujours.
- **Une ombre portée** : la même forme, en noir, décalée vers le bas à droite, sous chaque
  corps (la cellule, un organite, un organisme, un lieu, un médaillon). Jeton `--relief`
  pour les éléments de l'interface.
- **Un reflet** du côté de la lumière : un trait clair et épais, couleur d'os.
- **Des hachures** du côté de l'ombre, plus longues au plus sombre. Jamais de dégradé.
- **Un premier plan** : deux ou trois grandes taches très pâles qui passent devant, pour la
  profondeur.

Le relief ne vaut que sur la planche noire. Sur le papier (boutons, fiches, pages), il n'y a
pas d'ombre : le double filet suffit.

**Le coffre est un champignon** (demande du propriétaire, 26/11/2026), gravé avec le relief de
la planche noire : chapeau d'amanite tacheté, lavis de la teinte du coffre (vert-de-gris,
gomme-gutte, garance), hachures et bord ombré à droite, reflet couleur d'os à gauche, pied
annelé sur une motte hachurée, ombre portée. Fermé, un voile cache les lamelles et le champignon
respire. Touché, le chapeau se soulève, le voile tombe et une gerbe de spores (grains couleur
d'os cernés d'encre) s'échappe des lamelles. Sans animation si le joueur l'a demandé
(`packages/client/src/ui/SporeChest.tsx`).

**Un pictogramme dit ce que fait la chose**, pour qu'on le retienne (demande du propriétaire,
26/11/2026). Il ne montre pas l'organite tel qu'il est, mais son rôle :

| Organite    | Ce qu'il fait                   | Son pictogramme                                      |
| ----------- | ------------------------------- | ---------------------------------------------------- |
| Centrale    | fabrique du sucre               | une mitochondrie, l'hexagone du sucre au milieu      |
| Réserve     | garde le sucre et les briques   | un bocal, son niveau, deux briques au fond           |
| Cils        | font nager plus vite            | une cellule lancée, ses cils en arrière, son sillage |
| Fabrique    | fabrique des briques            | un atelier au toit en dents de scie, ses briques     |
| Pouponnière | fait naître des cellules filles | une cellule, et sa fille qui s'en détache            |
| Paroi       | défend                          | un bouclier                                          |
| Emballeur   | emballe ce qu'on récolte        | un colis ficelé                                      |
| Noyau       | exprime les évolutions          | la double hélice                                     |
| Estomac     | digère les proies en protéines  | une cellule qui avale une proie, trois grains dedans |

Règles : un trait de 1,6 à l'encre du texte ; les petits signes des ressources (hexagone,
briques, grains) sont pleins et sont **les mêmes** que ceux des compteurs ; jamais plus de
deux idées dans un pictogramme (`packages/client/src/ui/icons.tsx`).

**Les cartes** (la goutte, l'océan) sont des planches noires comme les autres :

- Rien ne brille : pas de halo autour d'un lieu ou d'un être vivant. Chacun porte son ombre
  (voir « Le relief »). Un lieu est un médaillon
  au trait (un cercle, des graduations, un lavis, du pointillé).
- L'eau est noire au large et se lave de bleu de Prusse **par paliers** vers le rivage, comme
  les teintes de profondeur d'une carte marine. Jamais un dégradé lisse.
- **La terre ferme est en papier**, cernée d'encre, avec les hachures du rivage : sortir de
  l'eau, c'est atteindre le papier. Elle porte une **forêt originelle** qui donne envie d'y
  arriver : conifères, fougères arborescentes et feuillus au trait, un lavis vert qui suit la
  côte, un lac et sa rivière en bleu de Prusse, des prairies plus tendres, quelques collines
  hachurées, une plage en pointillé. De loin, les arbres sont des points verts
  (`packages/client/src/cell/land.ts`).
- Le danger est en garance (prédateurs, Léviathan), la chaleur en gomme-gutte (sources,
  éruptions), la vie qui pousse en vert-de-gris (plancton).

**Une planche d'APEX** porte toujours : un numéro (« Pl. I »), le nom en capitales de Bodoni, le
nom latin en italique, la figure principale, une barre d'échelle en mètres, et les faits réels
(époque, âge, longueur). L'animal est montré de profil, tête à gauche, **dans une posture qui
dit son rôle** : le prédateur attaque, le cuirassé fait front, le géant domine.

**Comment produire un dessin :**

- Les outils sont dans `scripts/identite/` : `gravure.cjs` (courbes, hachures, pointillé,
  écailles, crêtes) et `anatomie.cjs` (forme gravée, doigt griffu, œil, ombre au sol).
- Une lignée d'APEX = un fichier dans `scripts/identite/lignees/`, qui décrit l'animal par des points.
- `node scripts/make-plates.cjs` écrit les figures dans `packages/client/public/planches/`.
- `node scripts/make-icons.cjs` écrit les icônes dans `packages/client/public/icons/`.
- Dans le jeu, la cellule est dessinée par `packages/client/src/cell/draw.ts`, avec les mêmes règles.

Si un jour une image peinte est voulue (ce que le code ne sait pas faire), on écrit d'abord un
cahier des charges à partir de cette section, et on demande l'accord du propriétaire : c'est
une ressource peut-être payante.

## 8. Mouvement

- La cellule respire, les cils ondulent, le cytoplasme tourne lentement : c'est une planche **vivante**.
- Une apparition dure 0,2 à 0,35 s. Rien ne rebondit, rien ne clignote.
- **Tout geste a une réponse** (demande du propriétaire, 27/11/2026 : « la vie et les retours »).
  Quand une ressource monte d'un coup (un toucher, un coffre, une récolte, un butin), des grains
  partent de l'endroit touché et volent jusqu'au compteur, qui sursaute. Le grain a le signe de
  la ressource : hexagone, brique, grain rond. Un grain pour une miette, neuf au plus. La
  production, elle, monte sans bruit (`packages/client/src/ui/GainFlights.tsx`).
- Un niveau qui change fait sursauter son étiquette, une fois.
- **Le premier écran** d'une partie neuve est la page de titre de l'atlas : la planche noire,
  le titre, la promesse en une phrase, et **un seul geste**, « Naître ». La page se lève et la
  cellule naît d'un point, en une seconde et demie. Rien d'autre à lire ni à toucher ; un
  joueur qui a déjà joué ne la revoit pas (`packages/client/src/ui/TitlePage.tsx`).
- Un retour dure moins d'une seconde et ne bloque jamais le geste suivant.
- « Réduire les animations » coupe tout mouvement de l'interface ; la cellule reste dessinée, immobile.

## 9. Ton des textes

- **Science réelle, mots simples.** Les vrais termes (ATP, mitochondrie), expliqués un par un ;
  le joueur peut choisir les mots simples.
- On vouvoie le joueur. Phrases courtes. Un verbe sur chaque bouton, qui dit ce qui va se passer.
- La voix est celle d'un naturaliste : elle décrit, elle ne s'exclame pas. Pas de point
  d'exclamation, pas de majuscules pour crier.
- Les conventions de l'atlas : « Pl. I », « Fig. 1. — », noms latins en italique, chiffres
  romains pour ce qui se numérote (planches, onglets), unités réelles (µm, m, Ma).
- Un refus dit toujours ce qui manque et où le trouver.
- Tous les textes du jeu sont dans `@o27/data`, en français et en anglais.

## 10. Accessibilité

- Texte : contraste de 4,5 au moins (3 à partir de 24 px). Le tableau des couleurs donne les valeurs.
- Zones tactiles de 44 px au moins. Un contour visible quand on navigue au clavier.
- Jamais une information par la couleur seule.
- « Réduire les animations » est respecté partout.

## 11. Où sont les choses

| Quoi                                 | Où                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Jetons (couleurs, polices, filets)   | `packages/client/src/theme/tokens.css`                                                           |
| Les mêmes, pour les outils           | `docs/identite/jetons.json`                                                                      |
| Styles des écrans                    | `packages/client/src/theme/app.css`                                                              |
| Dessin de la cellule dans le jeu     | `packages/client/src/cell/draw.ts`                                                               |
| Dessin des cartes dans le jeu        | `packages/client/src/cell/MapCanvas.tsx`, `OceanCanvas.tsx`, `oceanLife.ts`                      |
| Teintes de la planche noire (PixiJS) | `packages/client/src/cell/plate.ts`                                                              |
| Pictogrammes                         | `packages/client/src/ui/icons.tsx`                                                               |
| Outils de gravure                    | `scripts/identite/`                                                                              |
| Figures des lignées d'APEX           | `packages/client/public/planches/` (faites par `scripts/make-plates.cjs`)                        |
| Icônes                               | `packages/client/public/icons/` (faites par `scripts/make-icons.cjs`)                            |
| Page de présentation                 | `packages/client/public/decouvrir/` et `/discover/` (faites par `scripts/make-presentation.cjs`) |
| Vidéo de présentation                | `packages/client/public/decouvrir/origins27.webm` (faite par `scripts/make-video.cjs`)           |
| Pourquoi cette direction             | `docs/adr/0014-identite-atlas.md`                                                                |
| Les trois directions comparées       | <https://claude.ai/artifact/WMAvYRoCHWkF6YzwC67mUr>                                              |

## 12. Présenter le jeu

Tout ce qui sert à montrer le jeu est fabriqué par des scripts, jamais retouché à la main :

| Quoi                     | Commande                                        | Ce qu'on change pour le modifier                         |
| ------------------------ | ----------------------------------------------- | -------------------------------------------------------- |
| Les neuf planches d'APEX | `node scripts/make-plates.cjs`                  | Les points de l'animal, dans `scripts/identite/lignees/` |
| L'icône                  | `node scripts/make-icons.cjs`                   | Les mesures en tête du script                            |
| La vidéo et les captures | `pnpm build` puis `node scripts/make-video.cjs` | Le scénario, dans `scripts/video/scenario.cjs`           |
| La page de présentation  | `node scripts/make-presentation.cjs`            | Les textes en tête du script                             |

L'ordre compte : les planches, puis la vidéo (elle montre les planches et capture le vrai jeu), puis
la page (elle montre la vidéo et les captures).

- **La vidéo est tournée dans le vrai jeu** : un navigateur sans fenêtre ouvre le jeu construit, à
  la taille d'un téléphone, et joue le scénario. Aucune image n'est truquée. Elle dure moins de
  quarante secondes, sans son, au format d'un téléphone (720 × 1280).
- **La page de présentation** est à l'adresse `/decouvrir/` (en anglais : `/discover/`). Son
  bouton mène au jeu avec `?s=presentation` ; un lien partagé peut porter sa propre source
  (`/decouvrir/?s=discord`), qui est transmise au jeu pour les statistiques d'audience.
- Une image pour un réseau social se compose avec les mêmes pièces : le papier, une planche ou la
  cellule, un titre en capitales de Bodoni, une légende en italique.

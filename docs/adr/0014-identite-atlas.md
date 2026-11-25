# ADR 0014 — L'identité visuelle « Atlas »

Date : 2026-11-25 · État : acceptée

## Contexte

Le bilan des jeux comparables (`docs/veille/2026-11-25-bilan-jeux-comparables.md`) conclut que
le jeu a les mécaniques et qu'il lui manque de quoi se présenter. Le propriétaire a jugé
l'apparence du moment (le « carnet de laboratoire ») générique : rien ne la distinguait d'une
page faite par une IA, ni des autres jeux du genre. Il a demandé une identité forte, **gardée
dans une charte que tous les agents réutilisent**, et de quoi montrer le jeu : images d'APEX,
page de présentation, vidéo.

Trois directions lui ont été montrées sur les trois mêmes choses (écran de la cellule, icône,
planche du tyrannosaure) : <https://claude.ai/artifact/WMAvYRoCHWkF6YzwC67mUr>.

- **A · Atlas** — le carnet devient un atlas d'histoire naturelle gravé.
- **B · Lueur** — l'océan la nuit, tout ce qui vit dessiné en points de lumière.
- **C · Découpe** — tout en papier de couleur découpé et empilé.

## Décision

**Le propriétaire a choisi A · Atlas**, le 25 novembre 2026.

- La charte est `docs/identite/charte.md`. Elle fait foi. Elle est recopiée dans un artefact
  « Design System » pour les aperçus.
- Les jetons de `packages/client/src/theme/tokens.css` prennent les valeurs de la charte. Les
  anciens noms de jetons restent, en renvois, pour ne pas casser le code déjà écrit.
- **Deux polices arrivent, deux partent.** Bodoni Moda (titres) et Spectral (texte) remplacent
  Instrument Serif et IBM Plex Sans ; IBM Plex Mono reste pour les chiffres. Elles viennent de
  `@fontsource-variable/bodoni-moda` et `@fontsource/spectral` : embarquées dans le jeu, sous
  licence libre (SIL OFL), sans appel à un autre site. C'est la seule dépendance nouvelle.
- **Toutes les images sont dessinées par le code**, en vectoriel : `scripts/identite/` (outils
  de gravure), `scripts/make-plates.cjs` (lignées d'APEX), `scripts/make-icons.cjs` (icônes).
  Aucune image peinte, aucun générateur d'images, aucune ressource payante.

## Pourquoi cette direction

- Elle prolonge ce que le concept dit déjà du jeu : un naturaliste, des noms latins, un
  Muséum, la science réelle. Le joueur n'a pas à réapprendre l'univers.
- La gravure est **un procédé**, pas un goût : trait, hachures, pointillé, lavis. Un procédé
  s'écrit en règles, et des agents qui ne se parlent pas peuvent le suivre. C'est ce qui rend
  l'identité réutilisable.
- Les planches d'APEX deviennent des objets qu'on a envie de montrer : c'est la matière de la
  promotion.

## Ce qu'on a écarté, et pourquoi

- **Lueur** : le fond sombre aux couleurs vives est courant dans les jeux, et le brouillon
  avait déjà abandonné une piste « Abysses ».
- **Découpe** : la plus différente des autres jeux et la plus simple à dessiner, mais elle
  pouvait sembler enfantine et portait moins la « science réelle ».

## Conséquences

- Le risque d'Atlas est de rappeler l'ancienne apparence (papier clair, empattements). La
  charte liste donc **ce qu'on ne fait plus** (quadrillage, ombres dures, italique partout,
  accent rouille) : c'est la partie à relire en premier.
- Tout écran ou image nouveau suit la charte ; un écart se discute dans une nouvelle ADR.
- Les hachures fines demandent du soin sur un petit écran : pas de trait sous 0,9 px, pas de
  Bodoni sous 17 px.
- `docs/identite/charte.md` entre dans la liste « À lire avant d'agir » de `CLAUDE.md`.

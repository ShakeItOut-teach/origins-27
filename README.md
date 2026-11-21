# Origins 27

Prototype solo d’un jeu de stratégie en temps réel : une bactérie née au bord d’un océan circulaire grandit, évolue et remonte vers la terre ferme pour devenir l’APEX.

Tout le jeu tient dans un seul fichier, `index.html` (HTML, CSS et JavaScript, sans dépendance à installer). Il suffit de l’ouvrir dans un navigateur.

## Jouer

- **En local :** double-cliquez sur `index.html`.
- **En ligne avec GitHub Pages :** dans le dépôt, *Settings → Pages → Branch : `main` / `(root)` → Save*. Le jeu est ensuite servi à `https://<votre-compte>.github.io/<nom-du-depot>/`.

La partie est sauvegardée dans le navigateur (localStorage), sur l’appareil utilisé.

## Contenu du prototype 6

- **Cellule :** 4 canaux de production (ATP, protéines, lipides, nucléotides) et 8 emplacements d’organites autour du noyau.
- **Armée :** troupes produites en masse (×1, ×10, Max), débloquées par l’évolution : collectrice, éclaireuse, porteuse, soldate, une troupe d’élite par voie offensive, puis Volvox gardien et Ver segmenté. Les ribosomes fabriquent toutes les troupes, avec une chaîne de production de plus aux niveaux 3, 6 et 9 ; la production se lance aussi depuis le noyau.
- **Envois :** mode « Auto » ou « Je choisis » pour composer soi-même chaque chasse, pillage ou récolte.
- **Rapports :** tableau de force par type de troupe (voie, bonus, pertes), raison de la victoire ou de la défaite, détail du butin et des ressources volées, bilan cumulé des pillages.
- **Récompenses (🎁) :** série de connexion sur 7 jours, coffre gratuit toutes les 4 heures, 3 quêtes du jour.
- **File de constructions :** jusqu’à 2 constructions programmées derrière celle en cours, annulables avec remboursement.
- **Riposte :** chaque pillage subi propose « Riposter » ; dans les 24 h de jeu, la vengeance rapporte +50 % de butin. Les ennemis jurés sont listés dans le Classement.
- **Retour de pause :** une seule fenêtre « Pendant votre absence » résume tout, au lieu d’une fenêtre par événement.
- **Évolution :** arbre de gènes à 3 branches, 5 voies offensives en cycle, émergences cachées, et une mutation à choisir parmi 3 à chaque niveau de noyau (3 de la même famille ouvrent une lignée).
- **Stades de vie :** Procaryote → Eucaryote → Colonie → Pluricellulaire → APEX (victoire : sortir de l’eau).
- **Monde :** carte circulaire de 241 × 241 cases, événements de zone (éruption, plancton, zone anoxique, léviathan), 140 rivaux simulés qui s’adaptent à vos choix, 6 alliances.
- **Mobile :** navigation en bas d’écran, zoom à deux doigts sur la carte, récolte automatique (⛏), conseiller « que faire ? ».

## Outils

`tools/sim.js` est un robot de test qui joue des parties accélérées pour vérifier l’équilibrage. Il se charge dans la console du navigateur, sur la page du jeu :

```js
eval(await (await fetch('tools/sim.js')).text());
runSim({ souche: 'kori', days: 8, maxCells: 14, auto: true, army: true, migrate: true });
```

Il s’appuie sur l’objet de débogage `window.__o27` exposé par le jeu.

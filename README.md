# Origins 27

**Vous naissez bactérie au fond de l’océan. Dans 30 jours, un seul organisme sortira de l’eau.**

Origins 27 est un jeu de stratégie en temps réel, gratuit et jouable dans le navigateur. Sur un serveur de 30 jours, vous partez d’une cellule perdue dans les abysses et vous affrontez 140 rivaux qui grandissent, pillent et s’allient comme vous. Le premier à remonter jusqu’à la terre ferme devient l’APEX.

- **Évoluez :** 5 stades de vie, de la bactérie au pluricellulaire, 3 branches de gènes et une mutation à choisir à chaque niveau. Aucune partie ne ressemble à une autre.
- **Pillez :** volez les réserves de vos rivaux, espionnez-les, ripostez avec +50 % de butin.
- **Commandez :** des troupes classées du rang T1 au rang T5. Les formes légendaires n’apparaissent que la dernière semaine.
- **Dominez :** classement mondial, 6 ligues de Plancton à Souverain, récompenses chaque jour et coffres jusqu’à ×8.

Tout le jeu tient dans un seul fichier, `index.html` (HTML, CSS et JavaScript, sans dépendance à installer). Il suffit de l’ouvrir dans un navigateur.

## Jouer

- **En local :** double-cliquez sur `index.html`.
- **En ligne avec GitHub Pages :** dans le dépôt, *Settings → Pages → Branch : `main` / `(root)` → Save*. Le jeu est ensuite servi à `https://<votre-compte>.github.io/<nom-du-depot>/`.

La partie est sauvegardée dans le navigateur (localStorage), sur l’appareil utilisé.

## Contenu détaillé

- **Écran d’accueil :** image animée de l’ascension (procaryote, eucaryote, colonie, pluricellulaire, APEX sortant de l’eau), accroche, « Jouer maintenant » en un clic, et l’histoire en 7 étapes pour qui veut lire.
- **Cellule :** 4 canaux de production (ATP, protéines, lipides, nucléotides) et 8 emplacements d’organites autour du noyau.
- **Armée en rangs T1 à T5 :** deux branches, 🔍 récolte et espionnage (collectrice → éclaireuse et porteuse → diatomée de verre → siphonophore → cténophore spectral) et ⚔ attaque (soldate → une troupe par voie offensive → Volvox gardien → Ver segmenté → Anomalocaride). Chaque rang se débloque par une recherche militaire aux coûts et durées exponentiels (2 h, 8 h, 24 h, 48 h de jeu) : T2 vers le jour 3, T3 vers le jour 10, T4 vers le jour 18, T5 dans la dernière semaine. Plus le rang est haut, plus l’icône de la troupe est aboutie : membrane simple, organites, armure, colonie, puis forme légendaire dorée et animée.
- **Espionnage :** les troupes de la branche récolte et espionnage peuvent espionner un rival (⚡1). Réussite selon la force d’espionnage contre sa vigilance ; un succès affiche ses chiffres exacts pendant 24 h, un échec coûte la moitié des espionnes.
- **Production :** les ribosomes fabriquent toutes les troupes, avec une chaîne de production de plus aux niveaux 3, 6 et 9 ; la production se lance aussi depuis le noyau.
- **Envois :** mode « Auto » ou « Je choisis » pour composer soi-même chaque chasse, pillage ou récolte.
- **Rapports :** tableau de force par type de troupe (voie, bonus, pertes), raison de la victoire ou de la défaite, détail du butin et des ressources volées, bilan cumulé des pillages.
- **Énergie (⚡) :** chaque action en consomme (récolter ou explorer 1, chasser 2, piller 3, accélérer un chantier ou un gène de 1 h : 5). Elle remonte de 1 toutes les 20 minutes jusqu’à 30. Seules les récompenses la font dépasser 30 (jusqu’à 120) : connexion du jour, coffres, quêtes du jour, ligue, léviathan vaincu et gisements d’événement (gratuits à récolter, +2 au retour).
- **Récompenses (🎁) :** série de connexion sur 7 jours, coffre gratuit toutes les 4 heures, 3 quêtes du jour. Les coffres ont 4 raretés : commun ×1 (70 %), rare ×2 (20 %), très rare ×4 (8 %), extrêmement rare ×8 (2 %). Rien n’est perdu : ce qui ne rentre pas dans les entrepôts va dans une réserve (🧺), à l’abri du pillage, qui les remplit automatiquement dès qu’il y a de la place.
- **Rythme d’un serveur de 30 jours :** production passive réduite de 30 %, coûts qui montent avec les niveaux, capacité des entrepôts ajustée en conséquence. En simulation, un joueur qui ouvre ses coffres atteint l’APEX vers le jour 20 ; sans coffres, il n’y arrive pas en 30 jours.
- **File de constructions :** jusqu’à 2 constructions programmées derrière celle en cours, annulables avec remboursement.
- **Riposte :** chaque pillage subi propose « Riposter » ; dans les 24 h de jeu, la vengeance rapporte +50 % de butin. Les ennemis jurés sont listés dans le Classement.
- **Classement mondial :** votre rang parmi les 141 organismes du monde en 5 catégories (puissance, attaque, défense, pillards, alliances), avec la progression ▲▼ depuis le début du jour. 6 ligues (Plancton → Souverain) donnent une récompense à chaque fin de jour de jeu. Une ligne dont la position est connue s’ouvre sur la carte.
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

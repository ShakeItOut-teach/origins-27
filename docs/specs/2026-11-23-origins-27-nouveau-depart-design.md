# Origins 27, nouveau départ — document de conception

Date : 2026-11-23 · État : **à valider par le propriétaire**
À lire avec `CONCEPT.md` (intention du jeu) et `BRIEF-DEMARRAGE.md` (consignes aux agents).

## 1. Décisions prises pendant le cadrage

| #   | Sujet                    | Décision                                                                                                                           |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Première version jouable | Paliers 0 à 2, **déjà sur serveur** (compte, sauvegarde, serveur qui fait foi)                                                     |
| 2   | Socle                    | TypeScript strict, React, PixiJS, Supabase, Cloudflare Pages                                                                       |
| 3   | Dépôt                    | **Même dépôt** `ShakeItOut-teach/origins-27`, nouvelle branche principale ; l'ancien code est rangé dans une branche d'archive     |
| 4   | Déblocage                | Par ce que le joueur a accompli, **avec une date minimale** de saison pour les mécaniques collectives                              |
| 5   | Repris du brouillon      | Espèce unique et planche à partager ; Gazette ; énergie, coffres et quêtes du jour. **Les souches de départ ne sont pas reprises** |
| 6   | Rivaux simulés           | Ils complètent le serveur jusqu'à 500 et cèdent leur place aux vrais joueurs                                                       |
| 7   | Supabase                 | Réutiliser le projet existant ; les anciennes tables de sauvegarde sont retirées                                                   |
| 8   | Déploiement              | Sans accord préalable, dès que toutes les vérifications passent                                                                    |
| 9   | Développement            | Entièrement par agents ; quatre agents spécialisés (backend, interface, équilibrage, tests)                                        |

## 2. Le pilier : la complexité progressive

Le dévoilement est la structure du jeu. Une seule table de déblocage, en données, lue par
le moteur, le serveur et l'interface. Une mécanique non débloquée n'existe pas à l'écran
et ses ordres sont refusés par le serveur.

Chaque ligne de la table porte : une **condition d'accomplissement** (ce que le joueur a fait),
une **date minimale** facultative (jour de saison), ce qu'elle rend visible, les ordres qu'elle
autorise, et la mise en scène du déblocage.

| Palier | Condition (hypothèse à régler par l'agent équilibrage) | Date minimale | Ce qui s'ouvre                                                                 |
| ------ | ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------ |
| 0      | Arrivée                                                | —             | La cellule vivante, une ressource, toucher pour récolter                       |
| 1      | Première récolte faite                                 | —             | Construire un organite, production passive                                     |
| 2      | 3 organites                                            | —             | Deuxième ressource, première mutation à choisir : la créature change           |
| 3      | Première mutation                                      | —             | La carte proche, envoyer récolter ; énergie                                    |
| 4      | 5 récoltes sur la carte                                | —             | Premières troupes, chasse de proies neutres ; coffres et quêtes du jour        |
| 5      | Première chasse gagnée                                 | Jour 2        | Rivaux, espionnage, pillage, défense et esquive, protections                   |
| 6      | Premier combat contre un rival                         | Jour 3        | L'océan : zones de profondeur, gisements communs, remonter vers le centre      |
| 7      | 3 combats contre des rivaux                            | Jour 4        | Puissance, cinq classements, ligues, prédateurs de l'océan                     |
| 8      | Première récompense de ligue                           | Jour 5        | Familles de gènes, lignées, cellules filles de rang 2                          |
| 9      | —                                                      | Jour 9        | Événements, alliances, Gazette ; puis rangs supérieurs, crise, course à l'APEX |

Règles :

- Un joueur arrivé en retard passe les paliers par accomplissement, à son rythme ; les dates
  minimales déjà passées ne le retiennent pas.
- Personne ne peut être attaqué avant d'avoir atteint le palier 5.
- Chaque palier est livré complet et agréable avant de commencer le suivant.
- L'espèce unique se construit dès le palier 2 ; la planche à partager s'ouvre au palier 7,
  le Muséum à la fin de la saison.

## 3. Première version jouable (paliers 0 à 2)

Ce que le joueur vit : il arrive, voit une cellule qui respire, la touche, récolte. Il construit
un premier organite, la production démarre seule. Au troisième organite, une deuxième
ressource apparaît et il choisit sa première mutation : sa créature change sous ses yeux.

Inclus :

- Jeu sans inscription pour commencer (compte anonyme), puis connexion par e-mail pour
  retrouver sa partie sur un autre appareil.
- État du joueur stocké et calculé côté serveur ; reprise « pendant votre absence ».
- Français et anglais, mots simples.
- Mobile d'abord, installable.
- Direction artistique définitive sur ces écrans (pas de visuel provisoire).

Exclus de cette version : carte, troupes, autres joueurs, énergie, récompenses, classement.

## 4. Architecture

Un seul dépôt, espaces de travail pnpm :

| Paquet   | Rôle                                                                                                | Peut dépendre de         |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| `core`   | Moteur de règles pur et déterministe : état + ordre + temps + graine → nouvel état                  | `data` (types seulement) |
| `data`   | Équilibrage et table de déblocage, en fichiers validés par schéma                                   | rien                     |
| `server` | Fonctions Supabase : reçoit les ordres, appelle `core`, écrit en base ; migrations ; règles d'accès | `core`, `data`           |
| `client` | React (interface) + PixiJS (cellule, carte) ; affiche l'état, envoie des ordres                     | `core`, `data`           |
| `bots`   | Robots joueurs et rivaux simulés ; jouent via les mêmes ordres qu'un joueur                         | `core`, `data`           |

Principes :

- **Le serveur fait foi.** Le client peut prévoir l'effet d'un ordre avec `core` pour être
  réactif, mais c'est la réponse du serveur qui s'affiche au final.
- **Calcul paresseux :** l'état est recalculé depuis la dernière visite ; les événements
  datés (fin de chantier, arrivée de troupes) sont résolus une seule fois, à leur heure.
- **Ordres idempotents**, validés par schéma, refusés si la mécanique n'est pas débloquée.
- **Frontières vérifiées par outil :** un import interdit fait échouer la CI.
- **Saison :** une ligne « saison » en base (graine, date de début) ; tout le hasard en découle.

## 5. Cadre pour les agents

- `CLAUDE.md` à la racine et par paquet, courts ; ils pointent vers les règles.
- `.claude/agents/` : `backend-senior`, `interface-senior`, `equilibrage`, `tests-qualite`.
- Skills : Superpowers (brainstorming, plans, TDD, vérification avant « terminé ») et les
  skills retenus du dépôt `addyosmani/agent-skills`, copiés dans le dépôt.
- `docs/adr/` : une décision d'architecture par fichier. Les décisions de la section 1
  en sont les premières.
- `docs/specs/` et `docs/plans/` : conception et plans d'implémentation.
- Crochets locaux et crochets d'agent identiques à la CI.
- Définition de « terminé » : vérifications passées et collées, test du palier concerné,
  textes FR et EN, captures téléphone et ordinateur, compte rendu en français simple.

## 6. Vérifications automatiques (bloquent la fusion)

1. Formatage, lint sans avertissement, TypeScript strict.
2. Frontières d'architecture entre paquets.
3. Schémas des données ; table de déblocage cohérente (aucune mécanique orpheline).
4. Tests du moteur : unitaires et propriétés (pas de ressource négative, temps monotone,
   déterminisme, sauvegarde = rechargement).
5. Un test par palier, client et serveur.
6. Serveur : règles d'accès, ordres rejoués, ordres simultanés, migrations sur base vide.
7. Bout en bout dans un vrai navigateur, téléphone et ordinateur : la première session complète.
8. Comparaison visuelle des écrans clés.
9. Textes : aucun texte manquant en FR ou EN.
10. Budgets : poids de la page, temps de chargement, accessibilité.

Chaque nuit : robots qui jouent des saisons entières et robot qui clique au hasard.

## 7. Dépôt, CI/CD, versions

- Branche `main` protégée, tout passe par PR ; ancien code dans `archive/brouillon-v1`.
- GitHub Actions : les vérifications ci-dessus sur chaque PR.
- Cloudflare Pages : une préversion en ligne par PR ; `main` est déployée automatiquement.
- Migrations Supabase appliquées automatiquement après fusion sur `main`.
- Commits conventionnels ; numéro de version et journal des changements générés automatiquement.
- Après chaque déploiement : la première session est rejouée sur le site en ligne ;
  en cas d'échec, retour automatique à la version précédente.

## 8. Conséquences à connaître avant de valider

- **Le site actuel sera remplacé** dès la première mise en ligne du nouveau jeu (décision 3) :
  les joueurs du brouillon perdent l'accès à l'ancien jeu, sauf à le garder à une autre adresse.
- **Les parties en ligne du brouillon seront effacées** quand les anciennes tables Supabase
  seront retirées (décision 7). Les comptes sont conservés.
- L'adresse de jeu change si l'on passe à Cloudflare Pages ; l'ancienne adresse GitHub Pages
  peut rediriger vers la nouvelle.
- Supabase reste gratuit au départ ; un accord sera demandé avant tout passage à l'offre payante.

## 9. Hors périmètre pour l'instant

Chat en jeu (Discord suffit), paiements, plusieurs serveurs en parallèle, serveurs « éclair »,
application native, paliers 3 et suivants (conçus ici, planifiés après la première version).

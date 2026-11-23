# Plan d'implémentation — première version jouable (paliers 0 à 2)

Date : 2026-11-23 · Conception de référence : `docs/specs/2026-11-23-origins-27-nouveau-depart-design.md`

**But :** un nouveau joueur arrive sur le site, voit une cellule vivante, récolte, construit
trois organites, choisit sa première mutation et voit sa créature changer — le tout calculé
par le serveur, sur téléphone, en français et en anglais.

**Règles d'exécution pour les agents**

- Une tâche = une PR vers `next`. Test d'abord, puis le code, puis les vérifications collées.
- Ne commence pas une tâche dont les dépendances (colonne « Après ») ne sont pas fusionnées.
- Les tâches d'une même phase sans dépendance entre elles peuvent tourner en parallèle.
- Tout le travail se fait sur la branche `next`. `main` (le brouillon en ligne) n'est
  touchée qu'à la phase 8.
- « Vérif » = la commande qui doit passer avant de dire « terminé ».

Agents : **B** backend-senior · **I** interface-senior · **E** equilibrage · **T** tests-qualite · **P** agent principal.

---

## Phase 0 — Prérequis (propriétaire du projet)

Constaté le 2026-11-23 sur le poste : Git est installé ; Node, pnpm, GitHub CLI, Supabase CLI
et Wrangler ne le sont pas.

| #   | À faire                                                                                                                                                                 | Pourquoi                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0.1 | Installer Node 22 LTS (`winget install OpenJS.NodeJS.LTS`), puis `corepack enable`                                                                                      | Sans Node, rien ne se construit ni ne se teste en local |
| 0.2 | Créer un compte Cloudflare et un jeton d'API « Pages : modifier » ; le coller dans les secrets GitHub du dépôt sous `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`   | Hébergement et préversions                              |
| 0.3 | Dans Supabase, créer un jeton d'accès et relever le mot de passe de la base ; les coller dans les secrets GitHub sous `SUPABASE_ACCESS_TOKEN` et `SUPABASE_DB_PASSWORD` | Migrations et fonctions déployées par la CI             |
| 0.4 | Dans Supabase › Authentication, activer « Anonymous sign-ins »                                                                                                          | Jouer sans inscription                                  |

Les agents ne saisissent jamais ces secrets eux-mêmes. Les phases 1 à 3 et 6 n'ont besoin que de 0.1.

---

## Phase 1 — Dépôt et garde-fous

| #   | Tâche                                                                                                                                                                                                                                                                                                                        | Agent | Après    | Fichiers                                                                          | Vérif                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1.1 | Créer `archive/brouillon-v1` à partir de `main` et la pousser. Créer la branche `next`, vide (sans historique du brouillon)                                                                                                                                                                                                  | P     | 0.1      | —                                                                                 | `git ls-remote --heads origin` montre les deux branches                                      |
| 1.2 | Espace de travail pnpm : `packages/{core,data,server,client,bots}`, TypeScript strict partagé, scripts racine `lint`, `typecheck`, `test`, `build`, `check` (tout)                                                                                                                                                           | P     | 1.1      | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`             | `pnpm check` passe sur des paquets vides                                                     |
| 1.3 | ESLint (zéro avertissement), Prettier, `.editorconfig`                                                                                                                                                                                                                                                                       | T     | 1.2      | `eslint.config.js`, `.prettierrc`                                                 | `pnpm lint`                                                                                  |
| 1.4 | Frontières d'architecture : `core` n'importe que les types de `data` ; `client` et `server` ne s'importent pas ; `Date.now`, `Math.random`, `fetch` interdits dans `core`                                                                                                                                                    | T     | 1.3      | `.dependency-cruiser.cjs`, règle ESLint `no-restricted-globals` pour `core`       | Un import interdit ajouté exprès fait échouer `pnpm check` ; le retirer                      |
| 1.5 | Crochets locaux : pre-commit (format, lint des fichiers touchés), commit-msg (commits conventionnels), pre-push (`pnpm check`)                                                                                                                                                                                               | T     | 1.3      | `lefthook.yml`, `commitlint.config.js`                                            | Un message de commit non conforme est refusé                                                 |
| 1.6 | Cadre agents : `CLAUDE.md` racine + un par paquet, `.claude/agents/` (les quatre agents, ajustés à la stack), `.claude/settings.json` avec un crochet qui lance `pnpm check` à la fin d'une tâche, skills retenus de `addyosmani/agent-skills` copiés dans `.claude/skills/` avec la liste et la raison dans `docs/adr/0010` | P     | 1.2      | `CLAUDE.md`, `packages/*/CLAUDE.md`, `.claude/**`                                 | Relecture : chaque `CLAUDE.md` < 80 lignes et ne répète aucune règle déjà vérifiée par outil |
| 1.7 | ADR 0001 à 0009 : une par décision de la conception (section 1) ; `CONCEPT.md`, la conception et ce plan copiés dans `docs/`                                                                                                                                                                                                 | P     | 1.2      | `docs/adr/*.md`, `docs/**`                                                        | —                                                                                            |
| 1.8 | CI sur chaque PR : installation, `pnpm check`, résumé lisible. Protection de `next` puis de `main` : PR obligatoire, CI verte obligatoire                                                                                                                                                                                    | T     | 1.4, 1.5 | `.github/workflows/ci.yml`, `.github/pull_request_template.md`, modèles de ticket | Une PR avec un test rouge ne peut pas être fusionnée                                         |
| 1.9 | Versions : release-please (numéro et journal générés à partir des commits)                                                                                                                                                                                                                                                   | T     | 1.8      | `.github/workflows/release.yml`, `release-please-config.json`                     | Une PR de version s'ouvre après la première fusion                                           |

## Phase 2 — Données (`packages/data`)

| #   | Tâche                                                                                                                                                                                                                       | Agent | Après | Fichiers                                        | Vérif                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | ----------------------------------------------- | ------------------------------------------------------------- |
| 2.1 | Schémas (zod) : ressource, organite, mutation, palier de déblocage (condition, date minimale, éléments visibles, ordres autorisés, mise en scène)                                                                           | E     | 1.4   | `src/schema/*.ts`                               | Tests : une donnée invalide est refusée avec un message clair |
| 2.2 | Table de déblocage complète (paliers 0 à 8, conditions de la conception). Test de cohérence : chaque ordre et chaque élément d'interface appartient à exactement un palier                                                  | E     | 2.1   | `src/unlocks.ts`, `src/unlocks.test.ts`         | `pnpm --filter data test`                                     |
| 2.3 | Équilibrage paliers 0 à 2 : 2 ressources, 4 organites, 6 mutations (3 proposées au hasard), coûts et durées par formule. Cible écrite : palier 1 en < 1 min, palier 2 en 10 à 15 min, jamais plus de 90 s sans rien à faire | E     | 2.1   | `src/balance.ts`, `docs/equilibrage/journal.md` | Validée en 6.2 par les robots                                 |
| 2.4 | Textes FR et EN (mots simples), clés typées. Test : aucune clé manquante dans une langue                                                                                                                                    | I     | 2.1   | `src/i18n/{fr,en}.ts`, `src/i18n/i18n.test.ts`  | `pnpm --filter data test`                                     |

## Phase 3 — Moteur (`packages/core`)

Signature unique : `appliquer(état, ordre, maintenant, graine) → { état, événements } | erreur`.

| #   | Tâche                                                                                                                                                                                  | Agent | Après    | Fichiers                                         | Vérif                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| 3.1 | État du joueur, hasard semé, erreurs typées, sérialisation. Test : sérialiser puis relire redonne le même état                                                                         | B     | 2.1      | `src/state.ts`, `src/rng.ts`, `src/errors.ts`    | `pnpm --filter core test`                                           |
| 3.2 | Avancer le temps : production passive, plafonds de stockage, fin des chantiers. Propriétés : avancer de a puis b = avancer de a+b ; aucune ressource négative ; le temps ne recule pas | B     | 3.1, 2.3 | `src/advance.ts`, `src/advance.property.test.ts` | idem                                                                |
| 3.3 | Ordre `recolter` (le toucher du palier 0), avec limite de débit dans la règle                                                                                                          | B     | 3.2      | `src/orders/harvest.ts`                          | idem                                                                |
| 3.4 | Ordres `construire` et `ameliorer` : coût, durée, un chantier à la fois                                                                                                                | B     | 3.2      | `src/orders/build.ts`                            | idem                                                                |
| 3.5 | Déblocage : évalue les conditions de la table après chaque ordre, émet l'événement « palier atteint », refuse tout ordre d'un palier non atteint                                       | B     | 2.2, 3.3 | `src/unlock.ts`                                  | Test paramétré sur chaque palier 0 à 2 : ordres acceptés et refusés |
| 3.6 | Mutations : tirage de 3 parmi les disponibles (semé), ordre `choisir_mutation`, effets, traits visibles de la créature dérivés de l'état                                               | B     | 3.5      | `src/orders/mutation.ts`, `src/creature.ts`      | Même graine = même tirage ; deux graines = créatures différentes    |
| 3.7 | Résumé d'absence : ce qui s'est passé entre deux instants, sous forme d'événements                                                                                                     | B     | 3.2      | `src/absence.ts`                                 | idem                                                                |
| 3.8 | Déterminisme global : rejouer une liste d'ordres enregistrée redonne l'état exact, octet pour octet                                                                                    | T     | 3.6      | `src/replay.property.test.ts`                    | idem                                                                |

## Phase 4 — Serveur (`packages/server`, Supabase)

| #   | Tâche                                                                                                                                                                                                                                     | Agent | Après    | Fichiers                                 | Vérif                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 4.1 | Migration 0001 : `saisons` (graine, début), `joueurs`, `etats_joueur` (état, version, dernière mise à jour), `ordres` (identifiant unique, résultat). Accès refusé par défaut ; un joueur ne lit que son état et n'écrit rien directement | B     | 3.1, 0.3 | `supabase/migrations/0001_*.sql`         | Tests des règles d'accès : un autre joueur ne lit rien, une écriture directe est refusée                         |
| 4.2 | Fonction `ordre` : vérifie le jeton, valide l'ordre par schéma, verrouille l'état, avance le temps avec l'heure du serveur, applique via `core`, enregistre, répond. Rejouer le même identifiant renvoie le même résultat                 | B     | 4.1, 3.6 | `supabase/functions/ordre/`              | Tests : ordre rejoué, deux ordres simultanés, ordre d'un palier non atteint, heure envoyée par le client ignorée |
| 4.3 | Fonction `etat` : renvoie l'état à jour et le résumé d'absence ; crée le joueur et l'inscrit à la saison en cours à la première visite                                                                                                    | B     | 4.2, 3.7 | `supabase/functions/etat/`               | Test : première visite, puis retour après 8 h simulées                                                           |
| 4.4 | Comptes : connexion anonyme à l'arrivée ; rattacher un e-mail conserve la partie ; suppression du compte efface tout                                                                                                                      | B     | 4.3, 0.4 | `supabase/functions/compte/`             | Tests des trois parcours                                                                                         |
| 4.5 | CI serveur : base locale Supabase dans la CI, migrations rejouées sur base vide, tests 4.1 à 4.4. Déploiement des migrations et fonctions après fusion                                                                                    | T     | 4.2      | `.github/workflows/ci.yml`, `deploy.yml` | CI verte                                                                                                         |
| 4.6 | Migration 0002 : retirer les tables de sauvegarde du brouillon. **Efface les parties en ligne du brouillon — exécutée seulement à la phase 8, accord déjà donné dans la conception**                                                      | B     | 8.1      | `supabase/migrations/0002_*.sql`         | —                                                                                                                |

## Phase 5 — Client (`packages/client`)

| #   | Tâche                                                                                                                                                                                              | Agent | Après    | Fichiers                                              | Vérif                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 5.1 | Vite + React + PixiJS, jetons de design (couleurs, typographies, espacements du carnet de laboratoire), polices embarquées, page installable                                                       | I     | 1.4      | `src/theme/tokens.ts`, `index.html`, `vite.config.ts` | `pnpm --filter client build` ; règle lint : aucune couleur en dur hors des jetons         |
| 5.2 | Couche de jeu : charge l'état, envoie les ordres, prévoit l'effet avec `core` puis s'aligne sur la réponse du serveur ; hors ligne, file d'attente des ordres                                      | I     | 4.3      | `src/game/store.ts`, `src/game/api.ts`                | Tests avec un faux serveur : réponse différente de la prévision → l'écran suit le serveur |
| 5.3 | La cellule vivante (PixiJS) : respiration, mouvement, réaction au toucher, apparence dérivée des traits de `core`. 60 images par seconde sur téléphone moyen ; respecte « réduire les animations » | I     | 5.1, 3.6 | `src/cell/**`                                         | Captures de référence : cellule de base et 3 créatures mutées (graines fixes)             |
| 5.4 | Palier 0 : l'écran ne montre que la cellule et une ressource ; toucher = récolter, avec retour visuel et sonore discret                                                                            | I     | 5.2, 5.3 | `src/screens/Cell.tsx`                                | Bout en bout : un nouveau joueur récolte en moins de 5 s sans lire de texte               |
| 5.5 | Dévoilement : un composant `Debloque` qui n'affiche son contenu que si le palier est atteint ; mise en scène de chaque déblocage (« votre cellule vient d'apprendre à… »)                          | I     | 5.4, 3.5 | `src/unlock/**`                                       | Test par palier 0, 1, 2 : liste exacte des éléments visibles                              |
| 5.6 | Palier 1 : emplacements d'organites autour du noyau, fiche de construction (un coût, une durée, un bouton), chantier en cours visible sur la cellule                                               | I     | 5.5, 3.4 | `src/screens/Build.tsx`                               | Bout en bout : construire un organite, la production démarre                              |
| 5.7 | Palier 2 : deuxième ressource, choix d'une mutation parmi 3 cartes, transformation animée de la créature                                                                                           | I     | 5.6      | `src/screens/Mutation.tsx`                            | Bout en bout + captures                                                                   |
| 5.8 | Retour de pause (« pendant votre absence »), bascule FR/EN, lien « retrouver ma partie » par e-mail, page de confidentialité                                                                       | I     | 5.2, 4.4 | `src/screens/**`                                      | Bout en bout : fermer, revenir, voir le résumé                                            |
| 5.9 | Accessibilité et budgets : contrastes, clavier, libellés ; page < 300 Ko compressée au premier chargement, jouable en < 3 s en 4G                                                                  | I + T | 5.7      | `lighthouserc.json`                                   | Budgets verts en CI                                                                       |

## Phase 6 — Robots (`packages/bots`)

| #   | Tâche                                                                                                                                                                            | Agent | Après | Fichiers                                | Vérif                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | --------------------------------------- | ----------------------------------------------------------- |
| 6.1 | Robots joueurs sur `core` : débutant (lent, hésitant), appliqué, absent (revient toutes les 8 h). Rapport : heure d'atteinte de chaque palier, plus long temps sans rien à faire | E     | 3.6   | `src/players/*.ts`, `src/report.ts`     | `pnpm bots` produit le rapport                              |
| 6.2 | Régler `data` jusqu'à ce que les cibles de 2.3 soient atteintes ; les cibles deviennent des tests                                                                                | E     | 6.1   | `packages/data/src/balance.ts`, journal | Tests de cibles verts ; tableau avant/après dans le journal |
| 6.3 | Robot qui clique au hasard dans le vrai navigateur : aucune erreur, aucun « NaN », aucune ressource négative ; graine notée à chaque bug                                         | T     | 5.7   | `e2e/monkey.spec.ts`                    | 20 parties sans erreur                                      |

## Phase 7 — Bout en bout, visuel, mise en ligne

| #   | Tâche                                                                                                                               | Agent | Après    | Fichiers                                        | Vérif                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| 7.1 | Playwright, téléphone et ordinateur : la première session complète (arrivée → mutation), contre la base locale                      | T     | 5.7, 4.5 | `e2e/first-session.spec.ts`                     | CI verte                                                                              |
| 7.2 | Comparaison visuelle des écrans clés des paliers 0, 1, 2, en FR, deux tailles                                                       | T     | 7.1      | `e2e/visual.spec.ts`, captures de référence     | Un changement de couleur volontaire fait échouer la CI ; le retirer                   |
| 7.3 | Cloudflare Pages : préversion par PR (lien posté dans la PR), déploiement de `next` sur une adresse de préproduction                | T     | 5.1, 0.2 | `.github/workflows/deploy.yml`, `wrangler.toml` | Le lien de préversion s'ouvre et joue                                                 |
| 7.4 | Après déploiement : la première session est rejouée sur le site en ligne ; en cas d'échec, retour à la version précédente et alerte | T     | 7.3, 7.1 | `.github/workflows/deploy.yml`                  | Déployer exprès une version cassée sur la préproduction : retour automatique constaté |
| 7.5 | Chaque nuit : robots 6.1 sur 50 graines, robot 6.3 sur 100 parties ; un ticket est ouvert si un bug est trouvé                      | T     | 6.3      | `.github/workflows/nuit.yml`                    | Lancement manuel réussi                                                               |

## Phase 8 — Bascule

| #   | Tâche                                                                                                                                                     | Agent | Après  | Vérif                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ | -------------------------------------------------------------- |
| 8.1 | Revue complète par `tests-qualite` de la préproduction : première session sur un vrai téléphone, FR et EN, verdict écrit                                  | T     | toutes | Verdict « bon à fusionner »                                    |
| 8.2 | `next` devient `main` (l'ancien `main` reste dans `archive/brouillon-v1`). GitHub Pages est remplacé par une page de redirection vers la nouvelle adresse | P     | 8.1    | L'ancienne adresse mène au nouveau jeu                         |
| 8.3 | Appliquer la migration 0002 (4.6)                                                                                                                         | B     | 8.2    | Les anciennes tables n'existent plus, les comptes sont intacts |
| 8.4 | README neuf (court, en français simple), version 1.0.0, mise à jour du lien de l'artefact et du Discord                                                   | P     | 8.2    | —                                                              |

---

## Ordre et parallélisme

```
0.1 → 1.1 → 1.2 → 1.3 → 1.4 ─┬→ 2.x → 3.x ─┬→ 4.x ─┬→ 5.2 … 5.9 ─┬→ 7.x → 8.x
                  └ 1.5-1.9 ─┘             ├→ 6.1, 6.2          │
                                           └→ 5.1, 5.3 (dès 3.6) ┘
```

- Sans les secrets (0.2 à 0.4), on peut aller jusqu'au bout des phases 1, 2, 3, 6.1, 6.2 et
  de 5.1, 5.3, la cellule tournant sur le moteur local.
- Premier point de contrôle pour le propriétaire : fin de 5.4 sur une préversion — « je touche
  la cellule, c'est beau, ça répond ».
- Deuxième point de contrôle : fin de 7.3 — la première session complète en ligne.

## Après cette version

Un plan par palier, dans l'ordre : 3 (carte, énergie), 4 (troupes, chasse, coffres, quêtes),
5 (rivaux simulés, espionnage, pillage, protections), 6 (classement, ligues, Gazette, planche),
7 (alliances), 8 (rangs supérieurs, crise, APEX, Muséum).

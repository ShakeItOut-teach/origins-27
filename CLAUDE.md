# Origins 27

Jeu de stratégie persistant dans le navigateur : de la bactérie à l'APEX, saison de 27 jours,
500 organismes. **Tout le code est écrit par des agents.** Le propriétaire n'est pas
développeur : il valide en jouant et lit des explications en français simple.

## À lire avant d'agir

1. `docs/CONCEPT.md` — l'intention du jeu.
2. `docs/specs/` — la conception validée. `docs/plans/` — le plan en cours : prends une tâche, pas plus.
3. `docs/adr/` — les décisions d'architecture. On ne les contourne pas ; on en propose une nouvelle.
4. Le `CLAUDE.md` du paquet où tu travailles.

## La règle n° 1 : complexité progressive

Le joueur entre dans un jeu très simple et très beau ; les mécaniques arrivent une par une.
Une seule table de déblocage (`packages/data`) pilote le moteur, le serveur et l'interface.
Une mécanique non débloquée n'existe pas à l'écran et ses ordres sont refusés.
Chaque palier est livré complet avant de commencer le suivant.

## Paquets

| Paquet   | Rôle                                          | Dépend de      |
| -------- | --------------------------------------------- | -------------- |
| `core`   | Règles du jeu, pures et déterministes         | `data`         |
| `data`   | Équilibrage, table de déblocage, textes FR/EN | rien           |
| `server` | Supabase : ordres, base, comptes              | `core`, `data` |
| `client` | React + PixiJS                                | `core`, `data` |
| `bots`   | Robots joueurs et rivaux simulés              | `core`, `data` |

## Commandes

- `pnpm check` — tout ce que vérifie la CI : format, lint, types, frontières, tests. **À lancer et à coller avant de dire « terminé ».**
- `pnpm format:fix` — remet en forme.
- `pnpm hooks` — installe les crochets Git locaux.

## Façon de travailler

- Une tâche du plan = une branche = une PR vers `next`. Commits conventionnels (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Le test d'abord. Un bug corrigé = un test qui échouait avant.
- Jamais de règle désactivée, de test ignoré ni de seuil abaissé pour faire passer une PR.
- Pas de dépendance nouvelle sans ADR. TypeScript reste en version 6 tant que typescript-eslint ne gère pas la 7.
- Code en anglais ; commentaires, documents et messages au propriétaire en français simple.
- Déployer ne demande pas d'accord une fois `pnpm check` et la CI au vert. Demander un accord
  pour : ressource payante, effacement de données de joueurs, ancien site.
- Agents spécialisés : `.claude/agents/` (backend-senior, interface-senior, equilibrage, tests-qualite).

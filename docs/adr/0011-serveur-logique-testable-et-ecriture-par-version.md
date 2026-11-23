# 0011 — Serveur : logique testable hors Supabase, écriture protégée par un numéro de version

Date : 2026-11-23 · État : accepté

## Contexte

Le plan prévoyait deux fonctions Supabase (`ordre`, `etat`) qui verrouillent l'état du joueur.
Les fonctions Supabase tournent sous Deno, hors de nos outils de test habituels.

## Décision

- Toute la logique est dans `packages/server/src/service.ts`, derrière une interface
  `Repository`. Elle se teste avec une base en mémoire, sans Supabase.
- Une seule fonction Supabase, `jeu`, avec deux chemins (`/jeu/etat`, `/jeu/ordre`). Elle ne
  fait que reconnaître le joueur, brancher la base et traduire la réponse en HTTP.
- `pnpm server:bundle` assemble `packages/server` en un seul fichier importé par la fonction,
  et vérifie que ce fichier fonctionne. La CI le lance à chaque fois.
- Pas de verrou tenu pendant le calcul : chaque état a un numéro de version. La fonction SQL
  `enregistrer` écrit l'état et l'ordre d'un seul coup, seulement si la version n'a pas changé ;
  sinon le serveur relit et recommence (4 essais, puis réponse « occupé »).
- Un ordre refusé par les règles est enregistré lui aussi : le rejouer redonne le même refus.

## Conséquences

- Les cas difficiles (ordre rejoué, ordres simultanés, horloge qui recule) sont couverts par des
  tests rapides. Les règles d'accès de la base sont testées en CI sur une base vide
  (`supabase/tests/acces.sql`).
- Le fichier `supabase/functions/jeu/index.ts` lui-même n'est pas couvert par ces tests : il est
  vérifié par l'essai de bout en bout après déploiement (phase 7).

# server — Supabase

Le serveur fait foi. Il reçoit des ordres, appelle `core`, écrit en base.

- Aucune règle de jeu réécrite ici : tout passe par `core`.
- Toute entrée du client est validée par schéma ; l'heure envoyée par le client est ignorée.
- Ordres idempotents (identifiant unique) et transactionnels (verrou sur l'état du joueur).
- Accès refusé par défaut ; chaque règle d'accès a son test.
- Migrations numérotées, en avant seulement, rejouables sur une base vide. Ne jamais modifier une migration fusionnée.
- Aucun secret dans le dépôt.

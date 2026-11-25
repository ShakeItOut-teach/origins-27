# ADR 0013 — Un jeu installable, sans bibliothèque de plus

Date : 2026-11-25 · État : acceptée

## Contexte

Sur iPhone, les notifications ne marchent que si le jeu est ajouté à l'écran d'accueil. Les
notifications sont nécessaires avant toute attaque entre vrais joueurs. Il faut donc d'abord
que le jeu s'installe.

## Décision

- Trois fichiers servis tels quels depuis `packages/client/public` : la fiche d'installation
  (`manifest.webmanifest`), les icônes (`icons/`), et le programme de mise en réserve (`sw.js`).
- **Aucune dépendance nouvelle** (pas de `vite-plugin-pwa`). Le programme de mise en réserve
  fait 60 lignes, écrites à la main.
- Il ne peut pas enfermer un joueur dans une vieille version : la page est toujours demandée
  au réseau d'abord, la réserve ne sert qu'en panne ; seuls les fichiers de `/assets/`, dont le
  nom porte une empreinte, viennent de la réserve. Il ne touche jamais aux appels au serveur.
- Les icônes sont dessinées par `scripts/make-icons.cjs`, sans bibliothèque : la cellule dans
  l'objectif, sur le papier du carnet. Elles seront refaites quand l'identité visuelle le sera.
- L'installation se propose dans la fiche « Ma partie », jamais à l'arrivée : un bouton quand
  le navigateur le permet (Android, ordinateur), le geste à faire sur iPhone.
- `packages/client/public/**` sort du lint : ce ne sont ni du TypeScript ni des fichiers
  passés par le build.

## Conséquences

- Le jeu s'ouvre sans connexion (la page gardée en réserve), puis se resynchronise.
- La mesure d'audience sait si le jeu est installé (`installe` dans `presences`).
- Les notifications restent à faire : elles demanderont un abonnement par appareil, gardé sur
  le serveur, et une demande d'autorisation faite au bon moment, jamais à l'arrivée.

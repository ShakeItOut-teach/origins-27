# ADR 0012 — Autour du jeu : audience, avis, Muséum, sauvegardes, suppression de compte

Date : 2026-11-25 · État : acceptée

## Contexte

Le bilan des jeux comparables (`docs/veille/2026-11-25-bilan-jeux-comparables.md`) conclut
que le jeu manque de vrais joueurs, pas de mécaniques. Avant d'ouvrir un monde partagé, il
faut savoir qui vient et qui revient, entendre les joueurs, ne rien perdre de leurs parties,
et respecter leurs droits. Le propriétaire a demandé « le plus de statistiques possible ».

## Décision

- **Mesure d'audience faite maison, sur notre serveur.** Aucun outil extérieur, aucun traceur,
  aucun cookie en plus. À chaque visite (`/jeu/etat`) et à chaque ordre (`/jeu/ordre`), le
  serveur note : le jour, le jour de saison, le palier, la puissance, le nombre de visites et
  d'ordres, le temps passé (deux appels à moins de cinq minutes d'écart), le type de chaque
  ordre et s'il a été accepté. L'appareil ajoute quatre choses, validées par schéma : la
  langue, la sorte d'appareil, si le jeu est installé, et la source (`?s=discord` dans nos
  liens, sinon le site d'où le joueur arrive). Une ligne par joueur et par jour : `presences`.
- **Ces notes ne retardent jamais le jeu et ne le font jamais échouer.** Elles partent après la
  réponse ; une erreur va dans le journal du serveur.
- **Les statistiques ne sortent que pour un « gardien »**, par `/jeu/stats`, et ne contiennent
  que des totaux : aucun identifiant de joueur. On devient gardien par une ligne ajoutée à la
  main dans la table `gardiens`, depuis l'éditeur SQL de Supabase :
  `insert into public.gardiens (joueur) select id from auth.users where email = 'votre e-mail';`
  L'e-mail n'est jamais écrit dans le dépôt.
- **Avis** : `/jeu/avis`, une note de 1 à 5 et un texte de 1000 caractères au plus, cinq avis
  par joueur et par jour. Si le joueur supprime son compte, l'avis reste, sans lui.
- **Muséum sur le serveur** : la planche est calculée par `core` (`museumPlate`) et gardée à
  chaque visite dès que le Muséum est ouvert (palier 12) ou la saison finie. Une planche par
  joueur et par saison ; la dernière visite fait foi. `/jeu/musee` les rend.
- **Sauvegardes** : à la première visite du jour, la partie du joueur est copiée dans
  `sauvegardes`. Sept jours sont gardés. Cela protège d'une erreur de notre code ou d'une
  migration ; cela ne protège pas de la perte du projet Supabase entier (voir « Reste à faire »).
- **Suppression de compte** : `/jeu/supprimer` efface le compte ; tout ce qui est au joueur
  part avec lui (clés étrangères en cascade). C'est le joueur qui le demande, depuis la fiche
  « Ma partie », après un écran de confirmation.
- **Règles et confidentialité** : un écran en mots simples, en français et en anglais.

## Pourquoi

- Une mesure d'audience anonyme, statistique et réservée à l'éditeur peut se passer de bannière
  (CNIL). La nôtre ne lit rien sur l'appareil au-delà de ce que le jeu utilise déjà.
- Tout tient dans les appels existants : aucun appel de plus par visite ou par ordre, donc
  aucun effet sur le quota gratuit de Supabase (500 000 appels par mois).
- Les règles d'accès restent « refusé par défaut » : aucune de ces tables n'est lisible par un
  joueur ; chaque refus a son test dans `supabase/tests/acces.sql`.

## Conséquences

- `packages/server/src/community.ts` porte la logique (testée sans Supabase) ;
  `supabase/migrations/20261125000001_autour_du_jeu.sql` porte les tables et les fonctions.
- La rétention se lit jour par jour : J1, J3, J7, J14 et J27 (qui finit la saison).
- Le Muséum de l'appareil reste lu, pour les planches d'avant et pour l'essai accéléré.

## Reste à faire (décisions du propriétaire)

- **Sauvegarde hors de Supabase.** Deux voies : l'offre payante de Supabase (sauvegardes
  quotidiennes), ou une copie chiffrée chaque nuit par GitHub, qui demande un mot de passe de
  chiffrement de plus dans les secrets.
- **Âge minimum.** L'écran dit « 15 ans et plus, ou avec l'accord d'un parent » (l'âge du
  consentement numérique en France). À confirmer.
- **Contact.** L'écran renvoie au Discord. Une adresse e-mail dédiée serait plus sûre.
- **Changement de saison sur le serveur** : avant d'effacer les parties d'une saison finie, il
  faudra garder la planche de chaque joueur (elle l'est déjà pour ceux venus après le jour 21).

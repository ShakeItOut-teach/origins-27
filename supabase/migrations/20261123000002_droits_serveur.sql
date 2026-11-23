-- Le serveur (clé de service) doit pouvoir lire et écrire les tables du jeu.
-- On le dit explicitement plutôt que de compter sur les droits par défaut du projet.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.saisons, public.etats_joueur, public.ordres
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Origins 27 · droits d'accès aux tables (à lancer après 001_init.sql)
-- Les projets Supabase récents ne donnent aucun droit par défaut sur les nouvelles tables.
-- Ces droits ouvrent la porte ; les règles par ligne (RLS) de 001_init.sql décident ensuite ce que chacun voit :
-- un joueur ne lit et n'écrit que sa propre sauvegarde ; profils et classement sont lisibles par tous.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.leaderboard to anon, authenticated;
grant insert, update on public.profiles, public.leaderboard to authenticated;
grant select, insert, update, delete on public.saves to authenticated;

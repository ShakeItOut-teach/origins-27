-- Monde partagé, étape 1 : « le même océan ». Chaque vrai joueur a une vitrine : ce que les
-- autres humains de la saison voient de lui (nom d'espèce, scores, palier, zone). Elle est
-- calculée par les règles du jeu et écrite par la fonction du serveur, jamais par l'appareil.
-- Accès refusé par défaut : aucun joueur ne lit ni n'écrit cette table directement.

-- Une vitrine par place et par saison. La place appartient au joueur qui l'a prise ; si sa
-- partie passe d'un compte anonyme à un compte lié, la vitrine suit à la visite suivante.
create table public.vitrines (
  saison bigint not null references public.saisons (id) on delete cascade,
  place integer not null check (place >= 0),
  joueur uuid not null references auth.users (id) on delete cascade,
  carte jsonb not null,
  mis_a_jour timestamptz not null default now(),
  primary key (saison, place)
);

create index vitrines_par_joueur on public.vitrines (joueur);

alter table public.vitrines enable row level security;
revoke all on table public.vitrines from public, anon, authenticated;

-- Écrire (ou remplacer) la vitrine d'un joueur.
create function public.montrer_vitrine (
  p_joueur uuid,
  p_saison bigint,
  p_place integer,
  p_carte jsonb
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.vitrines (saison, place, joueur, carte, mis_a_jour)
  values (p_saison, p_place, p_joueur, p_carte, now())
  on conflict (saison, place) do update
    set joueur = excluded.joueur, carte = excluded.carte, mis_a_jour = excluded.mis_a_jour;
$$;

-- Toutes les vitrines d'une saison : aucune n'y dit à quel compte elle appartient.
create function public.lire_vitrines (p_saison bigint) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(v.carte order by v.place), '[]'::jsonb)
  from public.vitrines v
  where v.saison = p_saison;
$$;

revoke all on function
  public.montrer_vitrine (uuid, bigint, integer, jsonb),
  public.lire_vitrines (bigint)
from public, anon, authenticated;

grant execute on function
  public.montrer_vitrine (uuid, bigint, integer, jsonb),
  public.lire_vitrines (bigint)
to service_role;

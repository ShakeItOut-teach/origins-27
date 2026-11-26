-- Monde partagé, étape 1 (suite) : les gisements vraiment partagés entre humains, et ce que
-- le gardien peut en mesurer. Accès refusé par défaut, comme partout.

-- Ce que les humains ont pris dans chaque gisement de la saison. Pas de colonne joueur : on
-- sait combien est parti, pas qui l'a pris.
create table public.prises (
  saison bigint not null references public.saisons (id) on delete cascade,
  gisement text not null check (gisement ~ '^d:-?\d{1,4}:-?\d{1,4}:\d{1,9}$'),
  quantite bigint not null check (quantite >= 0),
  mis_a_jour timestamptz not null default now(),
  primary key (saison, gisement)
);

-- Pourquoi les ordres sont refusés, par jour : « depleted », « noEnergy », « human »…
create table public.usage_refus (
  jour date not null,
  code text not null check (char_length(code) <= 40),
  nombre integer not null default 0,
  primary key (jour, code)
);

alter table public.prises enable row level security;
alter table public.usage_refus enable row level security;
revoke all on table public.prises, public.usage_refus from public, anon, authenticated;

-- Un humain a chargé `p_quantite` (en millionièmes d'unité) dans un gisement.
create function public.prendre_gisement (p_saison bigint, p_gisement text, p_quantite bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.prises (saison, gisement, quantite, mis_a_jour)
  values (p_saison, p_gisement, greatest(p_quantite, 0), now())
  on conflict (saison, gisement) do update
    set quantite = public.prises.quantite + excluded.quantite, mis_a_jour = excluded.mis_a_jour;
$$;

-- Un ordre refusé par les règles, compté par motif.
create function public.noter_refus (p_jour date, p_code text) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.usage_refus (jour, code, nombre)
  values (p_jour, p_code, 1)
  on conflict (jour, code) do update set nombre = public.usage_refus.nombre + 1;
$$;

-- La foule d'une saison : les vitrines des humains, et ce qu'ils ont pris dans les gisements
-- de ces trois derniers jours (un gisement ne vit pas plus longtemps).
create function public.lire_foule (p_saison bigint) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cards', (
      select coalesce(jsonb_agg(v.carte order by v.place), '[]'::jsonb)
      from public.vitrines v
      where v.saison = p_saison
    ),
    'taken', (
      select coalesce(jsonb_object_agg(p.gisement, p.quantite), '{}'::jsonb)
      from public.prises p
      where p.saison = p_saison and p.mis_a_jour > now() - interval '3 days'
    )
  );
$$;

-- Ce que le gardien voit du monde partagé. Null pour tout autre compte. Que des totaux.
create function public.statistiques_ocean (p_joueur uuid, p_saison bigint, p_aujourdhui date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retour jsonb;
begin
  if not exists (select 1 from public.gardiens where joueur = p_joueur) then
    return null;
  end if;

  select jsonb_build_object(
    'humains', (select count(*) from public.vitrines v where v.saison = p_saison),
    'actifs24h', (
      select count(*) from public.vitrines v
      where v.saison = p_saison and v.mis_a_jour > now() - interval '1 day'
    ),
    'puissanceMoyenne', (
      select coalesce(round(avg((v.carte -> 'scores' ->> 'power')::bigint)), 0)
      from public.vitrines v
      where v.saison = p_saison
    ),
    'puissanceMax', (
      select coalesce(max((v.carte -> 'scores' ->> 'power')::bigint), 0)
      from public.vitrines v
      where v.saison = p_saison
    ),
    'familles', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.joueurs desc), '[]'::jsonb)
      from (
        select coalesce(v.carte ->> 'family', '?') as nom, count(*) as joueurs
        from public.vitrines v
        where v.saison = p_saison
        group by 1
      ) f
    ),
    'prises', (
      select coalesce(sum(p.quantite), 0) from public.prises p where p.saison = p_saison
    ),
    'refus', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.nombre desc), '[]'::jsonb)
      from (
        select code, sum(nombre) as nombre
        from public.usage_refus
        where jour > p_aujourdhui - 7
        group by code
      ) r
    )
  ) into v_retour;

  return v_retour;
end;
$$;

revoke all on function
  public.prendre_gisement (bigint, text, bigint),
  public.noter_refus (date, text),
  public.lire_foule (bigint),
  public.statistiques_ocean (uuid, bigint, date)
from public, anon, authenticated;

grant execute on function
  public.prendre_gisement (bigint, text, bigint),
  public.noter_refus (date, text),
  public.lire_foule (bigint),
  public.statistiques_ocean (uuid, bigint, date)
to service_role;

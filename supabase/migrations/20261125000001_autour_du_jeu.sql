-- Autour du jeu : mesure d'audience, avis des joueurs, Muséum, sauvegardes, gardiens.
-- Rien ici ne change une partie. Accès refusé par défaut : aucun joueur ne lit ni n'écrit ces
-- tables ; tout passe par la fonction du serveur, avec la clé de service.

-- D'où et quand chaque joueur est arrivé. Une ligne par joueur, écrite à sa première visite.
create table public.arrivees (
  joueur uuid primary key references auth.users (id) on delete cascade,
  jour date not null,
  source text,
  langue text,
  appareil text,
  arrive_le timestamptz not null default now()
);

-- Un joueur, un jour : est-il venu, combien de fois, combien de temps, où en est-il.
create table public.presences (
  joueur uuid not null references auth.users (id) on delete cascade,
  jour date not null,
  jour_saison integer not null,
  palier integer not null,
  puissance bigint not null default 0,
  visites integer not null default 0,
  ordres integer not null default 0,
  secondes integer not null default 0,
  langue text,
  appareil text,
  installe boolean,
  premiere timestamptz not null default now(),
  derniere timestamptz not null default now(),
  primary key (joueur, jour)
);

create index presences_par_jour on public.presences (jour);

-- Ce qui est joué : chaque type d'ordre, par jour, accepté ou refusé par les règles.
create table public.usage_ordres (
  jour date not null,
  type text not null,
  acceptes integer not null default 0,
  refuses integer not null default 0,
  primary key (jour, type)
);

-- Les avis des joueurs. Si le joueur supprime son compte, son avis reste, sans lui.
create table public.avis (
  id bigint generated always as identity primary key,
  joueur uuid references auth.users (id) on delete set null,
  jour date not null,
  jour_saison integer not null,
  palier integer not null,
  note smallint check (note between 1 and 5),
  texte text not null default '' check (char_length(texte) <= 1000),
  langue text,
  cree_le timestamptz not null default now()
);

create index avis_par_joueur on public.avis (joueur, jour);

-- Le Muséum : la planche de l'espèce de chaque joueur, une par saison.
-- `saison` est le début de la saison en millisecondes, comme dans l'état du joueur.
create table public.planches (
  joueur uuid not null references auth.users (id) on delete cascade,
  saison bigint not null,
  planche jsonb not null,
  mis_a_jour timestamptz not null default now(),
  primary key (joueur, saison)
);

-- Sauvegardes : la partie de chaque joueur à sa première visite du jour, gardée sept jours.
create table public.sauvegardes (
  joueur uuid not null references auth.users (id) on delete cascade,
  jour date not null,
  etat jsonb not null,
  version integer not null,
  primary key (joueur, jour)
);

-- Les gardiens : les comptes qui ont le droit de lire les statistiques et les avis.
-- On y ajoute un compte à la main, depuis l'éditeur SQL de Supabase.
create table public.gardiens (
  joueur uuid primary key references auth.users (id) on delete cascade,
  ajoute_le timestamptz not null default now()
);

alter table public.arrivees enable row level security;
alter table public.presences enable row level security;
alter table public.usage_ordres enable row level security;
alter table public.avis enable row level security;
alter table public.planches enable row level security;
alter table public.sauvegardes enable row level security;
alter table public.gardiens enable row level security;

revoke all on
  public.arrivees, public.presences, public.usage_ordres, public.avis, public.planches,
  public.sauvegardes, public.gardiens
from anon, authenticated;

grant select, insert, update, delete on
  public.arrivees, public.presences, public.usage_ordres, public.avis, public.planches,
  public.sauvegardes, public.gardiens
to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Une visite : le joueur a ouvert le jeu. D'un seul coup : son arrivée s'il est nouveau, sa
-- présence du jour, la sauvegarde du jour, et sa planche du Muséum s'il y en a une.
create function public.noter_visite (
  p_joueur uuid,
  p_jour date,
  p_jour_saison integer,
  p_palier integer,
  p_puissance bigint,
  p_langue text,
  p_appareil text,
  p_installe boolean,
  p_source text,
  p_saison bigint,
  p_planche jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.arrivees (joueur, jour, source, langue, appareil)
  values (p_joueur, p_jour, p_source, p_langue, p_appareil)
  on conflict (joueur) do nothing;

  insert into public.presences
    (joueur, jour, jour_saison, palier, puissance, visites, langue, appareil, installe)
  values
    (p_joueur, p_jour, p_jour_saison, p_palier, p_puissance, 1, p_langue, p_appareil, p_installe)
  on conflict (joueur, jour) do update set
    jour_saison = excluded.jour_saison,
    palier = excluded.palier,
    puissance = excluded.puissance,
    visites = public.presences.visites + 1,
    langue = coalesce(excluded.langue, public.presences.langue),
    appareil = coalesce(excluded.appareil, public.presences.appareil),
    installe = coalesce(excluded.installe, public.presences.installe),
    -- Deux appels à moins de cinq minutes d'écart : le joueur était là entre les deux.
    secondes = public.presences.secondes + case
      when now() - public.presences.derniere <= interval '5 minutes'
        then extract(epoch from now() - public.presences.derniere)::integer
      else 0
    end,
    derniere = now();

  insert into public.sauvegardes (joueur, jour, etat, version)
  select e.joueur, p_jour, e.etat, e.version
  from public.etats_joueur e
  where e.joueur = p_joueur
  on conflict (joueur, jour) do nothing;

  delete from public.sauvegardes where joueur = p_joueur and jour < p_jour - 7;

  if p_planche is not null then
    insert into public.planches (joueur, saison, planche)
    values (p_joueur, p_saison, p_planche)
    on conflict (joueur, saison) do update set
      planche = excluded.planche,
      mis_a_jour = now();
  end if;
end;
$$;

-- Un ordre traité : on compte son type, et le joueur est présent ce jour-là.
create function public.noter_ordre (
  p_joueur uuid,
  p_jour date,
  p_jour_saison integer,
  p_palier integer,
  p_type text,
  p_accepte boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usage_ordres (jour, type, acceptes, refuses)
  values (p_jour, p_type, case when p_accepte then 1 else 0 end, case when p_accepte then 0 else 1 end)
  on conflict (jour, type) do update set
    acceptes = public.usage_ordres.acceptes + excluded.acceptes,
    refuses = public.usage_ordres.refuses + excluded.refuses;

  insert into public.presences (joueur, jour, jour_saison, palier, ordres)
  values (p_joueur, p_jour, p_jour_saison, p_palier, 1)
  on conflict (joueur, jour) do update set
    jour_saison = excluded.jour_saison,
    palier = excluded.palier,
    ordres = public.presences.ordres + 1,
    secondes = public.presences.secondes + case
      when now() - public.presences.derniere <= interval '5 minutes'
        then extract(epoch from now() - public.presences.derniere)::integer
      else 0
    end,
    derniere = now();
end;
$$;

-- Garde un avis, sauf si le joueur en a déjà donné `p_limite` ce jour-là : alors rien n'est
-- écrit et la réponse est faux.
create function public.donner_avis (
  p_joueur uuid,
  p_jour date,
  p_jour_saison integer,
  p_palier integer,
  p_note smallint,
  p_texte text,
  p_langue text,
  p_limite integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.avis where joueur = p_joueur and jour = p_jour) >= p_limite then
    return false;
  end if;
  insert into public.avis (joueur, jour, jour_saison, palier, note, texte, langue)
  values (p_joueur, p_jour, p_jour_saison, p_palier, p_note, p_texte, p_langue);
  return true;
end;
$$;

-- Les planches d'un joueur, la plus récente d'abord.
create function public.lire_planches (p_joueur uuid) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(p.planche order by p.saison desc), '[]'::jsonb)
  from public.planches p
  where p.joueur = p_joueur;
$$;

-- Les statistiques du jeu, pour un gardien. Renvoie null pour tout autre compte.
-- Que des totaux : aucun identifiant de joueur n'en sort.
create function public.statistiques (p_joueur uuid, p_aujourdhui date) returns jsonb
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
    'joueurs', (select count(*) from public.arrivees),
    'comptesLies', (select count(*) from auth.users u where u.is_anonymous is not true),
    'actifsAujourdhui', (select count(*) from public.presences where jour = p_aujourdhui),
    'actifs7Jours', (
      select count(distinct joueur) from public.presences where jour > p_aujourdhui - 7
    ),
    'jours', (
      select coalesce(jsonb_agg(to_jsonb(j) order by j.jour desc), '[]'::jsonb)
      from (
        select
          d.jour,
          (select count(*) from public.arrivees a where a.jour = d.jour) as nouveaux,
          count(p.joueur) as actifs,
          coalesce(sum(p.visites), 0) as visites,
          coalesce(sum(p.ordres), 0) as ordres,
          coalesce(round(avg(p.secondes)), 0) as secondes
        from (
          select generate_series(p_aujourdhui - 29, p_aujourdhui, interval '1 day')::date as jour
        ) d
        left join public.presences p on p.jour = d.jour
        group by d.jour
      ) j
    ),
    'retention', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.jour), '[]'::jsonb)
      from (
        select
          n.jour,
          count(a.joueur) as arrives,
          count(a.joueur) filter (
            where exists (
              select 1 from public.presences p
              where p.joueur = a.joueur and p.jour = a.jour + n.jour
            )
          ) as revenus,
          count(a.joueur) filter (
            where exists (
              select 1 from public.presences p
              where p.joueur = a.joueur and p.jour >= a.jour + n.jour
            )
          ) as revenus_ou_apres
        from (values (1), (3), (7), (14), (27)) as n (jour)
        left join public.arrivees a on a.jour <= p_aujourdhui - n.jour
        group by n.jour
      ) r
    ),
    'paliers', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.palier), '[]'::jsonb)
      from (
        select coalesce((e.etat ->> 'tier')::integer, 0) as palier, count(*) as joueurs
        from public.etats_joueur e
        group by 1
      ) t
    ),
    'ordres', (
      select coalesce(jsonb_agg(to_jsonb(o) order by o.acceptes desc), '[]'::jsonb)
      from (
        select type, sum(acceptes) as acceptes, sum(refuses) as refuses
        from public.usage_ordres
        where jour > p_aujourdhui - 7
        group by type
      ) o
    ),
    'appareils', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.joueurs desc), '[]'::jsonb)
      from (
        select coalesce(appareil, '?') as nom, count(*) as joueurs
        from public.arrivees
        group by 1
      ) x
    ),
    'langues', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.joueurs desc), '[]'::jsonb)
      from (
        select coalesce(langue, '?') as nom, count(*) as joueurs
        from public.arrivees
        group by 1
      ) x
    ),
    'sources', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.joueurs desc), '[]'::jsonb)
      from (
        select coalesce(source, '?') as nom, count(*) as joueurs
        from public.arrivees
        group by 1
      ) x
    ),
    'installes', (
      select count(distinct joueur) from public.presences
      where installe is true and jour > p_aujourdhui - 7
    ),
    'avis', jsonb_build_object(
      'nombre', (select count(*) from public.avis),
      'moyenne', (select round(avg(note), 1) from public.avis where note is not null),
      'derniers', (
        select coalesce(jsonb_agg(to_jsonb(v) order by v.cree_le desc), '[]'::jsonb)
        from (
          select jour, jour_saison, palier, note, texte, langue, cree_le
          from public.avis
          order by cree_le desc
          limit 40
        ) v
      )
    )
  ) into v_retour;

  return v_retour;
end;
$$;

revoke all on function
  public.noter_visite (uuid, date, integer, integer, bigint, text, text, boolean, text, bigint, jsonb),
  public.noter_ordre (uuid, date, integer, integer, text, boolean),
  public.donner_avis (uuid, date, integer, integer, smallint, text, text, integer),
  public.lire_planches (uuid),
  public.statistiques (uuid, date)
from public, anon, authenticated;

grant execute on function
  public.noter_visite (uuid, date, integer, integer, bigint, text, text, boolean, text, bigint, jsonb),
  public.noter_ordre (uuid, date, integer, integer, text, boolean),
  public.donner_avis (uuid, date, integer, integer, smallint, text, text, integer),
  public.lire_planches (uuid),
  public.statistiques (uuid, date)
to service_role;

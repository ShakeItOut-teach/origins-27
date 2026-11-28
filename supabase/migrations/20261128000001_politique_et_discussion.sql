-- La politique des bannières et la discussion d'alliance (demande du propriétaire, 28/11/2026).
-- - Un chef par bannière, élu par les espèces humaines du banc : chacun a une voix, qu'il peut
--   changer. Le chef est le candidat qui a le plus de voix (à égalité, la plus petite place).
-- - Les guerres : le chef d'une bannière la déclare à une autre, et seul lui y met fin.
-- - La discussion d'alliance : texte libre, entre humains d'un même banc, avec garde-fous
--   (longueur, rythme, masquage après signalements, une semaine de mémoire). Le texte est déjà
--   nettoyé par le serveur (grossièretés, liens) avant d'arriver ici.
-- Accès refusé par défaut : seul le serveur (clé de service) y touche.

create table public.votes_chef (
  saison bigint not null references public.saisons (id) on delete cascade,
  votant uuid not null references auth.users (id) on delete cascade,
  candidat integer not null check (candidat >= 0),
  moment timestamptz not null default now(),
  primary key (saison, votant)
);

create table public.guerres (
  saison bigint not null references public.saisons (id) on delete cascade,
  banniere text not null check (char_length(banniere) <= 8),
  ennemie text not null check (char_length(ennemie) <= 8),
  declaree_le timestamptz not null default now(),
  primary key (saison, banniere, ennemie),
  check (banniere <> ennemie)
);

create table public.messages_alliance (
  id bigint generated always as identity primary key,
  saison bigint not null references public.saisons (id) on delete cascade,
  banniere text not null check (char_length(banniere) <= 8),
  auteur uuid not null references auth.users (id) on delete cascade,
  place integer not null check (place >= 0),
  nom text not null check (char_length(nom) <= 60),
  texte text not null check (char_length(texte) between 1 and 1000),
  signalements integer not null default 0,
  masque boolean not null default false,
  cree_le timestamptz not null default now()
);

create index messages_par_banc on public.messages_alliance (saison, banniere, cree_le desc);
create index messages_par_auteur on public.messages_alliance (auteur, cree_le desc);

create table public.signalements_messages (
  message bigint not null references public.messages_alliance (id) on delete cascade,
  joueur uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (message, joueur)
);

create index signalements_par_joueur on public.signalements_messages (joueur);

alter table public.votes_chef enable row level security;
alter table public.guerres enable row level security;
alter table public.messages_alliance enable row level security;
alter table public.signalements_messages enable row level security;
revoke all on table public.votes_chef, public.guerres, public.messages_alliance,
  public.signalements_messages from public, anon, authenticated;

-- La vitrine d'un joueur cette saison (sa place, son nom, sa bannière, son palier).
create function public.vitrine_de (p_saison bigint, p_joueur uuid) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select v.carte || jsonb_build_object('place', v.place)
  from public.vitrines v
  where v.saison = p_saison and v.joueur = p_joueur
  limit 1;
$$;

-- Les voix de chaque candidat, bannière par bannière. Ne comptent que les voix d'un membre de
-- la bannière (d'après sa vitrine d'aujourd'hui) pour un candidat de la même bannière.
create function public.voix_des_bannieres (p_saison bigint)
returns table (banniere text, place integer, voix bigint)
language sql
security definer
set search_path = ''
as $$
  select vc.carte ->> 'banner', v.candidat, count(*)
  from public.votes_chef v
  join public.vitrines vv on vv.saison = v.saison and vv.joueur = v.votant
  join public.vitrines vc on vc.saison = v.saison and vc.place = v.candidat
  where v.saison = p_saison
    and vc.carte ->> 'banner' is not null
    and vv.carte ->> 'banner' = vc.carte ->> 'banner'
  group by 1, 2;
$$;

-- Le chef d'une bannière : le plus de voix, et à égalité la plus petite place. Null sinon.
create function public.chef_de (p_saison bigint, p_banniere text) returns integer
language sql
security definer
set search_path = ''
as $$
  select c.place
  from public.voix_des_bannieres(p_saison) c
  where c.banniere = p_banniere
  order by c.voix desc, c.place
  limit 1;
$$;

-- Voter (ou changer de vote). Le candidat doit être de la même bannière que le votant, ou le
-- votant lui-même. Faux si le vote est refusé.
create function public.voter_chef (p_saison bigint, p_joueur uuid, p_place integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi jsonb := public.vitrine_de(p_saison, p_joueur);
  v_candidat jsonb;
begin
  if v_moi is null or v_moi ->> 'banner' is null then
    return false;
  end if;
  select v.carte into v_candidat
  from public.vitrines v
  where v.saison = p_saison and v.place = p_place;
  if v_candidat is null or v_candidat ->> 'banner' is distinct from v_moi ->> 'banner' then
    return false;
  end if;
  insert into public.votes_chef (saison, votant, candidat, moment)
  values (p_saison, p_joueur, p_place, now())
  on conflict (saison, votant) do update set candidat = excluded.candidat, moment = now();
  return true;
end;
$$;

-- Déclarer la guerre, ou faire la paix : seul le chef de la bannière le peut.
create function public.declarer_guerre (
  p_saison bigint,
  p_joueur uuid,
  p_ennemie text,
  p_guerre boolean
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi jsonb := public.vitrine_de(p_saison, p_joueur);
  v_banniere text := v_moi ->> 'banner';
begin
  if v_banniere is null or v_banniere = p_ennemie
    or public.chef_de(p_saison, v_banniere) is distinct from (v_moi ->> 'place')::integer then
    return false;
  end if;
  if p_guerre then
    insert into public.guerres (saison, banniere, ennemie)
    values (p_saison, v_banniere, left(p_ennemie, 8))
    on conflict do nothing;
  else
    delete from public.guerres
    where saison = p_saison and banniere = v_banniere and ennemie = p_ennemie;
  end if;
  return true;
end;
$$;

-- La foule d'une saison : les vitrines, les prises des gisements, et maintenant la politique
-- des bannières (chefs, guerres, voix). Même fonction qu'avant, une clé de plus.
create or replace function public.lire_foule (p_saison bigint) returns jsonb
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
    ),
    'politics', jsonb_build_object(
      'leaders', (
        select coalesce(jsonb_object_agg(c.banniere, c.place), '{}'::jsonb)
        from (
          select distinct on (x.banniere) x.banniere, x.place
          from public.voix_des_bannieres(p_saison) x
          order by x.banniere, x.voix desc, x.place
        ) c
      ),
      'wars', (
        select coalesce(jsonb_agg(jsonb_build_array(g.banniere, g.ennemie)
          order by g.declaree_le), '[]'::jsonb)
        from public.guerres g
        where g.saison = p_saison
      ),
      'votes', (
        select coalesce(jsonb_object_agg(b.banniere, b.voix), '{}'::jsonb)
        from (
          select x.banniere, jsonb_object_agg(x.place::text, x.voix) as voix
          from public.voix_des_bannieres(p_saison) x
          group by x.banniere
        ) b
      )
    )
  );
$$;

-- Écrire dans la discussion de son banc. 'ok', 'banc' (pas de banc, ou palier trop bas) ou
-- 'trop' (trop de messages cette minute). Les messages de plus d'une semaine s'effacent.
create function public.ecrire_message (
  p_saison bigint,
  p_joueur uuid,
  p_texte text,
  p_palier integer,
  p_par_minute integer,
  p_jours integer
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi jsonb := public.vitrine_de(p_saison, p_joueur);
begin
  if v_moi is null or v_moi ->> 'banner' is null
    or coalesce((v_moi ->> 'tier')::integer, 0) < p_palier then
    return 'banc';
  end if;
  if (
    select count(*) from public.messages_alliance m
    where m.auteur = p_joueur and m.cree_le > now() - interval '1 minute'
  ) >= p_par_minute then
    return 'trop';
  end if;
  delete from public.messages_alliance m where m.cree_le < now() - make_interval(days => p_jours);
  insert into public.messages_alliance (saison, banniere, auteur, place, nom, texte)
  values (
    p_saison,
    v_moi ->> 'banner',
    p_joueur,
    (v_moi ->> 'place')::integer,
    left(coalesce(v_moi ->> 'name', ''), 60),
    left(p_texte, 1000)
  );
  return 'ok';
end;
$$;

-- La discussion de son banc : les 60 derniers messages de la semaine, sauf les masqués. Null
-- sans banc. Aucun identifiant de compte n'en sort.
create function public.lire_messages (
  p_saison bigint,
  p_joueur uuid,
  p_palier integer,
  p_jours integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi jsonb := public.vitrine_de(p_saison, p_joueur);
begin
  if v_moi is null or v_moi ->> 'banner' is null
    or coalesce((v_moi ->> 'tier')::integer, 0) < p_palier then
    return null;
  end if;
  return (
    select coalesce(jsonb_agg(f.ligne order by f.id), '[]'::jsonb)
    from (
      select m.id, jsonb_build_object(
        'id', m.id,
        'slot', m.place,
        'name', m.nom,
        'text', m.texte,
        'at', (extract(epoch from m.cree_le) * 1000)::bigint,
        'mine', m.auteur = p_joueur,
        'reported', exists (
          select 1 from public.signalements_messages s
          where s.message = m.id and s.joueur = p_joueur
        )
      ) as ligne
      from public.messages_alliance m
      where m.saison = p_saison
        and m.banniere = v_moi ->> 'banner'
        and not m.masque
        and m.cree_le > now() - make_interval(days => p_jours)
      order by m.id desc
      limit 60
    ) f
  );
end;
$$;

-- Signaler un message de son banc (pas le sien). Après assez de signalements, il est masqué.
create function public.signaler_message (
  p_saison bigint,
  p_joueur uuid,
  p_message bigint,
  p_masquer_apres integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_moi jsonb := public.vitrine_de(p_saison, p_joueur);
  v_compte integer;
begin
  if v_moi is null or not exists (
    select 1 from public.messages_alliance m
    where m.id = p_message and m.saison = p_saison
      and m.banniere = v_moi ->> 'banner' and m.auteur <> p_joueur
  ) then
    return false;
  end if;
  insert into public.signalements_messages (message, joueur)
  values (p_message, p_joueur)
  on conflict do nothing;
  if not found then
    return true;
  end if;
  update public.messages_alliance
  set signalements = signalements + 1, masque = signalements + 1 >= p_masquer_apres
  where id = p_message
  returning signalements into v_compte;
  return true;
end;
$$;

-- Ce que le gardien voit des alliances : que des totaux (aucun texte, aucun compte).
create function public.statistiques_alliances (p_joueur uuid, p_saison bigint) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.gardiens where joueur = p_joueur) then
    return null;
  end if;
  return jsonb_build_object(
    'messages7j', (
      select count(*) from public.messages_alliance m
      where m.saison = p_saison and m.cree_le > now() - interval '7 days'
    ),
    'signales', (
      select count(*) from public.messages_alliance m
      where m.saison = p_saison and m.signalements > 0
    ),
    'masques', (
      select count(*) from public.messages_alliance m
      where m.saison = p_saison and m.masque
    ),
    'votants', (select count(*) from public.votes_chef v where v.saison = p_saison),
    'chefs', (
      select count(distinct c.banniere) from public.voix_des_bannieres(p_saison) c
    ),
    'guerres', (select count(*) from public.guerres g where g.saison = p_saison)
  );
end;
$$;

revoke all on function
  public.vitrine_de (bigint, uuid),
  public.voix_des_bannieres (bigint),
  public.chef_de (bigint, text),
  public.voter_chef (bigint, uuid, integer),
  public.declarer_guerre (bigint, uuid, text, boolean),
  public.lire_foule (bigint),
  public.ecrire_message (bigint, uuid, text, integer, integer, integer),
  public.lire_messages (bigint, uuid, integer, integer),
  public.signaler_message (bigint, uuid, bigint, integer),
  public.statistiques_alliances (uuid, bigint)
from public, anon, authenticated;

grant execute on function
  public.vitrine_de (bigint, uuid),
  public.voix_des_bannieres (bigint),
  public.chef_de (bigint, text),
  public.voter_chef (bigint, uuid, integer),
  public.declarer_guerre (bigint, uuid, text, boolean),
  public.lire_foule (bigint),
  public.ecrire_message (bigint, uuid, text, integer, integer, integer),
  public.lire_messages (bigint, uuid, integer, integer),
  public.signaler_message (bigint, uuid, bigint, integer),
  public.statistiques_alliances (uuid, bigint)
to service_role;

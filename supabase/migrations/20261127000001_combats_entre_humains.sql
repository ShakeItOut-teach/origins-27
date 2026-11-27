-- Monde partagé, étape 3 : les combats entre humains.
-- La file des attaques (une ligne par attaque, de son départ à son combat), les renforts
-- envoyés par les alliés, les espionnages, et ce que le jeu en raconte aux bancs (deux fils
-- tenus par le jeu, sans texte libre). Le combat lui-même est calculé par le moteur, dans la
-- fonction du serveur ; la base ne fait que garder et écrire d'un seul coup.
-- Accès refusé par défaut, comme partout : seul le serveur (clé de service) y touche.

create table public.attaques (
  id uuid primary key default gen_random_uuid(),
  saison bigint not null references public.saisons (id) on delete cascade,
  attaquant uuid not null references auth.users (id) on delete cascade,
  defenseur uuid not null references auth.users (id) on delete cascade,
  place_attaquant integer not null check (place_attaquant >= 0),
  place_defenseur integer not null check (place_defenseur >= 0),
  nom_attaquant text not null check (char_length(nom_attaquant) <= 60),
  nom_defenseur text not null check (char_length(nom_defenseur) <= 60),
  banniere_attaquant text check (char_length(banniere_attaquant) <= 8),
  banniere_defenseur text check (char_length(banniere_defenseur) <= 8),
  troupes jsonb not null,
  -- Instants du jeu, en millisecondes : départ, arrivée, combat.
  depart bigint not null,
  arrivee bigint not null,
  combat bigint not null,
  -- en_route → resolue (combat), rebond (cible à l'abri), annulee (rappelée, ou disparue).
  etat text not null default 'en_route'
    check (etat in ('en_route', 'annulee', 'resolue', 'rebond')),
  -- Le résumé du combat (forces, pertes, butin) et son détail, vu de l'attaquant.
  resultat jsonb,
  detail jsonb,
  cree_le timestamptz not null default now(),
  regle_le timestamptz,
  unique (attaquant, depart),
  check (attaquant <> defenseur)
);

create index attaques_dues on public.attaques (combat) where etat = 'en_route';
create index attaques_par_saison on public.attaques (saison, depart desc);
create index attaques_par_defenseur on public.attaques (defenseur);

create table public.renforts (
  attaque uuid not null references public.attaques (id) on delete cascade,
  aidant uuid not null references auth.users (id) on delete cascade,
  nom_aidant text not null check (char_length(nom_aidant) <= 60),
  troupes jsonb not null,
  arrivee bigint not null,
  primary key (attaque, aidant)
);

create index renforts_par_aidant on public.renforts (aidant);

create table public.espionnages (
  id bigint generated always as identity primary key,
  saison bigint not null references public.saisons (id) on delete cascade,
  espion uuid not null references auth.users (id) on delete cascade,
  cible uuid not null references auth.users (id) on delete cascade,
  place_espion integer not null check (place_espion >= 0),
  place_cible integer not null check (place_cible >= 0),
  nom_espion text not null check (char_length(nom_espion) <= 60),
  nom_cible text not null check (char_length(nom_cible) <= 60),
  banniere_espion text check (char_length(banniere_espion) <= 8),
  banniere_cible text check (char_length(banniere_cible) <= 8),
  reussi boolean not null,
  moment bigint not null,
  cree_le timestamptz not null default now()
);

create index espionnages_par_saison on public.espionnages (saison, moment desc);
create index espionnages_par_espion on public.espionnages (espion);
create index espionnages_par_cible on public.espionnages (cible);

alter table public.attaques enable row level security;
alter table public.renforts enable row level security;
alter table public.espionnages enable row level security;
revoke all on table public.attaques, public.renforts, public.espionnages
  from public, anon, authenticated;

-- Le joueur qui tient une place de l'océan cette saison (d'après sa vitrine).
create function public.place_de (p_saison bigint, p_place integer) returns uuid
language sql
security definer
set search_path = ''
as $$
  select v.joueur from public.vitrines v where v.saison = p_saison and v.place = p_place;
$$;

-- Inscrire une attaque partie, ou la dire rappelée. Rejouable : même attaquant, même départ,
-- même ligne. Une attaque déjà jouée ne change plus.
create function public.noter_attaque (p_saison bigint, p_attaquant uuid, p_attaque jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_defenseur uuid;
  v_annulee boolean := coalesce((p_attaque ->> 'cancelled')::boolean, false);
begin
  select v.joueur into v_defenseur
  from public.vitrines v
  where v.saison = p_saison and v.place = (p_attaque ->> 'defenderSlot')::integer;
  if v_defenseur is null or v_defenseur = p_attaquant then
    return;
  end if;

  insert into public.attaques (
    saison, attaquant, defenseur, place_attaquant, place_defenseur, nom_attaquant,
    nom_defenseur, banniere_attaquant, banniere_defenseur, troupes, depart, arrivee, combat,
    etat, regle_le
  ) values (
    p_saison, p_attaquant, v_defenseur,
    (p_attaque ->> 'attackerSlot')::integer,
    (p_attaque ->> 'defenderSlot')::integer,
    left(coalesce(p_attaque ->> 'attackerName', ''), 60),
    left(coalesce(p_attaque ->> 'defenderName', ''), 60),
    left(p_attaque ->> 'attackerBanner', 8),
    left(p_attaque ->> 'defenderBanner', 8),
    coalesce(p_attaque -> 'party', '{}'::jsonb),
    (p_attaque ->> 'startedAt')::bigint,
    (p_attaque ->> 'arrivesAt')::bigint,
    (p_attaque ->> 'resolveAt')::bigint,
    case when v_annulee then 'annulee' else 'en_route' end,
    case when v_annulee then now() end
  )
  on conflict (attaquant, depart) do update
    set etat = 'annulee', regle_le = now()
    where public.attaques.etat = 'en_route' and excluded.etat = 'annulee';
end;
$$;

-- Des renforts en route vers un allié attaqué. Seulement pour une attaque qui attend son combat.
create function public.noter_renfort (p_aidant uuid, p_renfort jsonb) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.renforts (attaque, aidant, nom_aidant, troupes, arrivee)
  select a.id, p_aidant, left(coalesce(p_renfort ->> 'helperName', ''), 60),
    coalesce(p_renfort -> 'party', '{}'::jsonb), (p_renfort ->> 'arrivesAt')::bigint
  from public.attaques a
  where a.id = (p_renfort ->> 'attack')::uuid
    and a.etat = 'en_route'
    and a.place_defenseur = (p_renfort ->> 'slot')::integer
    and a.attaquant <> p_aidant
    and a.defenseur <> p_aidant
  on conflict (attaque, aidant) do nothing;
$$;

-- Une attaque qui attend son combat : la place visée et l'heure du combat. Null sinon.
create function public.trouver_attaque (p_attaque uuid) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('slot', a.place_defenseur, 'resolveAt', a.combat)
  from public.attaques a
  where a.id = p_attaque and a.etat = 'en_route';
$$;

-- Les attaques arrivées à l'heure du combat ; celles du joueur d'abord.
create function public.attaques_dues (
  p_saison bigint,
  p_maintenant bigint,
  p_joueur uuid,
  p_limite integer
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'attacker', d.attaquant, 'defender', d.defenseur, 'resolveAt', d.combat
  ) order by d.moi desc, d.combat), '[]'::jsonb)
  from (
    select a.id, a.attaquant, a.defenseur, a.combat,
      (a.attaquant = p_joueur or a.defenseur = p_joueur) as moi
    from public.attaques a
    where a.saison = p_saison and a.etat = 'en_route' and a.combat <= p_maintenant
    order by (a.attaquant = p_joueur or a.defenseur = p_joueur) desc, a.combat
    limit greatest(p_limite, 0)
  ) d;
$$;

-- Les joueurs qui ont envoyé des renforts pour cette attaque.
create function public.renforts_de (p_attaque uuid) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(r.aidant order by r.arrivee), '[]'::jsonb)
  from public.renforts r
  where r.attaque = p_attaque;
$$;

-- Écrire un combat : toutes les parties touchées et l'attaque close, d'un seul coup. Si une
-- seule version a bougé entre-temps, rien n'est écrit (le serveur relit et recommence).
-- `p_ecritures` : [{ "joueur": uuid, "version": entier attendu, "etat": partie }].
create function public.regler_attaque (
  p_attaque uuid,
  p_ecritures jsonb,
  p_resultat jsonb,
  p_detail jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ecriture jsonb;
begin
  perform 1 from public.attaques a where a.id = p_attaque and a.etat = 'en_route' for update;
  if not found then
    return false;
  end if;

  begin
    for v_ecriture in select * from jsonb_array_elements(coalesce(p_ecritures, '[]'::jsonb)) loop
      update public.etats_joueur
      set etat = v_ecriture -> 'etat', version = version + 1, mis_a_jour = now()
      where joueur = (v_ecriture ->> 'joueur')::uuid
        and version = (v_ecriture ->> 'version')::integer;
      if not found then
        raise exception 'version périmée' using errcode = '40001';
      end if;
    end loop;
  exception when serialization_failure then
    return false;
  end;

  update public.attaques
  set
    etat = case
      when p_resultat is null or p_resultat = 'null'::jsonb then 'annulee'
      when coalesce((p_resultat ->> 'fought')::boolean, false) then 'resolue'
      else 'rebond'
    end,
    resultat = nullif(p_resultat, 'null'::jsonb),
    detail = nullif(p_detail, 'null'::jsonb),
    regle_le = now()
  where id = p_attaque;
  return true;
end;
$$;

-- Un espionnage d'un humain, réussi ou non : la cible et les bancs le liront dans le fil.
create function public.noter_espionnage (p_saison bigint, p_espionnage jsonb) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.espionnages (
    saison, espion, cible, place_espion, place_cible, nom_espion, nom_cible, banniere_espion,
    banniere_cible, reussi, moment
  ) values (
    p_saison,
    (p_espionnage ->> 'spy')::uuid,
    (p_espionnage ->> 'target')::uuid,
    (p_espionnage ->> 'spySlot')::integer,
    (p_espionnage ->> 'targetSlot')::integer,
    left(coalesce(p_espionnage ->> 'spyName', ''), 60),
    left(coalesce(p_espionnage ->> 'targetName', ''), 60),
    left(p_espionnage ->> 'spyBanner', 8),
    left(p_espionnage ->> 'targetBanner', 8),
    (p_espionnage ->> 'success')::boolean,
    (p_espionnage ->> 'at')::bigint
  );
$$;

-- Les deux fils d'un joueur : ce qui touche son banc (sa bannière), et ce qui le touche, lui,
-- sur les trois derniers jours. Aucun identifiant de compte n'en sort : des places, des noms
-- d'espèces, et pour chaque ligne si c'est le joueur qui attaque (« mine ») ou qui est visé.
create function public.lire_fils (p_joueur uuid, p_saison bigint, p_maintenant bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_banniere text;
  v_depuis bigint := p_maintenant - 3 * 86400000;
begin
  select v.carte ->> 'banner' into v_banniere
  from public.vitrines v
  where v.saison = p_saison and v.joueur = p_joueur
  limit 1;

  return jsonb_build_object(
    'attacks', (
      select coalesce(jsonb_agg(f.ligne order by f.depart desc), '[]'::jsonb)
      from (
        select a.depart, jsonb_build_object(
          'id', a.id,
          'attackerSlot', a.place_attaquant,
          'attackerName', a.nom_attaquant,
          'attackerBanner', a.banniere_attaquant,
          'defenderSlot', a.place_defenseur,
          'defenderName', a.nom_defenseur,
          'defenderBanner', a.banniere_defenseur,
          'startedAt', a.depart,
          'arrivesAt', a.arrivee,
          'resolveAt', a.combat,
          'status', a.etat,
          'summary', a.resultat,
          'battle', a.detail,
          'mine', a.attaquant = p_joueur,
          'aimed', a.defenseur = p_joueur,
          'helping', exists (
            select 1 from public.renforts r where r.attaque = a.id and r.aidant = p_joueur
          ),
          'helpers', (
            select coalesce(jsonb_agg(r.nom_aidant order by r.arrivee), '[]'::jsonb)
            from public.renforts r
            where r.attaque = a.id
          )
        ) as ligne
        from public.attaques a
        where a.saison = p_saison
          and a.depart > v_depuis
          and (
            a.attaquant = p_joueur
            or a.defenseur = p_joueur
            or (v_banniere is not null
              and (a.banniere_attaquant = v_banniere or a.banniere_defenseur = v_banniere))
          )
        order by a.depart desc
        limit 40
      ) f
    ),
    'spies', (
      select coalesce(jsonb_agg(f.ligne order by f.moment desc), '[]'::jsonb)
      from (
        select e.moment, jsonb_build_object(
          'spySlot', e.place_espion,
          'spyName', e.nom_espion,
          'spyBanner', e.banniere_espion,
          'targetSlot', e.place_cible,
          'targetName', e.nom_cible,
          'targetBanner', e.banniere_cible,
          'success', e.reussi,
          'at', e.moment,
          'mine', e.espion = p_joueur,
          'aimed', e.cible = p_joueur
        ) as ligne
        from public.espionnages e
        where e.saison = p_saison
          and e.moment > v_depuis
          and (
            e.espion = p_joueur
            or e.cible = p_joueur
            or (v_banniere is not null
              and (e.banniere_espion = v_banniere or e.banniere_cible = v_banniere))
          )
        order by e.moment desc
        limit 40
      ) f
    )
  );
end;
$$;

-- Ce que le gardien voit des combats entre humains (spec, partie 5). Null pour tout autre
-- compte. Que des totaux, jour par jour sur la dernière semaine.
create function public.statistiques_combats (p_joueur uuid, p_saison bigint, p_aujourdhui date)
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
    'attaques', (select count(*) from public.attaques a where a.saison = p_saison),
    'espionnages', (select count(*) from public.espionnages e where e.saison = p_saison),
    'jours', (
      select coalesce(jsonb_agg(to_jsonb(j) order by j.jour desc), '[]'::jsonb)
      from (
        select
          a.cree_le::date as jour,
          count(*) as attaques,
          count(*) filter (where a.etat = 'resolue') as combats,
          count(*) filter (where (a.resultat ->> 'attackerWon')::boolean) as victoires,
          count(*) filter (where a.etat = 'rebond') as rebonds,
          count(*) filter (where a.etat = 'annulee') as rappels,
          coalesce(round(avg((a.resultat ->> 'attackerLost')::numeric)
            filter (where a.etat = 'resolue'), 1), 0) as "pertesAttaque",
          coalesce(round(avg((a.resultat ->> 'defenderLost')::numeric)
            filter (where a.etat = 'resolue'), 1), 0) as "pertesDefense",
          coalesce(sum((a.resultat ->> 'helpers')::integer), 0) as renforts,
          coalesce(sum((a.resultat ->> 'loot')::bigint), 0) as butin
        from public.attaques a
        where a.saison = p_saison and a.cree_le::date > p_aujourdhui - 7
        group by 1
      ) j
    ),
    'espionnagesJours', (
      select coalesce(jsonb_agg(to_jsonb(j) order by j.jour desc), '[]'::jsonb)
      from (
        select
          e.cree_le::date as jour,
          count(*) as espionnages,
          count(*) filter (where e.reussi) as reussis
        from public.espionnages e
        where e.saison = p_saison and e.cree_le::date > p_aujourdhui - 7
        group by 1
      ) j
    )
  ) into v_retour;

  return v_retour;
end;
$$;

revoke all on function
  public.place_de (bigint, integer),
  public.noter_attaque (bigint, uuid, jsonb),
  public.noter_renfort (uuid, jsonb),
  public.trouver_attaque (uuid),
  public.attaques_dues (bigint, bigint, uuid, integer),
  public.renforts_de (uuid),
  public.regler_attaque (uuid, jsonb, jsonb, jsonb),
  public.noter_espionnage (bigint, jsonb),
  public.lire_fils (uuid, bigint, bigint),
  public.statistiques_combats (uuid, bigint, date)
from public, anon, authenticated;

grant execute on function
  public.place_de (bigint, integer),
  public.noter_attaque (bigint, uuid, jsonb),
  public.noter_renfort (uuid, jsonb),
  public.trouver_attaque (uuid),
  public.attaques_dues (bigint, bigint, uuid, integer),
  public.renforts_de (uuid),
  public.regler_attaque (uuid, jsonb, jsonb, jsonb),
  public.noter_espionnage (bigint, jsonb),
  public.lire_fils (uuid, bigint, bigint),
  public.statistiques_combats (uuid, bigint, date)
to service_role;

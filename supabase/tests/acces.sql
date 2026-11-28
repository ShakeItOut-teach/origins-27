-- Tests de la base : règles d'accès et écriture d'un seul coup.
-- Lancé par la CI sur une base vide où les migrations viennent d'être rejouées.
-- Toute ligne « ECHEC » arrête le script et fait échouer la CI. Rien n'est gardé (rollback).
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- 1. Écriture par le serveur : versions et ordres rejoués.
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  ordre constant uuid := '00000000-0000-4000-8000-000000000001';
  saison bigint;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;

  if not public.enregistrer(alice, saison, 0, '{"n":1}', null, null) then
    raise exception 'ECHEC : la création du joueur est refusée';
  end if;
  if public.enregistrer(alice, saison, 0, '{"n":99}', null, null) then
    raise exception 'ECHEC : le joueur a été créé deux fois';
  end if;
  if not public.enregistrer(alice, saison, 1, '{"n":2}', ordre, '{"ok":true}') then
    raise exception 'ECHEC : un ordre normal est refusé';
  end if;
  if public.enregistrer(alice, saison, 1, '{"n":99}', null, null) then
    raise exception 'ECHEC : une version périmée a été acceptée';
  end if;
  if public.enregistrer(alice, saison, 2, '{"n":99}', ordre, '{"ok":true}') then
    raise exception 'ECHEC : le même ordre a été compté deux fois';
  end if;
  if (select etat ->> 'n' from public.etats_joueur where joueur = alice) <> '2' then
    raise exception 'ECHEC : un ordre refusé a quand même modifié l''état';
  end if;
  if (select version from public.etats_joueur where joueur = alice) <> 2 then
    raise exception 'ECHEC : la version a bougé sur un ordre refusé';
  end if;

  perform public.enregistrer(bob, saison, 0, '{"n":7}', null, null);
end;
$$;

-- 2. Un joueur connecté : il lit son état, rien d'autre, et n'écrit rien.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';

do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
begin
  if (select count(*) from public.etats_joueur) <> 1 then
    raise exception 'ECHEC : un joueur voit autre chose que son propre état';
  end if;
  if (select count(*) from public.etats_joueur where joueur = bob) <> 0 then
    raise exception 'ECHEC : un joueur lit l''état d''un autre';
  end if;

  begin
    update public.etats_joueur set etat = '{"n":1000}' where joueur = alice;
    raise exception 'ECHEC : un joueur a modifié son état directement';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.etats_joueur (joueur, saison, etat, version) values (alice, 1, '{}', 1);
    raise exception 'ECHEC : un joueur a écrit un état directement';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.etats_joueur where joueur = alice;
    raise exception 'ECHEC : un joueur a effacé un état directement';
  exception when insufficient_privilege then null;
  end;

  begin
    perform count(*) from public.ordres;
    raise exception 'ECHEC : un joueur lit la table des ordres';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.enregistrer(alice, 1, 2, '{"n":1000}', null, null);
    raise exception 'ECHEC : un joueur appelle la fonction d''écriture du serveur';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 3. Un visiteur non connecté : rien du tout.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    perform count(*) from public.etats_joueur;
    raise exception 'ECHEC : un visiteur non connecté lit les états';
  exception when insufficient_privilege then null;
  end;

  begin
    perform count(*) from public.saisons;
    raise exception 'ECHEC : un visiteur non connecté lit les saisons';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 4. Le serveur (clé de service) : il lit et écrit tout ce dont il a besoin.
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  saison bigint;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  if (select count(*) from public.etats_joueur) <> 2 then
    raise exception 'ECHEC : le serveur ne voit pas tous les états';
  end if;
  if (select count(*) from public.ordres) <> 1 then
    raise exception 'ECHEC : le serveur ne lit pas les ordres';
  end if;
  if not public.enregistrer(alice, saison, 2, '{"n":3}', null, null) then
    raise exception 'ECHEC : le serveur ne peut pas enregistrer';
  end if;
end;
$$;

-- 5. Transfert de partie : un anonyme qui se connecte à un compte garde sa partie.
reset role;

insert into auth.users (id, is_anonymous) values
  ('00000000-0000-4000-8000-00000000000c', true),
  ('00000000-0000-4000-8000-00000000000d', false),
  ('00000000-0000-4000-8000-00000000000e', true);

do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  carl constant uuid := '00000000-0000-4000-8000-00000000000c';
  dora constant uuid := '00000000-0000-4000-8000-00000000000d';
  eve constant uuid := '00000000-0000-4000-8000-00000000000e';
  ordre constant uuid := '00000000-0000-4000-8000-000000000002';
  saison bigint;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  perform public.enregistrer(carl, saison, 0, '{"counters":{"harvests":12}}', ordre, '{"ok":true}');
  perform public.enregistrer(eve, saison, 0, '{"counters":{"harvests":5}}', null, null);

  -- Vers un compte sans partie : la partie et ses ordres suivent.
  if not public.transferer(carl, dora) then
    raise exception 'ECHEC : transfert refusé vers un compte sans partie';
  end if;
  if (select etat -> 'counters' ->> 'harvests' from public.etats_joueur where joueur = dora) <> '12' then
    raise exception 'ECHEC : la partie n''a pas suivi le joueur';
  end if;
  if exists (select 1 from public.etats_joueur where joueur = carl) then
    raise exception 'ECHEC : la partie existe encore sous l''ancien compte';
  end if;
  if (select count(*) from public.ordres where joueur = dora and id = ordre) <> 1 then
    raise exception 'ECHEC : les ordres déjà traités n''ont pas suivi';
  end if;

  -- Vers un compte qui a déjà joué : rien ne bouge, sa partie n'est jamais écrasée.
  if public.transferer(eve, dora) then
    raise exception 'ECHEC : une partie déjà jouée a été écrasée';
  end if;
  if (select etat -> 'counters' ->> 'harvests' from public.etats_joueur where joueur = dora) <> '12' then
    raise exception 'ECHEC : la partie du compte a changé après un transfert refusé';
  end if;

  -- D'un compte non anonyme : refusé (on ne déplace pas la partie d'un vrai compte).
  if public.transferer(dora, alice) then
    raise exception 'ECHEC : la partie d''un compte non anonyme a été déplacée';
  end if;

  -- Vers un compte dont la partie est vierge (rien de récolté) : elle est remplacée.
  if not public.transferer(eve, bob) then
    raise exception 'ECHEC : transfert refusé vers un compte à la partie vierge';
  end if;
  if (select etat -> 'counters' ->> 'harvests' from public.etats_joueur where joueur = bob) <> '5' then
    raise exception 'ECHEC : la partie vierge n''a pas été remplacée';
  end if;
end;
$$;

-- 6. Places dans la goutte : distribuées dans l'ordre, jamais deux fois la même.
do $$
declare
  saison bigint;
  premiere integer;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  premiere := public.prendre_place(saison);
  if public.prendre_place(saison) <> premiere + 1 then
    raise exception 'ECHEC : les places ne se suivent pas';
  end if;
end;
$$;

-- Un joueur ne peut pas déclencher lui-même un transfert, ni se donner une place.
set local role authenticated;
do $$
begin
  begin
    perform public.prendre_place(1);
    raise exception 'ECHEC : un joueur appelle la fonction des places';
  exception when insufficient_privilege then null;
  end;
end;
$$;
do $$
begin
  begin
    perform public.transferer(
      '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
    raise exception 'ECHEC : un joueur appelle la fonction de transfert';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 7. Autour du jeu : visites, ordres comptés, sauvegardes, avis, Muséum, statistiques.
reset role;

do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  jour constant date := '2027-01-10';
  saison constant bigint := 1800000000000;
  stats jsonb;
begin
  -- Deux visites le même jour : une arrivée, une présence, une sauvegarde, une planche.
  perform public.noter_visite(alice, jour, 10, 9, 3845, 'fr', 'phone', true, 'discord', saison, null);
  perform public.noter_visite(
    alice, jour, 10, 9, 3900, null, null, null, 'ailleurs', saison, '{"name":"Protomonas originis"}');
  if (select count(*) from public.arrivees a where a.joueur = alice and a.source = 'discord') <> 1 then
    raise exception 'ECHEC : l''arrivée n''est pas notée une seule fois, avec sa première source';
  end if;
  if (select p.visites from public.presences p where p.joueur = alice) <> 2 then
    raise exception 'ECHEC : les visites du jour ne sont pas comptées';
  end if;
  if (select p.langue || '/' || p.puissance from public.presences p where p.joueur = alice) <> 'fr/3900' then
    raise exception 'ECHEC : la présence ne garde pas la langue connue et la dernière puissance';
  end if;
  if (select count(*) from public.sauvegardes s where s.joueur = alice and s.jour = '2027-01-10') <> 1 then
    raise exception 'ECHEC : la sauvegarde du jour n''est pas prise une seule fois';
  end if;
  if (select s.etat from public.sauvegardes s where s.joueur = alice)
     <> (select e.etat from public.etats_joueur e where e.joueur = alice) then
    raise exception 'ECHEC : la sauvegarde n''est pas la partie du joueur';
  end if;
  if jsonb_array_length(public.lire_planches(alice)) <> 1 then
    raise exception 'ECHEC : la planche du Muséum n''est pas gardée';
  end if;
  if public.lire_planches(bob) <> '[]'::jsonb then
    raise exception 'ECHEC : un joueur sans planche ne reçoit pas une liste vide';
  end if;

  -- Les ordres : comptés par type, acceptés ou refusés ; le joueur est présent ce jour-là.
  perform public.noter_ordre(alice, jour, 10, 9, 'harvest', true);
  perform public.noter_ordre(alice, jour, 10, 9, 'harvest', true);
  perform public.noter_ordre(alice, jour, 10, 9, 'build', false);
  perform public.noter_ordre(bob, jour + 1, 11, 4, 'harvest', true);
  if (select u.acceptes from public.usage_ordres u where u.jour = '2027-01-10' and u.type = 'harvest') <> 2 then
    raise exception 'ECHEC : les ordres acceptés ne sont pas comptés';
  end if;
  if (select u.refuses from public.usage_ordres u where u.jour = '2027-01-10' and u.type = 'build') <> 1 then
    raise exception 'ECHEC : les ordres refusés ne sont pas comptés';
  end if;
  if (select p.ordres from public.presences p where p.joueur = alice) <> 3 then
    raise exception 'ECHEC : les ordres du joueur ne sont pas comptés dans sa présence';
  end if;
  if (select p.visites from public.presences p where p.joueur = bob) <> 0 then
    raise exception 'ECHEC : un ordre sans visite ne crée pas une présence sans visite';
  end if;

  -- Sauvegardes : sept jours gardés, les plus vieilles s'en vont.
  insert into public.sauvegardes (joueur, jour, etat, version) values
    (alice, jour - 8, '{}', 1),
    (alice, jour - 6, '{}', 1);
  perform public.noter_visite(alice, jour + 1, 11, 9, 4000, 'fr', 'phone', true, null, saison, null);
  if exists (select 1 from public.sauvegardes s where s.joueur = alice and s.jour = '2027-01-02') then
    raise exception 'ECHEC : une sauvegarde de plus de sept jours est restée';
  end if;
  if (select count(*) from public.sauvegardes s where s.joueur = alice) <> 3 then
    raise exception 'ECHEC : les sauvegardes récentes ne sont pas toutes gardées';
  end if;

  -- Avis : gardés jusqu'à la limite du jour, pas au-delà.
  if not public.donner_avis(alice, jour, 10, 9, 4::smallint, 'Bien', 'fr', 2) then
    raise exception 'ECHEC : un premier avis est refusé';
  end if;
  if not public.donner_avis(alice, jour, 10, 9, null, 'Encore', 'fr', 2) then
    raise exception 'ECHEC : un avis sans note est refusé';
  end if;
  if public.donner_avis(alice, jour, 10, 9, 5::smallint, '', 'fr', 2) then
    raise exception 'ECHEC : un avis au-delà de la limite du jour est accepté';
  end if;
  if (select count(*) from public.avis) <> 2 then
    raise exception 'ECHEC : le nombre d''avis gardés n''est pas le bon';
  end if;

  -- Statistiques : pour un gardien seulement, et sans aucun identifiant de joueur.
  if public.statistiques(alice, jour + 1) is not null then
    raise exception 'ECHEC : un compte qui n''est pas gardien lit les statistiques';
  end if;
  insert into public.gardiens (joueur) values (alice);
  stats := public.statistiques(alice, jour + 1);
  if (stats ->> 'joueurs')::integer <> 1 then
    raise exception 'ECHEC : statistiques, nombre de joueurs arrivés : %', stats ->> 'joueurs';
  end if;
  if (stats ->> 'actifsAujourdhui')::integer <> 2 then
    raise exception 'ECHEC : statistiques, joueurs actifs du jour : %', stats ->> 'actifsAujourdhui';
  end if;
  if jsonb_array_length(stats -> 'jours') <> 30 then
    raise exception 'ECHEC : statistiques, il faut trente jours';
  end if;
  if (
    select (r ->> 'arrives') || '/' || (r ->> 'revenus')
    from jsonb_array_elements(stats -> 'retention') r
    where (r ->> 'jour')::integer = 1
  ) <> '1/1' then
    raise exception 'ECHEC : statistiques, retour au lendemain : %', stats -> 'retention';
  end if;
  if (stats -> 'avis' ->> 'nombre')::integer <> 2 then
    raise exception 'ECHEC : statistiques, nombre d''avis';
  end if;
  if stats::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : les statistiques laissent sortir un identifiant de joueur';
  end if;
end;
$$;

-- Le serveur peut tout noter.
set local role service_role;
do $$
begin
  perform public.noter_visite(
    '00000000-0000-4000-8000-00000000000b', '2027-01-11', 11, 4, 10, 'en', 'desktop', false, null,
    1800000000000, null);
  perform public.noter_ordre('00000000-0000-4000-8000-00000000000b', '2027-01-11', 11, 4, 'harvest', true);
  if (select count(*) from public.presences) < 3 then
    raise exception 'ECHEC : le serveur ne lit pas les présences';
  end if;
end;
$$;

-- Un joueur connecté : il ne lit aucune de ces tables et n'appelle aucune de ces fonctions.
set local role authenticated;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  nom text;
begin
  foreach nom in array array[
    'arrivees', 'presences', 'usage_ordres', 'avis', 'planches', 'sauvegardes', 'gardiens']
  loop
    begin
      execute format('select count(*) from public.%I', nom);
      raise exception 'ECHEC : un joueur lit la table %', nom;
    exception when insufficient_privilege then null;
    end;
  end loop;

  begin
    insert into public.gardiens (joueur) values (alice);
    raise exception 'ECHEC : un joueur se nomme gardien';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.statistiques(alice, '2027-01-11');
    raise exception 'ECHEC : un joueur appelle les statistiques';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.lire_planches(alice);
    raise exception 'ECHEC : un joueur appelle la lecture des planches';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.donner_avis(alice, '2027-01-11', 11, 9, 5::smallint, '', 'fr', 5);
    raise exception 'ECHEC : un joueur écrit un avis sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.noter_visite(alice, '2027-01-11', 11, 9, 1, null, null, null, null, 1, null);
    raise exception 'ECHEC : un joueur note lui-même une visite';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.noter_ordre(alice, '2027-01-11', 11, 9, 'harvest', true);
    raise exception 'ECHEC : un joueur note lui-même un ordre';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 7 bis. Le même océan : les vitrines des joueurs, écrites et lues par le serveur seulement.
reset role;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  saison bigint;
  toutes jsonb;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  perform public.montrer_vitrine(alice, saison, 3, '{"slot":3,"name":"Alicia prima"}');
  perform public.montrer_vitrine(bob, saison, 5, '{"slot":5,"name":"Bobus"}');
  -- Une nouvelle visite remplace la vitrine, sans la dédoubler.
  perform public.montrer_vitrine(alice, saison, 3, '{"slot":3,"name":"Alicia secunda"}');
  toutes := public.lire_vitrines(saison);
  if jsonb_array_length(toutes) <> 2 then
    raise exception 'ECHEC : % vitrines au lieu de 2', jsonb_array_length(toutes);
  end if;
  if toutes -> 0 ->> 'name' <> 'Alicia secunda' then
    raise exception 'ECHEC : la vitrine n''a pas été remplacée';
  end if;
  if toutes::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : une vitrine dit à quel compte elle appartient';
  end if;
  if public.lire_vitrines(saison + 1000) <> '[]'::jsonb then
    raise exception 'ECHEC : une autre saison voit ces vitrines';
  end if;
end;
$$;

set local role authenticated;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
begin
  begin
    perform 1 from public.vitrines;
    raise exception 'ECHEC : un joueur lit les vitrines sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.lire_vitrines(1);
    raise exception 'ECHEC : un joueur appelle lire_vitrines';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.montrer_vitrine(alice, 1, 0, '{}');
    raise exception 'ECHEC : un joueur écrit lui-même sa vitrine';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.lire_vitrines(1);
    raise exception 'ECHEC : un visiteur lit les vitrines';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 7 ter. Gisements partagés, motifs de refus, statistiques du monde partagé.
reset role;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  saison bigint;
  foule jsonb;
  stats jsonb;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  perform public.prendre_gisement(saison, 'd:3:-2:17', 1000000);
  perform public.prendre_gisement(saison, 'd:3:-2:17', 500000);
  perform public.prendre_gisement(saison, 'd:0:0:18', 20);
  foule := public.lire_foule(saison);
  if (foule -> 'taken' ->> 'd:3:-2:17')::bigint <> 1500000 then
    raise exception 'ECHEC : les prises d''un gisement ne s''additionnent pas : %', foule;
  end if;
  if jsonb_array_length(foule -> 'cards') <> 2 then
    raise exception 'ECHEC : la foule n''a pas les vitrines de la saison : %', foule;
  end if;
  begin
    perform public.prendre_gisement(saison, 'pas un gisement', 1);
    raise exception 'ECHEC : un identifiant de gisement invalide est accepté';
  exception when check_violation then null;
  end;

  perform public.noter_refus('2027-01-11', 'human');
  perform public.noter_refus('2027-01-11', 'human');
  perform public.noter_refus('2027-01-11', 'depleted');

  if public.statistiques_ocean(bob, saison, '2027-01-11') is not null then
    raise exception 'ECHEC : un joueur ordinaire lit les statistiques du monde partagé';
  end if;
  perform public.montrer_vitrine(bob, saison, 5, '{"slot":5,"name":"Bobus","banner":"tox","given":120}');
  insert into public.gardiens (joueur) values (bob) on conflict do nothing;
  stats := public.statistiques_ocean(bob, saison, '2027-01-11');
  if (stats ->> 'humains')::integer <> 2 or (stats ->> 'prises')::bigint <> 1500020 then
    raise exception 'ECHEC : statistiques du monde partagé fausses : %', stats;
  end if;
  if stats -> 'refus' -> 0 ->> 'code' <> 'human' or (stats -> 'refus' -> 0 ->> 'nombre')::integer <> 2 then
    raise exception 'ECHEC : les refus ne sont pas comptés par motif : %', stats;
  end if;
  if stats -> 'bancs' -> 0 ->> 'nom' <> 'tox' or (stats -> 'bancs' -> 0 ->> 'verse')::integer <> 120 then
    raise exception 'ECHEC : les bancs ne sont pas comptés : %', stats;
  end if;
  if stats::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : les statistiques contiennent un identifiant de joueur';
  end if;
  delete from public.gardiens where joueur = bob;
end;
$$;

set local role authenticated;
do $$
declare
  nom text;
begin
  foreach nom in array array['prises', 'usage_refus'] loop
    begin
      execute format('select count(*) from public.%I', nom);
      raise exception 'ECHEC : un joueur lit la table %', nom;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    perform public.lire_foule(1);
    raise exception 'ECHEC : un joueur lit la foule sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.prendre_gisement(1, 'd:0:0:1', 1);
    raise exception 'ECHEC : un joueur vide lui-même un gisement';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.noter_refus('2027-01-11', 'x');
    raise exception 'ECHEC : un joueur note lui-même un refus';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.statistiques_ocean('00000000-0000-4000-8000-00000000000a', 1, '2027-01-11');
    raise exception 'ECHEC : un joueur appelle les statistiques du monde partagé';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 7 quater. Combats entre humains : la file des attaques, les renforts, les espionnages, les
-- fils d'alliance. Le serveur seul y touche ; un combat s'écrit d'un seul coup ou pas du tout.
reset role;
insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000f1');

do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  fred constant uuid := '00000000-0000-4000-8000-0000000000f1';
  saison bigint;
  maintenant bigint := (extract(epoch from now()) * 1000)::bigint;
  attaque uuid;
  version_a integer;
  version_b integer;
  fils jsonb;
  stats jsonb;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  -- Alice tient la place 3, Bob la place 5 (sous la bannière « tox ») : vitrines de 7 bis et 7 ter.
  perform public.noter_attaque(saison, alice, jsonb_build_object(
    'attackerSlot', 3, 'attackerName', 'Alicia', 'attackerBanner', 'aby',
    'defenderSlot', 5, 'defenderName', 'Bobus', 'defenderBanner', 'tox',
    'party', '{"hunter":4}'::jsonb, 'startedAt', maintenant, 'arrivesAt', maintenant + 1000,
    'resolveAt', maintenant + 2000, 'cancelled', false));
  -- Rejouée, la même attaque ne se dédouble pas.
  perform public.noter_attaque(saison, alice, jsonb_build_object(
    'attackerSlot', 3, 'attackerName', 'Alicia', 'defenderSlot', 5, 'defenderName', 'Bobus',
    'startedAt', maintenant, 'arrivesAt', maintenant + 1000, 'resolveAt', maintenant + 2000));
  -- Une place que personne ne tient : rien n'entre dans la file.
  perform public.noter_attaque(saison, alice, jsonb_build_object(
    'attackerSlot', 3, 'defenderSlot', 999, 'startedAt', maintenant + 1,
    'arrivesAt', maintenant + 2, 'resolveAt', maintenant + 3));
  if (select count(*) from public.attaques) <> 1 then
    raise exception 'ECHEC : % attaques dans la file au lieu de 1', (select count(*) from public.attaques);
  end if;
  select id into strict attaque from public.attaques;
  if (select defenseur from public.attaques where id = attaque) <> bob then
    raise exception 'ECHEC : le défenseur n''est pas le joueur de la place visée';
  end if;
  if public.place_de(saison, 5) <> bob then
    raise exception 'ECHEC : place_de ne trouve pas le joueur d''une place';
  end if;
  if (public.trouver_attaque(attaque) ->> 'slot')::integer <> 5 then
    raise exception 'ECHEC : trouver_attaque ne dit pas la place visée';
  end if;
  if jsonb_array_length(public.attaques_dues(saison, maintenant + 1999, alice, 5)) <> 0 then
    raise exception 'ECHEC : une attaque est jouée avant l''heure du combat';
  end if;
  if public.attaques_dues(saison, maintenant + 2000, fred, 5) -> 0 ->> 'id' <> attaque::text then
    raise exception 'ECHEC : une attaque à l''heure du combat n''est pas proposée';
  end if;

  -- Renforts : Fred peut venir ; l'attaquant, non ; une mauvaise place, non.
  perform public.noter_renfort(fred, jsonb_build_object(
    'attack', attaque, 'slot', 5, 'helperName', 'Fredus', 'party', '{"hunter":2}'::jsonb,
    'arrivesAt', maintenant + 500));
  perform public.noter_renfort(alice, jsonb_build_object(
    'attack', attaque, 'slot', 5, 'helperName', 'Alicia', 'arrivesAt', maintenant + 500));
  perform public.noter_renfort(bob, jsonb_build_object(
    'attack', attaque, 'slot', 4, 'helperName', 'Bobus', 'arrivesAt', maintenant + 500));
  if public.renforts_de(attaque) <> jsonb_build_array(fred) then
    raise exception 'ECHEC : renforts faux : %', public.renforts_de(attaque);
  end if;

  -- Le combat : une version périmée, et rien n'est écrit.
  select version into strict version_a from public.etats_joueur where joueur = alice;
  select version into strict version_b from public.etats_joueur where joueur = bob;
  if public.regler_attaque(attaque, jsonb_build_array(
    jsonb_build_object('joueur', alice, 'version', version_a, 'etat', '{"duel":"a"}'::jsonb),
    jsonb_build_object('joueur', bob, 'version', version_b + 7, 'etat', '{"duel":"b"}'::jsonb)
  ), '{"fought":true,"attackerWon":true}', '{"mine":"attacker"}') then
    raise exception 'ECHEC : un combat s''est écrit malgré une version périmée';
  end if;
  if (select version from public.etats_joueur where joueur = alice) <> version_a
    or (select etat from public.attaques where id = attaque) <> 'en_route' then
    raise exception 'ECHEC : un combat refusé a quand même écrit une partie';
  end if;
  if not public.regler_attaque(attaque, jsonb_build_array(
    jsonb_build_object('joueur', alice, 'version', version_a, 'etat', '{"duel":"a"}'::jsonb),
    jsonb_build_object('joueur', bob, 'version', version_b, 'etat', '{"duel":"b"}'::jsonb)
  ), '{"fought":true,"attackerWon":true,"attackerLost":2,"defenderLost":3,"helpers":1,"loot":40}',
    '{"mine":"attacker"}') then
    raise exception 'ECHEC : un combat juste est refusé';
  end if;
  if (select etat ->> 'duel' from public.etats_joueur where joueur = bob) <> 'b'
    or (select version from public.etats_joueur where joueur = bob) <> version_b + 1
    or (select etat from public.attaques where id = attaque) <> 'resolue' then
    raise exception 'ECHEC : le combat n''est pas écrit dans les deux parties';
  end if;
  if public.regler_attaque(attaque, '[]', '{"fought":true}', null) then
    raise exception 'ECHEC : le même combat a été joué deux fois';
  end if;
  if public.trouver_attaque(attaque) is not null then
    raise exception 'ECHEC : une attaque jouée attend encore des renforts';
  end if;

  -- Une attaque rappelée : close sans combat.
  perform public.noter_attaque(saison, alice, jsonb_build_object(
    'attackerSlot', 3, 'defenderSlot', 5, 'startedAt', maintenant + 10,
    'arrivesAt', maintenant + 20, 'resolveAt', maintenant + 30, 'cancelled', false));
  perform public.noter_attaque(saison, alice, jsonb_build_object(
    'attackerSlot', 3, 'defenderSlot', 5, 'startedAt', maintenant + 10,
    'arrivesAt', maintenant + 20, 'resolveAt', maintenant + 30, 'cancelled', true));
  if (select etat from public.attaques where depart = maintenant + 10) <> 'annulee' then
    raise exception 'ECHEC : une attaque rappelée attend encore son combat';
  end if;

  -- L'espionnage, et les fils : Bob (bannière « tox ») voit l'attaque et l'espionnage.
  perform public.noter_espionnage(saison, jsonb_build_object(
    'spy', alice, 'target', bob, 'spySlot', 3, 'targetSlot', 5, 'spyName', 'Alicia',
    'targetName', 'Bobus', 'spyBanner', 'aby', 'targetBanner', 'tox', 'success', false,
    'at', maintenant));
  fils := public.lire_fils(bob, saison, maintenant);
  if jsonb_array_length(fils -> 'attacks') <> 2 or jsonb_array_length(fils -> 'spies') <> 1 then
    raise exception 'ECHEC : les fils de Bob sont faux : %', fils;
  end if;
  if not (fils -> 'spies' -> 0 ->> 'aimed')::boolean
    or (fils -> 'spies' -> 0 ->> 'success')::boolean then
    raise exception 'ECHEC : Bob ne voit pas qu''on l''a espionné sans succès : %', fils;
  end if;
  if fils::text like '%00000000-0000-4000-8000-00000000000%' then
    raise exception 'ECHEC : un fil d''alliance contient un identifiant de joueur';
  end if;
  -- Fred n'est d'aucun banc et n'a rien fait de visible : il ne voit rien.
  fils := public.lire_fils(fred, saison, maintenant);
  if jsonb_array_length(fils -> 'attacks') <> 0 or jsonb_array_length(fils -> 'spies') <> 0 then
    raise exception 'ECHEC : un joueur hors du banc lit ses fils : %', fils;
  end if;

  -- Les mesures du gardien : des totaux, rien d'autre.
  if public.statistiques_combats(bob, saison, current_date) is not null then
    raise exception 'ECHEC : un joueur ordinaire lit les statistiques des combats';
  end if;
  insert into public.gardiens (joueur) values (bob) on conflict do nothing;
  stats := public.statistiques_combats(bob, saison, current_date);
  if (stats ->> 'attaques')::integer <> 2 or (stats ->> 'espionnages')::integer <> 1
    or (stats -> 'jours' -> 0 ->> 'victoires')::integer <> 1
    or (stats -> 'jours' -> 0 ->> 'rappels')::integer <> 1 then
    raise exception 'ECHEC : statistiques des combats fausses : %', stats;
  end if;
  if stats::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : les statistiques des combats contiennent un identifiant de joueur';
  end if;
  delete from public.gardiens where joueur = bob;
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
do $$
declare
  nom text;
begin
  foreach nom in array array['attaques', 'renforts', 'espionnages'] loop
    begin
      execute format('select count(*) from public.%I', nom);
      raise exception 'ECHEC : un joueur lit la table %', nom;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    insert into public.attaques (saison, attaquant, defenseur, place_attaquant, place_defenseur,
      nom_attaquant, nom_defenseur, troupes, depart, arrivee, combat)
    values (1, '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b',
      3, 5, 'a', 'b', '{}', 1, 2, 3);
    raise exception 'ECHEC : un joueur inscrit lui-même une attaque';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.lire_fils('00000000-0000-4000-8000-00000000000b', 1, 0);
    raise exception 'ECHEC : un joueur lit les fils d''un autre sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.regler_attaque(gen_random_uuid(), '[]', null, null);
    raise exception 'ECHEC : un joueur joue lui-même un combat';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.noter_attaque(1, '00000000-0000-4000-8000-00000000000a', '{}');
    raise exception 'ECHEC : un joueur écrit lui-même dans la file des attaques';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.statistiques_combats('00000000-0000-4000-8000-00000000000a', 1, current_date);
    raise exception 'ECHEC : un joueur appelle les statistiques des combats';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.attaques_dues(1, 0, '00000000-0000-4000-8000-00000000000a', 1);
    raise exception 'ECHEC : un visiteur lit la file des attaques';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 7 quinquies. Politique des bannières et discussion d'alliance : le chef élu par le banc, la
-- guerre déclarée par lui seul, une discussion qui ne sort pas du banc, avec ses garde-fous.
reset role;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
  bob constant uuid := '00000000-0000-4000-8000-00000000000b';
  fred constant uuid := '00000000-0000-4000-8000-0000000000f1';
  saison bigint;
  foule jsonb;
  lus jsonb;
  stats jsonb;
  message bigint;
begin
  select id into strict saison from public.saisons order by debut desc limit 1;
  -- Alice (place 3) et Bob (place 5) sous « tox » ; Fred (place 7) sous « aby ».
  perform public.montrer_vitrine(alice, saison, 3, '{"slot":3,"name":"Alicia","banner":"tox","tier":9}');
  perform public.montrer_vitrine(bob, saison, 5, '{"slot":5,"name":"Bobus","banner":"tox","tier":9}');
  perform public.montrer_vitrine(fred, saison, 7, '{"slot":7,"name":"Fredus","banner":"aby","tier":9}');

  -- Le vote : un membre vote pour un membre de son banc, ou pour lui-même.
  if not public.voter_chef(saison, alice, 5) then
    raise exception 'ECHEC : un vote pour un membre du banc est refusé';
  end if;
  if public.chef_de(saison, 'tox') <> 5 then
    raise exception 'ECHEC : le seul candidat qui a une voix n''est pas chef';
  end if;
  if public.voter_chef(saison, fred, 5) then
    raise exception 'ECHEC : un joueur vote pour le chef d''une autre bannière';
  end if;
  -- Alice change d'avis et vote pour elle-même : égalité, la plus petite place l'emporte.
  perform public.voter_chef(saison, alice, 3);
  perform public.voter_chef(saison, bob, 5);
  if public.chef_de(saison, 'tox') <> 3 then
    raise exception 'ECHEC : à égalité, la plus petite place n''est pas cheffe';
  end if;
  perform public.voter_chef(saison, bob, 3);
  if (select count(*) from public.votes_chef) <> 2 then
    raise exception 'ECHEC : un vote changé s''est dédoublé';
  end if;

  -- La guerre : seul le chef la déclare, et seul lui fait la paix.
  if public.declarer_guerre(saison, bob, 'aby', true) then
    raise exception 'ECHEC : un membre qui n''est pas chef déclare la guerre';
  end if;
  if not public.declarer_guerre(saison, alice, 'aby', true) then
    raise exception 'ECHEC : la cheffe ne peut pas déclarer la guerre';
  end if;
  if public.declarer_guerre(saison, alice, 'tox', true) then
    raise exception 'ECHEC : une bannière se déclare la guerre à elle-même';
  end if;
  foule := public.lire_foule(saison);
  if foule -> 'politics' -> 'wars' <> '[["tox","aby"]]'::jsonb
    or (foule -> 'politics' -> 'leaders' ->> 'tox')::integer <> 3
    or (foule -> 'politics' -> 'votes' -> 'tox' ->> '3')::integer <> 2 then
    raise exception 'ECHEC : la politique de la foule est fausse : %', foule -> 'politics';
  end if;
  if (foule -> 'politics')::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : la politique dit à quels comptes appartiennent les voix';
  end if;
  perform public.declarer_guerre(saison, alice, 'aby', false);
  if exists (select 1 from public.guerres) then
    raise exception 'ECHEC : la paix n''a pas mis fin à la guerre';
  end if;

  -- La discussion : seulement dans son banc, quelques messages par minute.
  if public.ecrire_message(saison, alice, 'On tient la ligne', 9, 2, 7) <> 'ok' then
    raise exception 'ECHEC : un membre ne peut pas écrire à son banc';
  end if;
  perform public.ecrire_message(saison, alice, 'Deuxième', 9, 2, 7);
  if public.ecrire_message(saison, alice, 'Troisième', 9, 2, 7) <> 'trop' then
    raise exception 'ECHEC : le rythme des messages n''est pas limité';
  end if;
  if public.ecrire_message(saison, fred, 'Bonjour', 10, 2, 7) <> 'banc' then
    raise exception 'ECHEC : un joueur sous le palier des alliances écrit';
  end if;
  if public.ecrire_message(saison, '00000000-0000-4000-8000-00000000000e', 'x', 9, 2, 7) <> 'banc' then
    raise exception 'ECHEC : un joueur sans vitrine écrit';
  end if;
  lus := public.lire_messages(saison, bob, 9, 7);
  if jsonb_array_length(lus) <> 2 or lus -> 0 ->> 'text' <> 'On tient la ligne'
    or (lus -> 0 ->> 'mine')::boolean then
    raise exception 'ECHEC : Bob ne lit pas la discussion de son banc : %', lus;
  end if;
  if lus::text like '%00000000-0000-4000-8000%' then
    raise exception 'ECHEC : la discussion dit à quel compte appartient un message';
  end if;
  if jsonb_array_length(public.lire_messages(saison, fred, 9, 7)) <> 0 then
    raise exception 'ECHEC : un message est sorti de son banc';
  end if;
  if public.lire_messages(saison, '00000000-0000-4000-8000-00000000000e', 9, 7) is not null then
    raise exception 'ECHEC : un joueur sans banc lit une discussion';
  end if;

  -- Signaler : pas son propre message, pas celui d'un autre banc ; masqué après assez de voix.
  message := (lus -> 0 ->> 'id')::bigint;
  if public.signaler_message(saison, alice, message, 1) then
    raise exception 'ECHEC : on signale son propre message';
  end if;
  if public.signaler_message(saison, fred, message, 1) then
    raise exception 'ECHEC : on signale le message d''un autre banc';
  end if;
  if not public.signaler_message(saison, bob, message, 1) then
    raise exception 'ECHEC : un membre ne peut pas signaler';
  end if;
  if jsonb_array_length(public.lire_messages(saison, alice, 9, 7)) <> 1 then
    raise exception 'ECHEC : un message signalé n''est pas masqué';
  end if;

  -- Une semaine plus tard, les messages s'effacent à la prochaine écriture.
  update public.messages_alliance set cree_le = now() - interval '8 days';
  perform public.ecrire_message(saison, bob, 'Nouveau', 9, 2, 7);
  if (select count(*) from public.messages_alliance) <> 1 then
    raise exception 'ECHEC : les messages de plus d''une semaine ne sont pas effacés';
  end if;

  -- Le gardien : des totaux seulement.
  if public.statistiques_alliances(bob, saison) is not null then
    raise exception 'ECHEC : un joueur ordinaire lit les statistiques des alliances';
  end if;
  insert into public.gardiens (joueur) values (bob) on conflict do nothing;
  stats := public.statistiques_alliances(bob, saison);
  if (stats ->> 'votants')::integer <> 2 or (stats ->> 'messages7j')::integer <> 1
    or (stats ->> 'guerres')::integer <> 0 then
    raise exception 'ECHEC : statistiques des alliances fausses : %', stats;
  end if;
  delete from public.gardiens where joueur = bob;
end;
$$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
do $$
declare
  nom text;
begin
  foreach nom in array array['votes_chef', 'guerres', 'messages_alliance', 'signalements_messages'] loop
    begin
      execute format('select count(*) from public.%I', nom);
      raise exception 'ECHEC : un joueur lit la table %', nom;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    insert into public.messages_alliance (saison, banniere, auteur, place, nom, texte)
    values (1, 'tox', '00000000-0000-4000-8000-00000000000a', 3, 'a', 'sans filtre');
    raise exception 'ECHEC : un joueur écrit un message sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.lire_messages(1, '00000000-0000-4000-8000-00000000000b', 9, 7);
    raise exception 'ECHEC : un joueur lit la discussion sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.declarer_guerre(1, '00000000-0000-4000-8000-00000000000a', 'aby', true);
    raise exception 'ECHEC : un joueur déclare la guerre sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.voter_chef(1, '00000000-0000-4000-8000-00000000000a', 3);
    raise exception 'ECHEC : un joueur vote sans passer par le serveur';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.ecrire_message(1, '00000000-0000-4000-8000-00000000000a', 'x', 9, 2, 7);
    raise exception 'ECHEC : un visiteur écrit dans une discussion';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 8. Suppression d'un compte : tout ce qui est au joueur s'en va ; son avis reste, sans lui.
reset role;
do $$
declare
  alice constant uuid := '00000000-0000-4000-8000-00000000000a';
begin
  delete from auth.users where id = alice;
  if exists (select 1 from public.etats_joueur e where e.joueur = alice)
    or exists (select 1 from public.presences p where p.joueur = alice)
    or exists (select 1 from public.arrivees a where a.joueur = alice)
    or exists (select 1 from public.planches p where p.joueur = alice)
    or exists (select 1 from public.sauvegardes s where s.joueur = alice)
    or exists (select 1 from public.gardiens g where g.joueur = alice)
    or exists (select 1 from public.vitrines v where v.joueur = alice)
    or exists (select 1 from public.attaques a where a.attaquant = alice or a.defenseur = alice)
    or exists (select 1 from public.espionnages e where e.espion = alice or e.cible = alice)
    or exists (select 1 from public.votes_chef v where v.votant = alice)
    or exists (select 1 from public.messages_alliance m where m.auteur = alice) then
    raise exception 'ECHEC : il reste des données du joueur après la suppression de son compte';
  end if;
  if (select count(*) from public.avis a where a.joueur is null) <> 2 then
    raise exception 'ECHEC : les avis du joueur parti ne sont pas gardés sans lui';
  end if;
end;
$$;

rollback;

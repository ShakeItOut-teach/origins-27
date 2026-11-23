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

-- Un joueur ne peut pas déclencher lui-même un transfert.
set local role authenticated;
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

rollback;

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

rollback;

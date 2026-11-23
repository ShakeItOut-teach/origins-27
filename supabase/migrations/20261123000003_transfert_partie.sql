-- Quand un joueur anonyme se connecte à un compte par e-mail, sa partie en cours doit le suivre.
-- Sans cela, il arrive sur un compte vide et croit avoir tout perdu.
--
-- Le transfert n'a lieu que si :
--   - la partie d'origine appartient à un compte anonyme ;
--   - le compte d'arrivée n'a pas de partie, ou une partie où rien n'a encore été récolté.
-- Dans tous les autres cas, rien ne bouge et la fonction renvoie faux.
create function public.transferer (p_de uuid, p_vers uuid) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cible jsonb;
begin
  if p_de = p_vers then
    return false;
  end if;
  if not exists (select 1 from auth.users where id = p_de and is_anonymous) then
    return false;
  end if;
  if not exists (select 1 from public.etats_joueur where joueur = p_de) then
    return false;
  end if;

  select etat into v_cible from public.etats_joueur where joueur = p_vers for update;
  if found then
    if coalesce((v_cible -> 'counters' ->> 'harvests')::bigint, 0) > 0 then
      return false;
    end if;
    delete from public.ordres where joueur = p_vers;
    delete from public.etats_joueur where joueur = p_vers;
  end if;

  update public.etats_joueur
  set joueur = p_vers, version = version + 1, mis_a_jour = now()
  where joueur = p_de;
  update public.ordres set joueur = p_vers where joueur = p_de;
  return true;
end;
$$;

revoke all on function public.transferer (uuid, uuid) from public, anon, authenticated;
grant execute on function public.transferer (uuid, uuid) to service_role;

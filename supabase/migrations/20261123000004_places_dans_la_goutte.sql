-- Palier 3 : chaque joueur reçoit une place dans la goutte de sa saison.
-- Les places sont distribuées dans l'ordre d'arrivée : 0, 1, 2…
alter table public.saisons add column prochaine_place integer not null default 0;

-- Donne la prochaine place libre de la saison. Deux appels simultanés ne reçoivent jamais la même.
create function public.prendre_place (p_saison bigint) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_place integer;
begin
  update public.saisons
  set prochaine_place = prochaine_place + 1
  where id = p_saison
  returning prochaine_place - 1 into v_place;
  if v_place is null then
    raise exception 'saison inconnue : %', p_saison;
  end if;
  return v_place;
end;
$$;

revoke all on function public.prendre_place (bigint) from public, anon, authenticated;
grant execute on function public.prendre_place (bigint) to service_role;

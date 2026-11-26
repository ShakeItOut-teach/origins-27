-- Monde partagé, étape 2 : les bancs. Les vitrines portent maintenant la bannière et la
-- contribution de chaque humain ; le gardien voit combien d'humains compte chaque banc et ce
-- qu'ils ont versé. Même fonction qu'avant, une clé de plus ('bancs').

-- Ce que le gardien voit du monde partagé. Null pour tout autre compte. Que des totaux.
create or replace function public.statistiques_ocean (p_joueur uuid, p_saison bigint, p_aujourdhui date)
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
    'bancs', (
      select coalesce(jsonb_agg(to_jsonb(b) order by b.joueurs desc), '[]'::jsonb)
      from (
        select
          v.carte ->> 'banner' as nom,
          count(*) as joueurs,
          coalesce(sum((v.carte ->> 'given')::bigint), 0) as verse
        from public.vitrines v
        where v.saison = p_saison and v.carte ->> 'banner' is not null
        group by 1
      ) b
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

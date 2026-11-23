-- Socle du nouveau jeu : saisons, état de chaque joueur, ordres déjà traités.
-- Accès refusé par défaut. Un joueur lit son propre état et rien d'autre ; il n'écrit jamais
-- directement : toute écriture passe par la fonction du serveur, avec la clé de service.

create table public.saisons (
  id bigint generated always as identity primary key,
  debut timestamptz not null,
  graine bigint not null,
  cree_le timestamptz not null default now()
);

create table public.etats_joueur (
  joueur uuid primary key references auth.users (id) on delete cascade,
  saison bigint not null references public.saisons (id),
  etat jsonb not null,
  version integer not null check (version > 0),
  mis_a_jour timestamptz not null default now()
);

create table public.ordres (
  joueur uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  resultat jsonb not null,
  recu_le timestamptz not null default now(),
  primary key (joueur, id)
);

alter table public.saisons enable row level security;
alter table public.etats_joueur enable row level security;
alter table public.ordres enable row level security;

revoke all on public.saisons, public.etats_joueur, public.ordres from anon, authenticated;
grant select on public.saisons, public.etats_joueur to authenticated;

create policy "tout joueur connecte lit les saisons" on public.saisons
  for select to authenticated using (true);

create policy "un joueur lit son etat" on public.etats_joueur
  for select to authenticated using ((select auth.uid()) = joueur);

-- Aucune règle sur `ordres` : personne n'y accède, sauf le serveur.

-- Écrit l'état et l'ordre d'un seul coup.
-- Renvoie faux, sans rien écrire, si la version a changé entre-temps ou si l'ordre est déjà connu.
create function public.enregistrer (
  p_joueur uuid,
  p_saison bigint,
  p_version_attendue integer,
  p_etat jsonb,
  p_ordre uuid,
  p_resultat jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_version_attendue = 0 then
    insert into public.etats_joueur (joueur, saison, etat, version)
    values (p_joueur, p_saison, p_etat, 1)
    on conflict (joueur) do nothing;
  else
    update public.etats_joueur
    set etat = p_etat, version = version + 1, mis_a_jour = now()
    where joueur = p_joueur and version = p_version_attendue;
  end if;

  if not found then
    return false;
  end if;

  if p_ordre is not null then
    insert into public.ordres (joueur, id, resultat) values (p_joueur, p_ordre, p_resultat);
  end if;

  return true;
exception
  when unique_violation then
    -- Le bloc entier est annulé : l'état n'est pas modifié.
    return false;
end;
$$;

revoke all on function public.enregistrer (uuid, bigint, integer, jsonb, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.enregistrer (uuid, bigint, integer, jsonb, uuid, jsonb)
  to service_role;

-- Première saison : elle commence à l'installation.
insert into public.saisons (debut, graine) values (now(), 27);

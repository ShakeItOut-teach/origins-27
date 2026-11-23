-- Origins 27 · base de données Supabase, étape 2 (comptes et sauvegarde en ligne)
-- À coller une seule fois dans Supabase › SQL Editor › New query, puis « Run ».
-- Toutes les tables sont protégées par la sécurité par ligne (RLS) : chaque joueur ne lit et n'écrit que ses propres lignes.
-- La clé publique (anon) mise dans le jeu ne donne accès à rien d'autre.

-- 1. Profil public : le pseudo affiché aux autres joueurs (jamais l'e-mail).
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  pseudo      text not null check (char_length(pseudo) between 2 and 24),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Sauvegarde en ligne : la partie compressée (le même code « O27Z: » que l'export manuel).
create table if not exists public.saves (
  user_id         uuid primary key references auth.users on delete cascade,
  data            text not null check (octet_length(data) < 3000000),
  game_day        real,
  real_at         bigint,
  client_version  text,
  updated_at      timestamptz not null default now()
);

-- 3. Classement de saison (utilisé à l'étape 3 ; lisible par tous, chacun n'écrit que sa ligne).
create table if not exists public.leaderboard (
  user_id     uuid primary key references auth.users on delete cascade,
  season      int  not null default 1,
  pseudo      text not null,
  species     text,
  power       int  not null default 0 check (power >= 0),
  stage       int  not null default 1,
  ally        text,
  updated_at  timestamptz not null default now()
);

alter table public.profiles    enable row level security;
alter table public.saves       enable row level security;
alter table public.leaderboard enable row level security;

-- Profils : lisibles par tous (pseudo seulement), modifiables par leur propriétaire.
drop policy if exists "profils lisibles"         on public.profiles;
drop policy if exists "profil créé par soi"      on public.profiles;
drop policy if exists "profil modifié par soi"   on public.profiles;
create policy "profils lisibles"       on public.profiles for select using (true);
create policy "profil créé par soi"    on public.profiles for insert with check (auth.uid() = id);
create policy "profil modifié par soi" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Sauvegardes : strictement privées.
drop policy if exists "sauvegarde privée lecture"      on public.saves;
drop policy if exists "sauvegarde privée création"     on public.saves;
drop policy if exists "sauvegarde privée mise à jour"  on public.saves;
drop policy if exists "sauvegarde privée suppression"  on public.saves;
create policy "sauvegarde privée lecture"     on public.saves for select using (auth.uid() = user_id);
create policy "sauvegarde privée création"    on public.saves for insert with check (auth.uid() = user_id);
create policy "sauvegarde privée mise à jour" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sauvegarde privée suppression" on public.saves for delete using (auth.uid() = user_id);

-- Classement : lisible par tous, chacun écrit sa ligne.
drop policy if exists "classement lisible"        on public.leaderboard;
drop policy if exists "classement créé par soi"   on public.leaderboard;
drop policy if exists "classement modifié par soi" on public.leaderboard;
create policy "classement lisible"         on public.leaderboard for select using (true);
create policy "classement créé par soi"    on public.leaderboard for insert with check (auth.uid() = user_id);
create policy "classement modifié par soi" on public.leaderboard for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Supprimer son compte depuis le jeu : efface l'utilisateur, et avec lui (on delete cascade) son profil, sa sauvegarde et sa ligne de classement.
create or replace function public.delete_me() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;

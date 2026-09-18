-- ============================================================
-- terminal.fm — Supabase Schema
-- Run this in your Supabase SQL Editor (supabase.com > SQL Editor)
-- ============================================================

-- ─── Profiles ─────────────────────────────────────────────────────────────
-- Extends Supabase Auth users with display info
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'User display profiles, linked to auth.users';

-- RLS: users can only see and edit their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ─── Play History ──────────────────────────────────────────────────────────
create table if not exists public.play_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  track_id    text not null,          -- YouTube video ID
  title       text not null,
  artist      text not null default '',
  thumbnail   text not null default '',
  played_at   timestamptz not null default now()
);

create index if not exists play_history_user_played on public.play_history (user_id, played_at desc);

alter table public.play_history enable row level security;

create policy "Users manage own play history"
  on public.play_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── Liked Tracks ──────────────────────────────────────────────────────────
create table if not exists public.liked_tracks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  track_id    text not null,
  title       text not null,
  artist      text not null default '',
  thumbnail   text not null default '',
  duration    integer not null default 0,
  added_at    timestamptz not null default now(),
  unique (user_id, track_id)
);

create index if not exists liked_tracks_user_added on public.liked_tracks (user_id, added_at desc);

alter table public.liked_tracks enable row level security;

create policy "Users manage own liked tracks"
  on public.liked_tracks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── Search History ────────────────────────────────────────────────────────
create table if not exists public.search_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  query       text not null,
  searched_at timestamptz not null default now()
);

create index if not exists search_history_user_searched on public.search_history (user_id, searched_at desc);

alter table public.search_history enable row level security;

create policy "Users manage own search history"
  on public.search_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─── Listener Status (Nearby Feature) ─────────────────────────────────────
-- One row per user; upserted when playing + sharing.
-- is_sharing = false → RLS prevents others from seeing it.
-- geohash is 5 chars ≈ 4.9km × 4.9km precision.
create table if not exists public.listener_status (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  geohash         text,
  track_id        text,
  track_title     text,
  track_artist    text,
  track_thumbnail text,
  is_sharing      boolean not null default false,
  updated_at      timestamptz not null default now()
);

create index if not exists listener_status_sharing on public.listener_status (is_sharing, geohash)
  where is_sharing = true;

comment on table public.listener_status is
  'Per-user listening status for the nearby listeners feature. '
  'is_sharing=false rows are invisible to other users via RLS.';

alter table public.listener_status enable row level security;

-- Users can read/write their own row
create policy "Users manage own listener status"
  on public.listener_status for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Opted-in users are visible to any authenticated user
-- (geohash filtering happens in the query, not here — RLS only gates is_sharing)
create policy "Opted-in users visible to authenticated users"
  on public.listener_status for select
  using (is_sharing = true and auth.role() = 'authenticated');


-- ─── Enable Realtime on listener_status ───────────────────────────────────
-- Run this to enable Supabase Realtime change events on the table:
alter publication supabase_realtime add table public.listener_status;


-- ─── Auto-create profile on signup ────────────────────────────────────────
-- Trigger: when a user signs up, create their profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

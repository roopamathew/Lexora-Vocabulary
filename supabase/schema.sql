-- Lexora cloud database
-- Run this entire script in Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  word text not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'user' check (source in ('user','daily')),
  added_at timestamptz not null default now(),
  reviews integer not null default 0,
  unique (user_id, word_key)
);

create table if not exists public.activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  added_count integer not null default 0,
  reviewed_count integer not null default 0,
  added_words text[] not null default '{}',
  reviewed_words text[] not null default '{}',
  primary key (user_id, activity_date)
);

alter table public.profiles enable row level security;
alter table public.words enable row level security;
alter table public.activity enable row level security;

revoke all on public.profiles from anon;
revoke all on public.words from anon;
revoke all on public.activity from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.words to authenticated;
grant select, insert, update, delete on public.activity to authenticated;

drop policy if exists "profiles own select" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "words own select" on public.words;
drop policy if exists "words own insert" on public.words;
drop policy if exists "words own update" on public.words;
drop policy if exists "words own delete" on public.words;
drop policy if exists "activity own select" on public.activity;
drop policy if exists "activity own insert" on public.activity;
drop policy if exists "activity own update" on public.activity;
drop policy if exists "activity own delete" on public.activity;

create policy "profiles own select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles own insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles own update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "words own select" on public.words for select to authenticated using ((select auth.uid()) = user_id);
create policy "words own insert" on public.words for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "words own update" on public.words for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "words own delete" on public.words for delete to authenticated using ((select auth.uid()) = user_id);

create policy "activity own select" on public.activity for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity own insert" on public.activity for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity own update" on public.activity for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activity own delete" on public.activity for delete to authenticated using ((select auth.uid()) = user_id);

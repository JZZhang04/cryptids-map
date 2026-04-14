-- Cryptids Field Guide
-- Supabase schema + RLS setup
--
-- This script reflects the current app behavior:
-- 1. users can create private drafts
-- 2. users can submit public entries for moderator review
-- 3. only approved public entries are visible to everyone
-- 4. moderators/admins can review pending submissions
--
-- Safe notes:
-- - This script uses IF NOT EXISTS / DROP IF EXISTS where possible.
-- - It does not drop the legacy is_public column automatically.
--   The frontend no longer depends on it, but keeping it around is harmless
--   during transition.

create extension if not exists pgcrypto;

create table if not exists public.user_cryptids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  latitude numeric not null,
  longitude numeric not null,
  description text not null default '',
  category text not null,
  created_at timestamptz not null default now(),
  visibility text not null default 'private',
  review_status text not null default 'draft',
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.user_cryptids
drop constraint if exists user_cryptids_visibility_check;

alter table public.user_cryptids
add constraint user_cryptids_visibility_check
check (visibility in ('private', 'public'));

alter table public.user_cryptids
drop constraint if exists user_cryptids_review_status_check;

alter table public.user_cryptids
add constraint user_cryptids_review_status_check
check (review_status in ('draft', 'pending_review', 'approved', 'rejected'));

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('user', 'moderator', 'admin'));

alter table public.user_cryptids enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can view public own or moderator-visible cryptids" on public.user_cryptids;
drop policy if exists "Users can insert their own cryptids" on public.user_cryptids;
drop policy if exists "Users can update own cryptids or moderators can review" on public.user_cryptids;
drop policy if exists "Users can delete own cryptids or moderators can delete" on public.user_cryptids;
drop policy if exists "Users can view their own profile" on public.profiles;

create policy "Users can view public own or moderator-visible cryptids"
on public.user_cryptids
for select
using (
  auth.uid() = user_id
  or (
    visibility = 'public'
    and review_status = 'approved'
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin')
  )
);

create policy "Users can insert their own cryptids"
on public.user_cryptids
for insert
with check (
  auth.uid() = user_id
);

create policy "Users can update own cryptids or moderators can review"
on public.user_cryptids
for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin')
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin')
  )
);

create policy "Users can delete own cryptids or moderators can delete"
on public.user_cryptids
for delete
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('moderator', 'admin')
  )
);

create policy "Users can view their own profile"
on public.profiles
for select
using (
  auth.uid() = id
);

-- Replace the UUID below with your own auth.users id
-- if you want to promote another account to moderator.
insert into public.profiles (id, role)
values ('04a05356-fb07-4790-9260-3bc56b8dc984', 'moderator')
on conflict (id) do update
set role = excluded.role;

-- Optional legacy cleanup:
-- Once you are certain nothing depends on the old transition field,
-- you can remove it with:
--
-- alter table public.user_cryptids
-- drop column if exists is_public;

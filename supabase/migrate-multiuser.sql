-- Migration: add multi-user profiles to an existing single-user database.
-- Safe to run once. Creates the "Elyse" profile and assigns all existing
-- words, cards, and reviews to it. profile_id stays nullable so nothing
-- breaks during deploy; the app always sets it on new rows.

-- Profiles table.
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Ensure the reviews table exists (in case it was never created).
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references card_progress(id) on delete cascade,
  direction    text not null check (direction in ('es_to_en', 'en_to_es')),
  got_it       boolean not null,
  reviewed_at  timestamptz not null default now()
);

-- Add ownership columns.
alter table words         add column if not exists profile_id uuid references profiles(id) on delete cascade;
alter table card_progress add column if not exists profile_id uuid references profiles(id) on delete cascade;
alter table reviews       add column if not exists profile_id uuid references profiles(id) on delete cascade;

-- Create the "Elyse" profile (only if it doesn't already exist).
insert into profiles (name)
select 'Elyse'
where not exists (select 1 from profiles where name = 'Elyse');

-- Assign all existing data to Elyse.
update words
   set profile_id = (select id from profiles where name = 'Elyse' order by created_at limit 1)
 where profile_id is null;

update card_progress
   set profile_id = w.profile_id
  from words w
 where w.id = card_progress.word_id
   and card_progress.profile_id is null;

update reviews
   set profile_id = c.profile_id
  from card_progress c
 where c.id = reviews.card_id
   and reviews.profile_id is null;

-- Indexes for per-profile queries.
create index if not exists words_profile_idx         on words (profile_id);
create index if not exists card_progress_profile_idx on card_progress (profile_id);
create index if not exists reviews_profile_idx       on reviews (profile_id);

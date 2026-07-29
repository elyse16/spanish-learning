-- Spanish Vocab Trainer schema (multi-user)
-- Run this once in the Supabase SQL editor (SQL Editor -> New query -> paste -> Run).
-- If you already have data, run supabase/migrate-multiuser.sql instead.

-- Enable UUID generation (available by default on Supabase).
create extension if not exists "pgcrypto";

-- One row per user profile (no password; picked from a "Who's studying?" screen).
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- One row per vocabulary word, owned by a profile.
create table if not exists words (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete cascade,
  spanish     text not null,
  english     text not null,
  created_at  timestamptz not null default now()
);

-- One row per (word, direction). Mastering es->en does not master en->es,
-- so each word gets two independent spaced-repetition tracks.
create table if not exists card_progress (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid references profiles(id) on delete cascade,
  word_id           uuid not null references words(id) on delete cascade,
  direction         text not null check (direction in ('es_to_en', 'en_to_es')),
  interval_days     int  not null default 0,
  ease_factor       real not null default 2.5,
  repetitions       int  not null default 0,
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  mastered          boolean not null default false,
  unique (word_id, direction)
);

create index if not exists card_progress_due_idx
  on card_progress (profile_id, direction, mastered, due_at);

-- One row per answer, for progress-over-time analytics.
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade,
  card_id      uuid not null references card_progress(id) on delete cascade,
  direction    text not null check (direction in ('es_to_en', 'en_to_es')),
  got_it       boolean not null,
  reviewed_at  timestamptz not null default now()
);

create index if not exists reviews_reviewed_at_idx on reviews (profile_id, reviewed_at);

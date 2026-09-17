-- Migration: conjugation practice (regular preterite + irregular verbs).
-- The conjugation catalog lives in code (lib/conjugation.ts); this table holds
-- each profile's independent spaced-repetition progress, keyed by card_key.
-- Run once.

create table if not exists conjugation_progress (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  card_key          text not null,
  interval_days     int  not null default 0,
  ease_factor       real not null default 2.5,
  repetitions       int  not null default 0,
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  mastered          boolean not null default false,
  unique (profile_id, card_key)
);

create index if not exists conjugation_progress_due_idx
  on conjugation_progress (profile_id, mastered, due_at);

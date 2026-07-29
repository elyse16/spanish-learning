-- Migration: shared word library with per-profile progress.
-- The words table becomes a shared library (words.profile_id now just records
-- who added a word). Each profile keeps independent progress, so card_progress
-- is now unique per (profile_id, word_id, direction) instead of per word.
-- Run once, after migrate-multiuser.sql. Safe to re-run.

-- Drop the old single-owner uniqueness that blocked a second profile from
-- having its own card for the same word.
alter table card_progress drop constraint if exists card_progress_word_id_direction_key;

-- Every card row already has a profile (backfilled by the previous migration).
alter table card_progress alter column profile_id set not null;

-- Each profile gets independent progress per word + direction.
alter table card_progress
  add constraint card_progress_profile_word_dir_key
  unique (profile_id, word_id, direction);

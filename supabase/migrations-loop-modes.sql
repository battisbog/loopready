-- Per-round delivery mode for a configured loop. Nullable, so existing loops
-- (which are all voice) keep working untouched.
alter table loops add column if not exists round_modes text[];

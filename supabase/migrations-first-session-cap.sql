-- First-session trial cap.
--
-- A brand-new user's very first-ever interview session is time-boxed (see
-- lib/rate-limit.ts isFirstEverSession, app/api/realtime/turn/route.ts,
-- app/api/interview/route.ts). The flag is decided ONCE, at session
-- creation, by counting the user's prior sessions -- not recomputed on every
-- turn -- so it can't flip mid-session if a second session is somehow
-- created concurrently, and every later query is a single indexed column
-- read instead of a repeated count() over the whole sessions table.
alter table sessions
  add column if not exists trial_capped boolean not null default false;

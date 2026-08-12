-- LoopReady v1 schema. Run once against the Supabase Postgres database.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'active',            -- active | completed | abandoned
  question_index int default 0,
  followup_count int default 0
);

create table if not exists turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  role text not null,                       -- interviewer | candidate
  text text not null,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique references sessions(id),
  overall_signal text,                      -- hire | no-hire | borderline
  content jsonb,                            -- full structured feedback
  created_at timestamptz default now()
);

alter table sessions enable row level security;
alter table turns enable row level security;
alter table feedback enable row level security;

drop policy if exists "own sessions" on sessions;
create policy "own sessions" on sessions for all
  using (auth.uid() = user_id);

drop policy if exists "own turns" on turns;
create policy "own turns" on turns for all
  using (session_id in (select id from sessions where user_id = auth.uid()));

drop policy if exists "own feedback" on feedback;
create policy "own feedback" on feedback for all
  using (session_id in (select id from sessions where user_id = auth.uid()));

-- Milestone 5: per-session randomized question set
alter table sessions add column if not exists questions jsonb;

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

-- Round-aware loop architecture (updated plan)
create table if not exists loops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company text not null,
  level text not null,
  rounds text[] not null,
  status text default 'active',
  created_at timestamptz default now()
);
alter table loops enable row level security;
drop policy if exists "own loops" on loops;
create policy "own loops" on loops for all using (auth.uid() = user_id);

alter table sessions add column if not exists loop_id uuid references loops(id);
alter table sessions add column if not exists round_type text not null default 'behavioral';
alter table sessions add column if not exists round_order int default 0;
alter table sessions add column if not exists artifact jsonb;

-- Plans: gates the free-tier daily session cap. 'free' | 'voice' | 'premium' | 'unlimited'
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select
  using (auth.uid() = id);

-- Backfill anyone who signed up before this table existed.
insert into profiles (id)
  select id from auth.users
  on conflict (id) do nothing;

-- New sign-ups get a profile automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- M9: combined loop verdict
alter table loops add column if not exists summary jsonb;
alter table loops add column if not exists overall_signal text;
alter table loops add column if not exists completed_at timestamptz;

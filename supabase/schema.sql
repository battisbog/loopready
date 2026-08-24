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

-- Billing. subscription_tier is the canonical entitlement; `plan` above is
-- legacy and kept only so existing rows are not lost.
alter table profiles add column if not exists subscription_tier text not null default 'free';
alter table profiles add column if not exists paypal_subscription_id text;
alter table profiles add column if not exists paypal_order_id text;
alter table profiles add column if not exists subscription_status text;
alter table profiles add column if not exists current_period_end timestamptz;
alter table profiles add column if not exists updated_at timestamptz default now();

-- Carry any pre-existing plan values over to the new column.
update profiles set subscription_tier = plan
  where plan is not null and subscription_tier = 'free';

create index if not exists profiles_paypal_subscription_idx
  on profiles (paypal_subscription_id);

-- Users may READ their own profile. There is deliberately no insert/update
-- policy: RLS denies by default, so a tier can only ever be changed by the
-- service role (i.e. the verified webhook), never from the browser.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select
  using (auth.uid() = id);

-- ============================================================
-- Video interview credits
-- ============================================================
alter table profiles add column if not exists video_credits_remaining int not null default 0;
alter table profiles add column if not exists video_plan_allowance int not null default 0;
alter table profiles add column if not exists video_credits_reset_at timestamptz;
-- Holds the session currently occupying a reservation. Makes "one open
-- reservation per user" enforceable in a single atomic UPDATE.
alter table profiles add column if not exists video_reservation_session_id uuid;

create table if not exists video_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  action text not null,          -- reserve | commit | release | grant | refund
  detail text,
  created_at timestamptz default now()
);

create index if not exists video_credit_events_user_idx
  on video_credit_events (user_id, created_at desc);

alter table video_credit_events enable row level security;

-- Users may read their own ledger. No insert/update/delete policy exists, so
-- RLS denies all client writes; only the service role can record events.
drop policy if exists "own credit events" on video_credit_events;
create policy "own credit events" on video_credit_events for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Credit operations.
-- These run as single atomic statements so two concurrent requests cannot
-- both spend the last credit, and a user cannot hold two reservations.
-- SECURITY DEFINER + revoked execute = service role only.
-- ------------------------------------------------------------
create or replace function reserve_video_credit(p_user uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_remaining int;
  v_held uuid;
begin
  -- Idempotent: re-reserving the same session is a no-op success.
  select video_reservation_session_id into v_held from profiles where id = p_user;
  if v_held = p_session then
    select video_credits_remaining into v_remaining from profiles where id = p_user;
    return jsonb_build_object('ok', true, 'remaining', v_remaining, 'reason', 'already_held');
  end if;

  update profiles
     set video_credits_remaining = video_credits_remaining - 1,
         video_reservation_session_id = p_session,
         updated_at = now()
   where id = p_user
     and video_credits_remaining > 0
     and video_reservation_session_id is null
  returning video_credits_remaining into v_remaining;

  if v_remaining is null then
    select video_credits_remaining, video_reservation_session_id
      into v_remaining, v_held from profiles where id = p_user;
    return jsonb_build_object(
      'ok', false,
      'remaining', coalesce(v_remaining, 0),
      'reason', case when v_held is not null then 'reservation_open' else 'no_credits' end
    );
  end if;

  insert into video_credit_events (user_id, session_id, action)
  values (p_user, p_session, 'reserve');

  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

-- Commit keeps the already-decremented credit and clears the hold.
create or replace function commit_video_credit(p_user uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_rows int;
begin
  update profiles
     set video_reservation_session_id = null, updated_at = now()
   where id = p_user and video_reservation_session_id = p_session;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_reservation');
  end if;

  insert into video_credit_events (user_id, session_id, action)
  values (p_user, p_session, 'commit');
  return jsonb_build_object('ok', true);
end;
$$;

-- Release hands the credit back: the session never really happened.
create or replace function release_video_credit(p_user uuid, p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_remaining int;
begin
  update profiles
     set video_credits_remaining = video_credits_remaining + 1,
         video_reservation_session_id = null,
         updated_at = now()
   where id = p_user and video_reservation_session_id = p_session
  returning video_credits_remaining into v_remaining;

  if v_remaining is null then
    return jsonb_build_object('ok', false, 'reason', 'no_reservation');
  end if;

  insert into video_credit_events (user_id, session_id, action)
  values (p_user, p_session, 'release');
  return jsonb_build_object('ok', true, 'remaining', v_remaining);
end;
$$;

-- Refund credits a session that was already committed (support action).
create or replace function refund_video_credit(p_user uuid, p_session uuid, p_detail text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_remaining int;
begin
  update profiles
     set video_credits_remaining = video_credits_remaining + 1, updated_at = now()
   where id = p_user
  returning video_credits_remaining into v_remaining;

  insert into video_credit_events (user_id, session_id, action, detail)
  values (p_user, p_session, 'refund', p_detail);
  return jsonb_build_object('ok', true, 'remaining', coalesce(v_remaining, 0));
end;
$$;

-- Webhook-owned: set the plan allowance, or top up from a one-time pack.
create or replace function grant_video_credits(
  p_user uuid, p_allowance int, p_reset timestamptz, p_mode text, p_detail text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_remaining int;
begin
  if p_mode = 'set' then
    -- Renewal: plan credits do not roll over.
    update profiles
       set video_plan_allowance = p_allowance,
           video_credits_remaining = p_allowance,
           video_credits_reset_at = p_reset,
           updated_at = now()
     where id = p_user
    returning video_credits_remaining into v_remaining;
  else
    -- One-time pack: add on top of whatever is left.
    --
    -- greatest(0, ...) matters because p_allowance is NEGATIVE when a pack is
    -- refunded. Without the floor, refunding a 3-credit pack against a balance
    -- of 1 left -2, which the UI never shows and which silently swallowed the
    -- first two credits of the next purchase.
    update profiles
       set video_credits_remaining = greatest(0, video_credits_remaining + p_allowance),
           updated_at = now()
     where id = p_user
    returning video_credits_remaining into v_remaining;
  end if;

  insert into video_credit_events (user_id, action, detail)
  values (p_user, 'grant', coalesce(p_detail, p_mode));
  return jsonb_build_object('ok', true, 'remaining', coalesce(v_remaining, 0));
end;
$$;

revoke execute on function reserve_video_credit(uuid, uuid) from public, anon, authenticated;
revoke execute on function commit_video_credit(uuid, uuid) from public, anon, authenticated;
revoke execute on function release_video_credit(uuid, uuid) from public, anon, authenticated;
revoke execute on function refund_video_credit(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function grant_video_credits(uuid, int, timestamptz, text, text) from public, anon, authenticated;

-- Settings
alter table profiles add column if not exists email_notifications boolean not null default true;

-- Interview arc: greeting -> format -> questions -> closing.
-- Existing rows default to 'questions' so in-flight sessions are unaffected.
alter table sessions add column if not exists phase text not null default 'questions';

-- ============================================================
-- PayPal webhook idempotency
--
-- PayPal delivers at least once: a timeout, a 5xx, or a lost response all
-- produce a redelivery of the SAME event id. Most handlers here are naturally
-- idempotent because they set an absolute value, but the video-pack grant adds
-- credits, so a redelivery handed out another pack for free.
--
-- The webhook claims an event id here before applying it, and releases the
-- claim if processing fails so the retry can still get through.
-- ============================================================
create table if not exists paypal_webhook_events (
  event_id text primary key,
  event_type text,
  received_at timestamptz not null default now()
);

alter table paypal_webhook_events enable row level security;
-- No policies: service role only. RLS denies every client read and write.

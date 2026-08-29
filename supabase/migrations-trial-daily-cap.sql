-- Platform-wide daily cap on "Try it free" trial video sessions.
--
-- Daily, not lifetime (contrast with demo_usage in migrations-demo.sql): the
-- trial is the primary homepage CTA, meant to run indefinitely, so the cap
-- has to reset each day rather than ever running out for good. Keyed by
-- calendar day (UTC, via current_date) rather than a rolling window, since
-- "how many trials ran today" is what /admin/costs needs to show, and a
-- fixed reset is fine here (unlike the free-tier session quota) because this
-- is a capacity/cost ceiling, not a per-user allowance someone could game by
-- timing requests around the boundary.
create table if not exists trial_daily_usage (
  day        date primary key default current_date,
  used       integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table trial_daily_usage enable row level security;
-- No policies: service role only, same as demo_usage.

/**
 * Consumes one trial slot for today, atomically.
 *
 * Same technique as consume_demo_use: the cap is enforced by the UPDATE's
 * WHERE clause, not a read-then-write in application code, so two visitors
 * hitting the last slot at the same instant cannot both pass.
 */
create or replace function consume_trial_slot(p_cap integer)
returns table(allowed boolean, used integer, cap integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into trial_daily_usage(day) values (current_date)
    on conflict (day) do nothing;

  update trial_daily_usage d
     set used = d.used + 1, updated_at = now()
   where d.day = current_date
     and d.used < p_cap
  returning d.used into v_used;

  if found then
    return query select true, v_used, p_cap;
  else
    select d.used into v_used from trial_daily_usage d where d.day = current_date;
    return query select false, coalesce(v_used, 0), p_cap;
  end if;
end;
$$;

revoke execute on function consume_trial_slot(integer) from public, anon, authenticated;

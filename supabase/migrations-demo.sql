-- Shared demo account usage.
--
-- Lifetime, not per-day: the whole point is that credentials shared widely
-- cannot run up an unbounded bill, so the ceiling must never refill on its own.
create table if not exists demo_usage (
  email       text primary key,
  used        integer not null default 0,
  disabled    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table demo_usage enable row level security;
-- No policies: the service role bypasses RLS, and nothing client-side may read
-- or write this. A shared account must not be able to inspect its own budget.

/**
 * Consumes one demo use, atomically.
 *
 * The cap is enforced by the WHERE clause, not by a read-then-write in
 * application code. Two people opening the shared link at the same instant
 * therefore cannot both pass a check that only one of them should win: Postgres
 * serialises the UPDATE and the loser matches no row.
 */
create or replace function consume_demo_use(p_email text, p_cap integer)
returns table(allowed boolean, used integer, cap integer, disabled boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_disabled boolean;
begin
  insert into demo_usage(email) values (p_email)
    on conflict (email) do nothing;

  update demo_usage d
     set used = d.used + 1, updated_at = now()
   where d.email = p_email
     and d.disabled = false
     and d.used < p_cap
  returning d.used, d.disabled into v_used, v_disabled;

  if found then
    return query select true, v_used, p_cap, v_disabled;
  else
    select d.used, d.disabled into v_used, v_disabled
      from demo_usage d where d.email = p_email;
    return query select false, coalesce(v_used, 0), p_cap, coalesce(v_disabled, false);
  end if;
end;
$$;

revoke execute on function consume_demo_use(text, integer) from public, anon, authenticated;

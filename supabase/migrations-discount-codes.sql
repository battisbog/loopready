-- Discount codes for Voice/Premium checkout. Fixed dollar amount off the
-- first billing cycle only; renewals bill at full price. Kept deliberately
-- to one table and one function -- no separate redemptions/audit table, no
-- per-user-once restriction. If usage patterns later call for either, add
-- them then rather than building for a need that does not exist yet.
create table if not exists discount_codes (
  code        text primary key,       -- normalized uppercase, e.g. 'LAUNCH25'
  amount_off  numeric not null check (amount_off > 0),
  max_uses    int,                    -- null = unlimited
  times_used  int not null default 0,
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table discount_codes enable row level security;
-- No policies: the service role bypasses RLS, and nothing client-side may
-- read or write this table directly. Checkout goes through /api/discount/*
-- and the PayPal subscription route, both server-side only.

/**
 * Atomically redeems one use of a code, or fails without side effects.
 *
 * The cap, expiry and active checks live in the WHERE clause, not a
 * read-then-write in application code, so two concurrent redemptions of the
 * last remaining use cannot both pass a check that only one of them should
 * win -- same pattern as consume_demo_use.
 */
create or replace function redeem_discount_code(p_code text)
returns table(ok boolean, amount_off numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
begin
  update discount_codes d
     set times_used = d.times_used + 1
   where d.code = upper(p_code)
     and d.active = true
     and (d.expires_at is null or d.expires_at > now())
     and (d.max_uses is null or d.times_used < d.max_uses)
  returning d.amount_off into v_amount;

  if found then
    return query select true, v_amount;
  else
    return query select false, null::numeric;
  end if;
end;
$$;

revoke execute on function redeem_discount_code(text) from public, anon, authenticated;

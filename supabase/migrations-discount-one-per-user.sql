-- One discount code redemption per account, EVER, across every code --
-- not just one code per checkout. Without this, an account could redeem
-- WELCOME10 (the login welcome email) and separately redeem a college code
-- like STANFORD10 on a later checkout attempt, stacking discounts the
-- pricing was never meant to allow.
create table if not exists discount_code_redemptions (
  user_id     uuid primary key references auth.users(id),
  code        text not null,
  redeemed_at timestamptz not null default now()
);

alter table discount_code_redemptions enable row level security;
-- No policies: service role only, same as discount_codes and
-- paypal_webhook_events -- redemption is decided entirely server-side.

-- Replaces the single-arg version from migrations-discount-codes.sql. The
-- old signature is dropped, not left alongside the new one, so there is
-- exactly one redeem_discount_code to call.
drop function if exists redeem_discount_code(text);

/**
 * Atomically redeems one use of a code for one user, or fails without side
 * effects -- now enforcing BOTH the code's own cap (unchanged from before)
 * AND a one-redemption-per-account rule that spans every code.
 *
 * The per-user claim is a plain INSERT into a primary-key table, so two
 * concurrent redemption attempts for the same user (two tabs, a retried
 * request) cannot both win: the second hits a unique_violation and fails
 * closed. If the CODE then turns out invalid/expired/exhausted, the claim is
 * released so a bad code never burns the user's one legitimate shot.
 */
create or replace function redeem_discount_code(p_code text, p_user uuid)
returns table(ok boolean, amount_off numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
begin
  begin
    insert into discount_code_redemptions (user_id, code) values (p_user, upper(p_code));
  exception when unique_violation then
    return query select false, null::numeric;
    return;
  end;

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
    delete from discount_code_redemptions where user_id = p_user;
    return query select false, null::numeric;
  end if;
end;
$$;

revoke execute on function redeem_discount_code(text, uuid) from public, anon, authenticated;

/** Read-only: has this account already redeemed a code, ever? Used by
 *  /api/discount/check so the UI can say so up front rather than only at
 *  the moment of actual checkout. */
create or replace function has_redeemed_discount_code(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from discount_code_redemptions where user_id = p_user);
$$;

revoke execute on function has_redeemed_discount_code(uuid) from public, anon, authenticated;

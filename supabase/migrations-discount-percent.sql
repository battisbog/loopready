-- Adds percentage-off discount codes alongside the existing flat-dollar
-- ones. A flat amount is unfair across tiers with this different a spread
-- ($19 Voice vs $69 Premium) -- $10 off is 53% of Voice but only 14% of
-- Premium -- which is exactly why most SaaS coupon systems (Stripe's own
-- default included) use percent_off for general promos. Kept both: a flat
-- amount is still the right shape for "sell this college $10 off," a fixed
-- number tied to the real per-unit cost story, not a percentage.
--
-- amount_off's NOT NULL is dropped in favor of a table-level check ensuring
-- EXACTLY ONE of amount_off / percent_off is set per code -- a code that
-- means both, or neither, is a data-entry bug, and the constraint makes it
-- impossible to create rather than a runtime surprise at redemption.
alter table discount_codes alter column amount_off drop not null;
alter table discount_codes drop constraint if exists discount_codes_amount_off_check;
alter table discount_codes add constraint discount_codes_amount_off_check
  check (amount_off is null or amount_off > 0);

alter table discount_codes add column if not exists percent_off numeric
  check (percent_off is null or (percent_off > 0 and percent_off <= 100));

alter table discount_codes drop constraint if exists discount_codes_exactly_one_discount;
alter table discount_codes add constraint discount_codes_exactly_one_discount
  check ((amount_off is not null)::int + (percent_off is not null)::int = 1);

-- Replaces the two-arg version from migrations-discount-one-per-user.sql,
-- now also returning percent_off so the caller can tell which kind of
-- discount this code carries.
drop function if exists redeem_discount_code(text, uuid);

create or replace function redeem_discount_code(p_code text, p_user uuid)
returns table(ok boolean, amount_off numeric, percent_off numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
  v_percent numeric;
begin
  begin
    insert into discount_code_redemptions (user_id, code) values (p_user, upper(p_code));
  exception when unique_violation then
    return query select false, null::numeric, null::numeric;
    return;
  end;

  update discount_codes d
     set times_used = d.times_used + 1
   where d.code = upper(p_code)
     and d.active = true
     and (d.expires_at is null or d.expires_at > now())
     and (d.max_uses is null or d.times_used < d.max_uses)
  returning d.amount_off, d.percent_off into v_amount, v_percent;

  if found then
    return query select true, v_amount, v_percent;
  else
    delete from discount_code_redemptions where user_id = p_user;
    return query select false, null::numeric, null::numeric;
  end if;
end;
$$;

revoke execute on function redeem_discount_code(text, uuid) from public, anon, authenticated;

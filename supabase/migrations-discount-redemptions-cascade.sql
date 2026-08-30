-- discount_code_redemptions.user_id was created with the default (no
-- action) FK behavior, same as sessions/loops -- but unlike those, nothing
-- in app/api/account/delete/route.ts knows this table exists, so it was
-- never deleted before the auth user. A real user who redeemed a discount
-- code and then deleted their account would hit a foreign-key failure at
-- the auth.deleteUser step, AFTER their sessions/loops/profile were already
-- gone: data wiped, login stranded. Cascade instead -- this table is purely
-- an audit/one-per-account marker, safe to go with the account.
alter table discount_code_redemptions
  drop constraint if exists discount_code_redemptions_user_id_fkey,
  add constraint discount_code_redemptions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

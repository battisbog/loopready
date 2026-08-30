-- Welcome-email discount code, sent once per account on first login.
--
-- welcome_email_sent_at is the claim: set atomically (UPDATE ... WHERE
-- welcome_email_sent_at IS NULL) so two concurrent auth callbacks for the
-- same brand-new account (e.g. a double-tap on the magic link) cannot both
-- pass the "have we sent this yet" check and send two emails -- same pattern
-- as consume_demo_use / consume_trial_slot's atomic claim.
alter table profiles add column if not exists welcome_email_sent_at timestamptz;

-- One evergreen, shared code for the welcome email. $10 off the first
-- billing cycle only (see migrations-discount-codes.sql's redeem_discount_code
-- -- this is a flat dollar amount, not a percentage). Unlimited uses: this is
-- an acquisition code every new signup receives, not a single-use coupon.
-- ON CONFLICT DO NOTHING so re-running this migration never resets
-- times_used or an active=false a human deliberately set.
insert into discount_codes (code, amount_off, max_uses, active)
values ('WELCOME10', 10, null, true)
on conflict (code) do nothing;

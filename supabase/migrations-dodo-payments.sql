-- Dodo Payments groundwork. Additive only: no existing PayPal column is
-- touched, renamed, or backfilled. subscription_tier / subscription_status /
-- current_period_end stay the shared, provider-agnostic entitlement columns
-- (see lib/tiers.ts's getUserTier) -- both providers' webhooks write the
-- same columns, they just each carry their own id.
--
-- Not applied to production yet. Apply with the same direct-Postgres
-- technique used for the trial-cap migration when the provider is actually
-- switched on:
--   node -e "..." against POSTGRES_URL_NON_POOLING (no Management API token
--   configured in this environment).

alter table profiles add column if not exists dodo_customer_id text;
alter table profiles add column if not exists dodo_subscription_id text;

create index if not exists profiles_dodo_subscription_idx
  on profiles (dodo_subscription_id);

-- ============================================================
-- Dodo delivers at least once, same as PayPal: a timeout, a 5xx, or a lost
-- response all produce a redelivery of the SAME webhook-id. Most handlers
-- are naturally idempotent because they set an absolute value, but the
-- video-pack grant adds credits, so a redelivery would hand out another
-- pack for free without this table. See app/api/dodo/webhook/route.ts.
-- ============================================================
create table if not exists dodo_webhook_events (
  event_id text primary key,
  event_type text,
  received_at timestamptz not null default now()
);

alter table dodo_webhook_events enable row level security;
-- No policies: service role only. RLS denies every client read and write.

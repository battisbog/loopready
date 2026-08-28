/**
 * One-off: creates the PayPal plan variants discount checkout needs.
 *
 * WHY THESE EXIST: PayPal has no "apply a coupon to this subscription"
 * concept. What it does support is overriding a plan's pricing PER
 * SUBSCRIBER at creation time (POST /v1/billing/subscriptions, the `plan`
 * field) -- but only for a billing cycle that already exists on the plan.
 * Our live Voice/Premium plans each have exactly one cycle: REGULAR,
 * total_cycles 0 (recurring forever). Overriding that cycle's price would
 * discount every renewal forever, not just the first month -- confirmed by
 * reading the live plans directly (GET /v1/billing/plans/{id}), not assumed.
 *
 * A TRIAL cycle (total_cycles: 1) followed by a REGULAR cycle is PayPal's
 * documented pattern for "N cycles at one price, then full price after."
 * These new plans default BOTH cycles to full price, so a subscription
 * created against them without a discount override behaves identically to
 * the existing plans -- the discount only exists per-subscription, applied
 * by overriding the TRIAL cycle's price at creation time.
 *
 *   npx tsx scripts/paypal-discount-plans.mts            # dry run
 *   npx tsx scripts/paypal-discount-plans.mts --create   # create, print new plan ids
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const KEY = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_CLIENT_SECRET;
if (!KEY || !SECRET) throw new Error("PAYPAL_CLIENT_ID/SECRET missing");
const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
const CREATE = process.argv.includes("--create");

async function token(): Promise<string> {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`auth failed ${res.status}`);
  return (await res.json()).access_token;
}

async function api(tok: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch { /* non-JSON error page */ }
  return { ok: res.ok, status: res.status, json, text };
}

const TARGETS = [
  { name: "Voice", sourcePlanId: process.env.PAYPAL_PLAN_VOICE, price: "19.00" },
  { name: "Premium", sourcePlanId: process.env.PAYPAL_PLAN_PREMIUM, price: "69.00" },
];

async function main() {
  const tok = await token();

  for (const t of TARGETS) {
    if (!t.sourcePlanId) {
      console.log(`${t.name}: source plan id not set, skipping`);
      continue;
    }
    const source = await api(tok, `/v1/billing/plans/${t.sourcePlanId}`);
    if (!source.ok) {
      console.log(`${t.name}: could not read source plan (${source.status})`);
      continue;
    }
    const productId = source.json.product_id as string;

    console.log(`\n${t.name}: product=${productId} price=$${t.price}/mo`);
    console.log("  cycle 1: TRIAL, 1 cycle, defaults to full price (overridden per-code at checkout)");
    console.log("  cycle 2: REGULAR, forever, full price");

    if (!CREATE) continue;

    const body = {
      product_id: productId,
      name: `LoopReady ${t.name} (discount-eligible)`,
      description: `${t.name} monthly subscription, first-cycle price overridable per discount code`,
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "TRIAL",
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: { fixed_price: { value: t.price, currency_code: "USD" } },
        },
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 2,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: t.price, currency_code: "USD" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    };

    const created = await api(tok, "/v1/billing/plans", { method: "POST", body: JSON.stringify(body) });
    if (!created.ok) {
      console.log(`  FAILED ${created.status}: ${created.text.slice(0, 300)}`);
      continue;
    }
    console.log(`  created ${created.json.id} -- put this in PAYPAL_PLAN_${t.name.toUpperCase()}_DISCOUNT`);
  }

  if (!CREATE) console.log("\n(dry run -- pass --create to actually create the plans)\n");
}

await main();

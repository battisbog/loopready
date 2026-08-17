/**
 * Provisions the live PayPal objects LoopReady needs.
 *
 * Idempotent: every step looks for an existing object first (product by name,
 * plans by name within the product, webhook by URL) and reuses it. Safe to
 * re-run. Prices come from lib/pricing.ts values so the plan amount and the
 * advertised price cannot diverge.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(root, ".env.local");
dotenv.config({ path: ENV_PATH, quiet: true });

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PRODUCT_NAME = "LoopReady";
const PLANS = [
  { key: "PAYPAL_PLAN_VOICE", name: "LoopReady Voice", amount: "19.00" },
  { key: "PAYPAL_PLAN_PREMIUM", name: "LoopReady Premium", amount: "69.00" },
];
const WEBHOOK_URL = process.env.PAYPAL_WEBHOOK_URL;
const WEBHOOK_EVENTS = [
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
];

let token;
async function auth() {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("AUTH FAILED", res.status);
    console.error(body);
    process.exit(1);
  }
  token = JSON.parse(body).access_token;
}

async function api(method, path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    // Verbose on purpose: an eligibility/approval problem and a code bug look
    // identical without PayPal's own message.
    console.error(`\n!! ${method} ${path} -> HTTP ${res.status}`);
    console.error(text || "(empty body)");
    return { ok: false, status: res.status, json };
  }
  return { ok: true, status: res.status, json };
}

function setEnv(key, value) {
  let s = readFileSync(ENV_PATH, "utf8");
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  s = re.test(s) ? s.replace(re, line) : s.replace(/\n*$/, "\n") + line + "\n";
  writeFileSync(ENV_PATH, s);
}

await auth();
console.log(`environment : ${process.env.PAYPAL_ENV} (${BASE})`);
console.log(`webhook url : ${WEBHOOK_URL}\n`);

// ---------- 1. Product ----------
let productId;
const products = await api("GET", "/v1/catalogs/products?page_size=20");
if (!products.ok) {
  console.error("\nStopping: could not list products; refusing to risk a duplicate.");
  process.exit(1);
}
{
  const found = (products.json?.products ?? []).find(
    (p) => p.name === PRODUCT_NAME
  );
  if (found) {
    productId = found.id;
    console.log(`product     : reusing existing "${PRODUCT_NAME}" -> ${productId}`);
  }
}
if (!productId) {
  const created = await api("POST", "/v1/catalogs/products", {
    name: PRODUCT_NAME,
    description: "AI mock interview practice with calibrated feedback",
    type: "SERVICE",
    category: "SOFTWARE",
  });
  if (!created.ok) {
    console.error("\nStopping: product creation failed.");
    process.exit(1);
  }
  productId = created.json.id;
  console.log(`product     : created -> ${productId}`);
}

// ---------- 2. Plans ----------
const existingPlans = await api(
  "GET",
  `/v1/billing/plans?product_id=${productId}&page_size=20`
);
if (!existingPlans.ok) {
  console.error(
    "\nStopping: could not list existing plans, so re-running could create duplicates."
  );
  process.exit(1);
}
const planList = existingPlans.json?.plans ?? [];
const results = {};

for (const plan of PLANS) {
  const found = planList.find((p) => p.name === plan.name);
  if (found) {
    results[plan.key] = found.id;
    console.log(
      `${plan.name.padEnd(18)}: reusing existing -> ${found.id} (status ${found.status})`
    );
    continue;
  }

  const created = await api("POST", "/v1/billing/plans", {
    product_id: productId,
    name: plan.name,
    description: `${plan.name} monthly subscription`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // 0 = bills until cancelled
        pricing_scheme: {
          fixed_price: { value: plan.amount, currency_code: "USD" },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3,
    },
  });
  if (!created.ok) {
    console.error(`\nPlan "${plan.name}" failed. Continuing to next step.`);
    continue;
  }
  results[plan.key] = created.json.id;
  console.log(`${plan.name.padEnd(18)}: created -> ${created.json.id} ($${plan.amount}/mo)`);
}

// ---------- 3. Webhook ----------
let webhookId;
if (!WEBHOOK_URL) {
  console.error("webhook     : PAYPAL_WEBHOOK_URL is not set, skipping");
} else {
  const hooks = await api("GET", "/v1/notifications/webhooks");
  const found = hooks.ok
    ? (hooks.json?.webhooks ?? []).find((w) => w.url === WEBHOOK_URL)
    : null;

  if (found) {
    webhookId = found.id;
    const have = new Set((found.event_types ?? []).map((e) => e.name));
    const missing = WEBHOOK_EVENTS.filter((e) => !have.has(e));
    console.log(`webhook     : reusing existing -> ${webhookId}`);
    if (missing.length) {
      console.log(`              adding missing events: ${missing.join(", ")}`);
      await api("PATCH", `/v1/notifications/webhooks/${webhookId}`, [
        {
          op: "replace",
          path: "/event_types",
          value: WEBHOOK_EVENTS.map((name) => ({ name })),
        },
      ]);
    }
  } else {
    const created = await api("POST", "/v1/notifications/webhooks", {
      url: WEBHOOK_URL,
      event_types: WEBHOOK_EVENTS.map((name) => ({ name })),
    });
    if (created.ok) {
      webhookId = created.json.id;
      console.log(`webhook     : created -> ${webhookId}`);
    }
  }
}

// ---------- 4. Persist + summary ----------
if (productId) setEnv("PAYPAL_PRODUCT_ID", productId);
for (const [key, id] of Object.entries(results)) setEnv(key, id);
if (webhookId) setEnv("PAYPAL_WEBHOOK_ID", webhookId);

console.log("\n================ LIVE PAYPAL IDS ================");
console.log(`PAYPAL_PRODUCT_ID    = ${productId ?? "(not created)"}`);
console.log(`PAYPAL_PLAN_VOICE    = ${results.PAYPAL_PLAN_VOICE ?? "(not created)"}`);
console.log(`PAYPAL_PLAN_PREMIUM  = ${results.PAYPAL_PLAN_PREMIUM ?? "(not created)"}`);
console.log(`PAYPAL_WEBHOOK_ID    = ${webhookId ?? "(not created)"}`);
console.log("================================================");
console.log("(written to .env.local)");

import DodoPayments from "dodopayments";

/**
 * Dodo Payments client. Mirrors lib/paypal/client.ts's role: one place that
 * knows how to reach the provider, so nothing else touches an SDK instance
 * or an env var directly.
 *
 * This is the live checkout path -- app/checkout/page.tsx creates a
 * checkout session via lib/dodo/checkout.ts and redirects straight to
 * Dodo's hosted page. PayPal (lib/paypal/client.ts) stays live only for
 * pre-existing subscribers; every new purchase goes through here.
 */

let cached: DodoPayments | null = null;

/** `environment` is a narrow union, but the env var is `string | undefined`.
 *  Default to test mode: a missing or misspelled variable must never
 *  accidentally select live and start charging real cards. */
function dodoEnvironment(): "live_mode" | "test_mode" {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "live_mode"
    : "test_mode";
}

export function dodoConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY);
}

export function dodoClient(): DodoPayments {
  if (cached) return cached;
  cached = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    environment: dodoEnvironment(),
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
  });
  return cached;
}

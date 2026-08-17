/**
 * Single source of truth for what LoopReady charges.
 *
 * Every price shown anywhere in the app must come from here. A hardcoded
 * price in a component is a bug waiting to happen: it can drift from what
 * PayPal actually bills, and the customer is then charged a different number
 * than the one they agreed to.
 *
 * IMPORTANT — these values must exactly match the PayPal billing plan and
 * product amounts:
 *   Voice    → recurring monthly plan, PAYPAL_PLAN_VOICE, amount 19.00 USD
 *   Premium  → recurring monthly plan, PAYPAL_PLAN_PREMIUM, amount 69.00 USD
 *   Video pack → one-time order, PAYPAL_PRICE_VIDEO_PACK, amount 19.00 USD
 *
 * PayPal stores the amount on the plan itself, so changing a number here does
 * NOT change what is charged. Changing a price means creating a NEW PayPal
 * plan (amounts on an active plan cannot be edited freely) and updating the
 * corresponding env var. `assertPricingMatchesPayPal` verifies the live plan
 * against these values.
 */

export type PaidPlan = "voice" | "premium";

export interface PlanPrice {
  /** Amount in USD as a decimal string, exactly as PayPal expects it. */
  amount: string;
  currency: "USD";
  /** Billing cadence, or null for a one-time purchase. */
  interval: "month" | null;
  /** Display form, e.g. "$19". */
  display: string;
  /** Display with cadence, e.g. "$19/mo". */
  displayWithInterval: string;
}

function money(amount: string, interval: "month" | null): PlanPrice {
  const display = `$${amount.replace(/\.00$/, "")}`;
  return {
    amount,
    currency: "USD",
    interval,
    display,
    displayWithInterval: interval === "month" ? `${display}/mo` : display,
  };
}

export const PRICING = {
  free: money("0.00", null),
  voice: money("19.00", "month"),
  premium: money("69.00", "month"),
  videoPack: money("19.00", null),
} as const;

/** Env var holding the PayPal plan id for each paid plan. */
export const PAYPAL_PLAN_ENV: Record<PaidPlan, string> = {
  voice: "PAYPAL_PLAN_VOICE",
  premium: "PAYPAL_PLAN_PREMIUM",
};

export function planId(plan: PaidPlan): string | undefined {
  return process.env[PAYPAL_PLAN_ENV[plan]];
}

export interface PriceCheck {
  plan: PaidPlan;
  planId?: string;
  expected: string;
  actual?: string;
  status: "match" | "MISMATCH" | "not_configured" | "unreachable";
  detail?: string;
}

/**
 * Compares the price we advertise against the amount on the live PayPal plan.
 *
 * This is the check that matters: if they diverge, customers are charged an
 * amount they never agreed to. Called by /api/health so a mismatch surfaces
 * before a customer finds it.
 */
export async function assertPricingMatchesPayPal(): Promise<PriceCheck[]> {
  const { paypalConfigured, paypalFetch } = await import("./paypal/client");
  const plans: PaidPlan[] = ["voice", "premium"];

  return Promise.all(
    plans.map(async (plan): Promise<PriceCheck> => {
      const expected = PRICING[plan].amount;
      const id = planId(plan);

      if (!id || !paypalConfigured()) {
        return {
          plan,
          expected,
          status: "not_configured",
          detail: `${PAYPAL_PLAN_ENV[plan]} is not set`,
        };
      }

      try {
        const details = await paypalFetch<{
          billing_cycles?: {
            pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } };
          }[];
        }>(`/v1/billing/plans/${id}`);

        // The paid cycle is the one with a price attached (a trial has none).
        const actual = details.billing_cycles
          ?.map((c) => c.pricing_scheme?.fixed_price)
          .find((p) => p?.value)?.value;

        if (!actual) {
          return { plan, planId: id, expected, status: "unreachable", detail: "No price on plan" };
        }

        return {
          plan,
          planId: id,
          expected,
          actual,
          status: Number(actual) === Number(expected) ? "match" : "MISMATCH",
        };
      } catch (e) {
        return {
          plan,
          planId: id,
          expected,
          status: "unreachable",
          detail: e instanceof Error ? e.message : "lookup failed",
        };
      }
    })
  );
}

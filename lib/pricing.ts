/**
 * Single source of truth for what LoopReady charges.
 *
 * Every price shown anywhere in the app must come from here. A hardcoded
 * price in a component is a bug waiting to happen: it can drift from what
 * PayPal actually bills, and the customer is then charged a different number
 * than the one they agreed to.
 *
 * IMPORTANT — these values must exactly match the PayPal billing plan
 * amounts for the two SUBSCRIPTION plans:
 *   Voice    → recurring monthly plan, PAYPAL_PLAN_VOICE, amount 19.00 USD
 *   Premium  → recurring monthly plan, PAYPAL_PLAN_PREMIUM, amount 69.00 USD
 *   Discount checkout → PAYPAL_PLAN_VOICE_DISCOUNT / _PREMIUM_DISCOUNT, same
 *     prices as above on both cycles by default -- see discountPlanId below.
 *
 * PayPal stores the SUBSCRIPTION amount on the plan itself, so changing a
 * number here does NOT change what those two charge. Changing one of those
 * two prices means creating a NEW PayPal plan (amounts on an active plan
 * cannot be edited freely) and updating the corresponding env var.
 * `assertPricingMatchesPayPal` verifies the live plan against these values.
 *
 * Video pack is different: a one-time PayPal ORDER, priced inline from
 * videoPack.amount at checkout time (app/api/paypal/order/route.ts) rather
 * than a preset PayPal plan/price object -- there is no PAYPAL_PRICE_*
 * env var backing it, so changing videoPack.amount alone is enough.
 *
 * videoPack is priced just above real cost (Tavus Growth plan, $0.31/min,
 * per a ~40-minute round) plus the LLM turn cost that still runs alongside
 * video (see lib/cost.ts's realtime_turn) -- ~$12.40 Tavus + ~$0.65 LLM ≈
 * $13.07, priced at $13.90 for a small margin. This is one credit, not a
 * multi-credit pack (see VIDEO_PACK_CREDITS in lib/tiers.ts).
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
  videoPack: money("13.90", null),
} as const;

/** Env var holding the PayPal plan id for each paid plan. */
export const PAYPAL_PLAN_ENV: Record<PaidPlan, string> = {
  voice: "PAYPAL_PLAN_VOICE",
  premium: "PAYPAL_PLAN_PREMIUM",
};

export function planId(plan: PaidPlan): string | undefined {
  return process.env[PAYPAL_PLAN_ENV[plan]];
}

/**
 * Discount-eligible plan variants (scripts/paypal-discount-plans.mts).
 *
 * PayPal has no "apply a coupon" concept, and our regular plans each have a
 * single REGULAR cycle that recurs forever -- overriding its price would
 * discount every renewal, not just the first one. These variants add a
 * one-time TRIAL cycle ahead of the same REGULAR cycle specifically so a
 * discount can override the TRIAL price alone. They default to full price on
 * both cycles, so a subscription created against them without a discount
 * override behaves identically to the regular plan.
 */
export const PAYPAL_DISCOUNT_PLAN_ENV: Record<PaidPlan, string> = {
  voice: "PAYPAL_PLAN_VOICE_DISCOUNT",
  premium: "PAYPAL_PLAN_PREMIUM_DISCOUNT",
};

export function discountPlanId(plan: PaidPlan): string | undefined {
  return process.env[PAYPAL_DISCOUNT_PLAN_ENV[plan]];
}

/** PayPal will not process a $0 or negative charge, and a near-zero one is
 *  not a real transaction either -- floor the discounted price here rather
 *  than at each call site. */
export const MIN_CHARGE_USD = 1;

/** A code carries exactly one of these -- see the table's own check
 *  constraint in supabase/migrations-discount-percent.sql. */
export type Discount = { amountOff: number } | { percentOff: number };

/**
 * The first-cycle price after a discount, or null if the code would take the
 * plan below the minimum chargeable amount -- callers should reject the code
 * for that plan rather than charge the floor silently, since "your $50 code
 * only saved you $18" is a worse experience than telling them up front it
 * does not apply here.
 */
export function discountedFirstCyclePrice(
  plan: PaidPlan,
  discount: Discount
): string | null {
  const base = Number(PRICING[plan].amount);
  const price =
    "percentOff" in discount
      ? base * (1 - discount.percentOff / 100)
      : base - discount.amountOff;
  if (price < MIN_CHARGE_USD) return null;
  return price.toFixed(2);
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

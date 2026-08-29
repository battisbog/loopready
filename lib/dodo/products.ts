/**
 * Dodo product id mapping. Mirrors lib/pricing.ts's PAYPAL_PLAN_ENV /
 * planId pair, but for Dodo's product catalog.
 *
 * Prices themselves are NOT duplicated here: lib/pricing.ts's PRICING stays
 * the single source of truth for what LoopReady charges and what the
 * checkout UI displays. A Dodo product's price is set once in the Dodo
 * dashboard when the product is created and must match PRICING exactly --
 * same discipline PayPal's plans already require, just no automated
 * assertPricingMatchesPayPal-equivalent yet (nothing to check against
 * without live Dodo credentials configured).
 */

import type { PaidPlan } from "@/lib/pricing";

export const DODO_PRODUCT_ENV: Record<PaidPlan, string> = {
  voice: "DODO_PRODUCT_VOICE",
  premium: "DODO_PRODUCT_PREMIUM",
};

export function dodoProductId(plan: PaidPlan): string | undefined {
  return process.env[DODO_PRODUCT_ENV[plan]];
}

export const DODO_VIDEO_PACK_PRODUCT_ENV = "DODO_PRODUCT_VIDEO_PACK";

export function dodoVideoPackProductId(): string | undefined {
  return process.env[DODO_VIDEO_PACK_PRODUCT_ENV];
}

/** Same clamp as /api/paypal/order and the PayPal webhook's custom_id
 *  parser -- kept identical so the two providers behave the same way at
 *  the boundary regardless of which one is live. */
export function clampPackQuantity(raw: unknown): number {
  return Math.min(10, Math.max(1, Math.round(Number(raw)) || 1));
}

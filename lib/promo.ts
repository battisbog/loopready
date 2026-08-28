/**
 * Hand-issued promo codes for early organic signups.
 *
 * Not a general coupon system — each code is tied to one specific email and
 * applies a permanent discounted price on that subscriber's PayPal
 * subscription (PayPal plans here have a single infinite billing cycle, so a
 * per-subscriber override discounts every cycle, not just the first). Add
 * entries by hand as you send codes; delete them once redeemed or expired.
 */

import type { PaidPlan } from "./pricing";

interface PromoCode {
  email: string;
  /** Discounted fixed price for this subscriber, same format as PRICING amounts. */
  discountedAmount: Partial<Record<PaidPlan, string>>;
  expiresAt: string; // ISO date; code stops working after this
}

export const PROMO_CODES: Record<string, PromoCode> = {
  VISH20: {
    email: "vish.adarsh01@gmail.com",
    discountedAmount: { voice: "15.00", premium: "55.00" },
    expiresAt: "2026-09-27",
  },
  SCHINN20: {
    email: "schinn13@asu.edu",
    discountedAmount: { voice: "15.00", premium: "55.00" },
    expiresAt: "2026-09-27",
  },
};

/** Returns the discounted amount if the code is valid for this plan+email, else null. */
export function resolvePromo(
  code: string | undefined,
  email: string | null | undefined,
  plan: PaidPlan
): string | null {
  if (!code || !email) return null;
  const promo = PROMO_CODES[code.trim().toUpperCase()];
  if (!promo) return null;
  if (promo.email.toLowerCase() !== email.toLowerCase()) return null;
  if (new Date(promo.expiresAt) < new Date()) return null;
  return promo.discountedAmount[plan] ?? null;
}

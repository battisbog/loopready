import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RATE_LIMITING_CONFIGURED,
  peekGlobalBudget,
  rateLimitHealth,
} from "@/lib/rate-limit";
import { DAILY_CAP_USD, USD } from "@/lib/cost";
import { PRICING, assertPricingMatchesPayPal } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Health check.
 *
 * Public callers get a bare status only. Telling the internet "rate limiting
 * is currently disabled" is an invitation, so the detail that matters
 * operationally is returned only to a signed-in session.
 */
export async function GET() {
  const [limits, budget, prices] = await Promise.all([
    rateLimitHealth(),
    peekGlobalBudget(),
    assertPricingMatchesPayPal(),
  ]);

  // A price mismatch means customers would be charged something other than
  // what we advertise, so it degrades health rather than being informational.
  const priceMismatch = prices.some((p) => p.status === "MISMATCH");

  const limitsHealthy = limits.configured && limits.reachable;
  const status = priceMismatch
    ? "price_mismatch"
    : !limitsHealthy
      ? "degraded"
      : budget.exceeded
        ? "at_capacity"
        : "ok";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { status: status === "degraded" ? "degraded" : "ok" },
      { status: 200 }
    );
  }

  return NextResponse.json({
    status,
    rateLimiting: {
      configured: RATE_LIMITING_CONFIGURED,
      reachable: limits.reachable,
      enforcing: limitsHealthy,
      ...(limits.error ? { error: limits.error } : {}),
    },
    dailySpend: {
      // Dollars, not call counts: the ceiling is a spend backstop.
      usedUsd: Number((budget.used / USD).toFixed(4)),
      capUsd: DAILY_CAP_USD,
      exceeded: budget.exceeded,
      tracked: !budget.unknown,
    },
    pricing: {
      advertised: {
        voice: PRICING.voice.displayWithInterval,
        premium: PRICING.premium.displayWithInterval,
      },
      paypal: prices,
    },
    checkedAt: new Date().toISOString(),
  });
}

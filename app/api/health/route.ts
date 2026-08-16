import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RATE_LIMITING_CONFIGURED,
  peekGlobalBudget,
  rateLimitHealth,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Health check.
 *
 * Public callers get a bare status only. Telling the internet "rate limiting
 * is currently disabled" is an invitation, so the detail that matters
 * operationally is returned only to a signed-in session.
 */
export async function GET() {
  const [limits, budget] = await Promise.all([
    rateLimitHealth(),
    peekGlobalBudget(),
  ]);

  const limitsHealthy = limits.configured && limits.reachable;
  const status = !limitsHealthy
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
      used: budget.used,
      cap: budget.cap,
      exceeded: budget.exceeded,
      tracked: !budget.unknown,
    },
    checkedAt: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, ADMIN_CONFIGURED } from "@/lib/admin";
import {
  peekGlobalBudget,
  peekUsageCounts,
  rateLimitHealth,
  RATE_LIMITING_CONFIGURED,
  FREE_SESSION_LIMIT,
} from "@/lib/rate-limit";
import { peekDemoUsage } from "@/lib/demo/gate";
import { peekTrialUsage, TRIAL_DAILY_CAP } from "@/lib/trial";
import {
  COST,
  DAILY_CAP_MICRO,
  DAILY_CAP_USD,
  FREE_TIER_BUDGET_SHARE,
  FREE_TIER_CEILING_MICRO,
  USD,
} from "@/lib/cost";

export const dynamic = "force-dynamic";

/**
 * Today's spend against the daily ceiling.
 *
 * Read-only and side-effect free: watching the number must never move it.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [budget, counts, redis] = await Promise.all([
    peekGlobalBudget(),
    peekUsageCounts(),
    rateLimitHealth(),
  ]);
  const admin = createAdminClient();
  const demoUsage = await peekDemoUsage(admin);
  const trialUsage = await peekTrialUsage(admin);

  // Sessions started today, straight from Postgres, so the figure survives a
  // Redis flush.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count: sessionsToday } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", since.toISOString());
  // Trial video sessions specifically, same day window -- watched
  // separately from sessionsToday because these are free (no video credit,
  // no weekly-quota deduction) and the ones this whole cap system exists to
  // bound.
  const { count: trialSessionsToday } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("trial_capped", true)
    .gte("started_at", since.toISOString());

  const spentUsd = budget.used / USD;
  const freeShareUsed = FREE_TIER_CEILING_MICRO
    ? budget.used / FREE_TIER_CEILING_MICRO
    : 0;

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    spend: {
      usd: Number(spentUsd.toFixed(4)),
      capUsd: DAILY_CAP_USD,
      percentOfCap: Number(((budget.used / DAILY_CAP_MICRO) * 100).toFixed(1)),
      remainingUsd: Number(
        Math.max(0, (DAILY_CAP_MICRO - budget.used) / USD).toFixed(4)
      ),
      // Free traffic is refused at this point; paid keeps going.
      freeTierCeilingUsd: Number((FREE_TIER_CEILING_MICRO / USD).toFixed(2)),
      freeTierPercentUsed: Number((freeShareUsed * 100).toFixed(1)),
      freeTierExhausted: budget.used > FREE_TIER_CEILING_MICRO,
      hardCapReached: budget.used > DAILY_CAP_MICRO,
    },
    byOperation: Object.fromEntries(
      Object.entries(budget.byOperation)
        .map(([k, v]) => [k, Number((v / USD).toFixed(4))])
        .sort((a, b) => Number(b[1]) - Number(a[1]))
    ),
    requestsByEndpoint: counts,
    sessionsToday: sessionsToday ?? 0,
    // Shared demo account: lifetime, never refills.
    demoAccount: demoUsage,
    // "Try it free" video trial: resets daily, this is the platform-wide
    // capacity ceiling (see lib/trial.ts's own comment on TRIAL_DAILY_CAP --
    // it's a placeholder until real Tavus plan limits are known).
    trial: {
      sessionsToday: trialSessionsToday ?? 0,
      dailyCapUsed: trialUsage.used,
      dailyCap: trialUsage.cap,
      dailyRemaining: trialUsage.remaining,
    },
    unitCostsUsd: Object.fromEntries(
      Object.entries(COST).map(([k, v]) => [k, Number((v / USD).toFixed(4))])
    ),
    config: {
      freeTierBudgetShare: FREE_TIER_BUDGET_SHARE,
      freeSessionLimit: FREE_SESSION_LIMIT,
      trialDailyCap: TRIAL_DAILY_CAP,
      adminConfigured: ADMIN_CONFIGURED,
    },
    health: {
      // The loudest signal on the page: without Redis every limit fails open.
      rateLimitingConfigured: RATE_LIMITING_CONFIGURED,
      redisReachable: redis.reachable,
      redisError: redis.error,
      budgetTrackingActive: !budget.unknown,
    },
  });
}

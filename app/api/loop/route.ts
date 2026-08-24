import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import {
  ROUND_IMPLEMENTED,
  ROUND_TYPES,
  isRoundType,
  type RoundType,
} from "@/lib/interview/rounds";
import { validatePlan } from "@/lib/interview/loop-plan";
import { featuresFor, getEntitlements } from "@/lib/tiers";
import { VIDEO_ENABLED_SERVER } from "@/lib/video/config";
import { startSession } from "@/lib/interview/start";
import {
  checkDailySessionQuota,
  checkIpRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
  checkRateLimit,
  dailyQuotaResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

// Creates a loop (company + level + chosen rounds) and starts its first round.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const body = await request.json().catch(() => ({}));
  const company = String(body.company ?? "generic");
  const level = String(body.level ?? "");
  const rounds: unknown = body.rounds;

  const profile = COMPANY_PROFILES[company];
  if (!profile) {
    return NextResponse.json({ error: "Unknown company" }, { status: 400 });
  }
  if (!profile.levels[level]) {
    return NextResponse.json({ error: "Unknown level for this company" }, { status: 400 });
  }
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return NextResponse.json({ error: "Pick at least one round" }, { status: 400 });
  }
  const admin = createAdminClient();

  // The plan is a list of {roundType, mode}. Older clients send bare strings,
  // which are treated as voice.
  const plannedInput = (rounds as unknown[]).map((r) =>
    typeof r === "string" ? { roundType: r, mode: "voice" } : r
  );

  // Credits are read BEFORE validating, because the credit ceiling is part of
  // what makes a plan valid. Everything the client showed is re-checked here;
  // the client display is never trusted.
  const ent = await getEntitlements(admin, user.id);
  const validated = validatePlan(plannedInput, {
    videoEnabled: VIDEO_ENABLED_SERVER && ent.canUseVideo,
    creditsAvailable: ent.videoCreditsRemaining,
    // The paid rounds are a plan feature, not just a UI affordance: without
    // this a crafted request started coding and system design on a free
    // account, which is exactly what the Voice plan sells.
    allowedRounds: featuresFor(ent.tier).rounds,
  });
  if (!validated.ok) {
    const paymentRequired =
      validated.problem.code === "not_enough_credits" ||
      validated.problem.code === "round_not_in_tier";
    return NextResponse.json(
      {
        error: validated.problem.message,
        problem: validated.problem.code,
        ...(validated.problem.code === "not_enough_credits"
          ? {
              creditsNeeded: validated.problem.creditsNeeded,
              creditsAvailable: validated.problem.creditsAvailable,
              buyMoreUrl: "/checkout?product=video-pack",
            }
          : {}),
        ...(validated.problem.code === "round_not_in_tier"
          ? {
              upgradeRequired: true,
              currentTier: ent.tier,
              requiredTier: "voice",
              upgradeUrl: "/pricing",
            }
          : {}),
      },
      { status: paymentRequired ? 402 : 400 }
    );
  }

  // Order is preserved as configured, so "coding, coding, behavioral" runs that
  // way rather than being silently reshuffled into canonical order.
  const plan = validated.plan;
  const roundList = plan.map((p) => p.roundType);

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  // The whole loop is authorised here, because the later rounds start
  // automatically as each one finishes and never re-check.
  const quota = await checkDailySessionQuota(admin, user.id, roundList.length);
  if (quota.exceeded) return dailyQuotaResponse(quota);

  // startSession generates a spoken opening, so creating a loop costs money.
  const tier = await getUserTier(admin, user.id);
  const budget = await consumeGlobalBudget("interview_turn", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);
  void recordUsage("loop", user.id, request);

  const { data: loop, error } = await admin
    .from("loops")
    .insert({
      user_id: user.id,
      company,
      level,
      rounds: roundList,
      // Persisted so each round starts in the mode that was paid for, and so a
      // reload cannot silently change it.
      round_modes: plan.map((p) => p.mode),
    })
    .select()
    .single();
  if (error || !loop) {
    return NextResponse.json({ error: "Failed to create loop" }, { status: 500 });
  }

  const first = await startSession({
    admin,
    userId: user.id,
    roundType: roundList[0],
    loopId: loop.id,
    roundOrder: 0,
    company,
    level,
  });

  return NextResponse.json({
    loopId: loop.id,
    ...first,
    mode: plan[0].mode,
    cost: validated.cost,
  });
}

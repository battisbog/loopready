import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { feedbackModel } from "@/lib/ai";
import { getContext } from "@/lib/interview/companies";
import type { RoundType } from "@/lib/interview/rounds";
import {
  LOOP_SUMMARY_SYSTEM_PROMPT,
  loopSummarySchema,
  loopSummaryUserPrompt,
} from "@/lib/feedback/loop-summary";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

export const maxDuration = 120;

/** Synthesises every round of a loop into one hire decision. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("feedback", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const { loopId } = await request.json().catch(() => ({}));
  if (!loopId) {
    return NextResponse.json({ error: "loopId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: loop } = await admin
    .from("loops")
    .select("id, company, level, rounds, summary, overall_signal")
    .eq("id", loopId)
    .eq("user_id", user.id)
    .single();
  if (!loop) {
    return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  }

  // Idempotent: a loop verdict is expensive and never changes.
  if (loop.summary) {
    return NextResponse.json(loop.summary);
  }

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, round_type, round_order, status, feedback(overall_signal, content)")
    .eq("loop_id", loopId)
    .order("round_order", { ascending: true });

  const rounds = (sessions ?? []).map((s) => {
    const fb = Array.isArray(s.feedback) ? s.feedback[0] : s.feedback;
    return {
      roundType: s.round_type as RoundType,
      signal: (fb?.overall_signal as string | undefined) ?? null,
      feedback: fb?.content ?? null,
    };
  });

  const withFeedback = rounds.filter((r) => r.feedback);
  if (withFeedback.length === 0) {
    return NextResponse.json(
      {
        error:
          "No round feedback yet. Open each round's debrief first, then come back.",
      },
      { status: 409 }
    );
  }

  const ctx = getContext(loop.company, loop.level);

  // Charged immediately before the generation, not before the idempotent
  // return above: a loop verdict never changes, so re-reading one must not
  // add phantom spend to the daily ceiling.
  const tier = await getUserTier(admin, user.id);
  const budget = await consumeGlobalBudget("loop_summary", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);
  void recordUsage("loop_summary", user.id, request);

  const { object } = await generateObject({
    model: feedbackModel(),
    schema: loopSummarySchema,
    system: LOOP_SUMMARY_SYSTEM_PROMPT,
    prompt: loopSummaryUserPrompt(withFeedback, ctx),
    providerOptions: { gateway: { tags: ["feature:loop-summary"] } },
  });

  await admin
    .from("loops")
    .update({
      summary: object,
      overall_signal: object.overallSignal,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", loopId);

  return NextResponse.json(object);
}

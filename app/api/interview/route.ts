import { NextResponse } from "next/server";
import { generateText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { interviewModel } from "@/lib/ai";
import { planTurn, progressPayload } from "@/lib/interview/turn";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS, startSession } from "@/lib/interview/start";
import { getContext } from "@/lib/interview/companies";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";
import {
  checkDailySessionQuota,
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  dailyQuotaResponse,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

export const maxDuration = 60;

interface Body {
  sessionId?: string;
  roundType?: string;
  company?: string;
  level?: string;
  userMessage?: string;
  artifact?: object;
}

async function llm(system: string, messages: ModelMessage[]): Promise<string> {
  const { text } = await generateText({
    model: interviewModel(),
    system,
    messages,
    providerOptions: { gateway: { tags: ["feature:interview"] } },
  });
  return text.trim();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate order is deliberate and cost-driven: every cheap check runs to
  // completion before a single paid API call is made, so a rejected request
  // never spends money.
  //   a. auth (above)  b. per-user  c. per-IP  d. global spend ceiling
  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  // Tier decides which ceiling applies: free traffic is cut off first so the
  // remaining headroom stays reserved for paying customers.
  const tier = await getUserTier(createAdminClient(), user.id);
  const budget = await consumeGlobalBudget("interview_turn", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);

  const admin = createAdminClient();
  const body: Body = await request.json().catch(() => ({}));

  // --- New session: create it and return the opening ---
  if (!body.sessionId) {
    const roundType = body.roundType ?? "behavioral";
    if (!isRoundType(roundType)) {
      return NextResponse.json({ error: "Unknown round type" }, { status: 400 });
    }
    if (!ROUND_IMPLEMENTED[roundType]) {
      return NextResponse.json(
        { error: `${roundType} rounds aren't available yet` },
        { status: 501 }
      );
    }
    const quota = await checkDailySessionQuota(admin, user.id);
    if (quota.exceeded) return dailyQuotaResponse(quota);

    try {
      const started = await startSession({
        admin,
        userId: user.id,
        roundType,
        company: body.company ?? null,
        level: body.level ?? null,
      });
      return NextResponse.json(started);
    } catch {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
  }

  // --- Existing session: advance the state machine ---
  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (!body.userMessage?.trim()) {
    return NextResponse.json({ error: "userMessage required" }, { status: 400 });
  }

  await admin.from("turns").insert({
    session_id: session.id,
    role: "candidate",
    text: body.userMessage.trim(),
  });

  // Coding/design rounds send their work product (code or diagram JSON) with
  // each turn. Merge it — a full replace would drop server-owned fields like
  // problemId and the last run results.
  if (body.artifact !== undefined) {
    session.artifact = { ...session.artifact, ...body.artifact };
    await admin
      .from("sessions")
      .update({ artifact: session.artifact })
      .eq("id", session.id);
  }

  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  // Anthropic requires the first message to be a user turn; our transcript
  // starts with the interviewer's opening.
  const messages: ModelMessage[] = [
    { role: "user", content: "(The candidate joins the interview.)" },
    ...(turns ?? []).map(
      (t): ModelMessage => ({
        role: t.role === "interviewer" ? "assistant" : "user",
        content: t.text,
      })
    ),
  ];

  // Company/level config lives on the loop this session belongs to.
  let ctx = null;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level")
      .eq("id", session.loop_id)
      .single();
    if (loop) ctx = getContext(loop.company, loop.level);
  }

  // Both routes share one state machine, so the phase arc and the question
  // logic cannot drift between streaming and non-streaming.
  const plan = planTurn(session, ctx);
  if ("error" in plan) {
    return NextResponse.json({ error: plan.error }, { status: 409 });
  }

  let state = plan.normal;
  let reply = await llm(plan.system, messages);

  if (plan.controlToken && reply.startsWith(plan.controlToken) && plan.onControl) {
    state = plan.onControl.state;
    reply = await llm(plan.onControl.system, messages);
  }

  const questionIndex = state.questionIndex;
  const followupCount = state.followupCount;
  const phase = state.phase;
  const done = state.done;

  // The paid call has now succeeded; count it for abuse monitoring.
  void recordUsage("interview", user.id, request);

  await admin
    .from("turns")
    .insert({ session_id: session.id, role: "interviewer", text: reply! });
  await admin
    .from("sessions")
    .update({
      question_index: questionIndex,
      followup_count: followupCount,
      phase,
      ...(done ? { status: "completed", ended_at: new Date().toISOString() } : {}),
    })
    .eq("id", session.id);

  // Full-loop sequencing: if this round finished and the loop has more rounds,
  // tell the client where to go next.
  let nextRound: { roundType: string; sessionId: string } | null = null;
  let loopComplete: string | null = null;
  if (done && session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level, rounds")
      .eq("id", session.loop_id)
      .single();
    const nextOrder = (session.round_order ?? 0) + 1;
    const upcoming = loop?.rounds?.[nextOrder];
    if (loop && upcoming && isRoundType(upcoming) && ROUND_IMPLEMENTED[upcoming]) {
      const started = await startSession({
        admin,
        userId: user.id,
        roundType: upcoming,
        loopId: session.loop_id,
        roundOrder: nextOrder,
        company: loop.company,
        level: loop.level,
      });
      nextRound = { roundType: upcoming, sessionId: started.sessionId };
    } else if (loop) {
      await admin
        .from("loops")
        .update({ status: "completed" })
        .eq("id", session.loop_id);
      if ((loop.rounds?.length ?? 0) > 1) loopComplete = session.loop_id;
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    reply: reply!,
    nextRound,
    loopComplete,
    done,
    ...progressPayload(session, state),
  });
}

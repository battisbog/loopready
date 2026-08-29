import { NextResponse } from "next/server";
import { generateText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeArtifactPatch } from "@/lib/interview/artifact";
import { interviewModel } from "@/lib/ai";
import { planTurn, progressPayload } from "@/lib/interview/turn";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS, startSession } from "@/lib/interview/start";
import { getContext } from "@/lib/interview/companies";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";
import {
  checkWeeklySessionQuota,
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  isFirstEverSession,
  weeklyQuotaResponse,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { FIRST_SESSION_CAP_MS } from "@/lib/interview/length";
import { forcedClosingPrompt } from "@/lib/interview/prompt";
import { canUseRound, getUserTier, upgradeRequired } from "@/lib/tiers";

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
    // Same gate the loop route applies. This path creates a session directly,
    // so without it the tier check could simply be walked around.
    if (!canUseRound(tier, roundType)) {
      return upgradeRequired(
        roundType === "coding"
          ? "The coding round is part of the Voice plan. Upgrade to practise it."
          : "The system design round is part of the Voice plan. Upgrade to practise it.",
        tier
      );
    }
    const quota = await checkWeeklySessionQuota(admin, user.id);
    if (quota.exceeded) return weeklyQuotaResponse(quota);

    const trialCapped = await isFirstEverSession(admin, user.id);

    try {
      const started = await startSession({
        admin,
        userId: user.id,
        roundType,
        company: body.company ?? null,
        level: body.level ?? null,
        trialCapped,
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
    session.artifact = {
      ...session.artifact,
      // Whitelisted: a client must not be able to rewrite problemId or forge
      // lastRun, both of which the feedback report treats as fact.
      ...sanitizeArtifactPatch(body.artifact).patch,
    };
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

  // First-ever session, and the clock's run out: end this round NOW instead
  // of whatever planTurn decided, using the same closing prompt each round
  // type already uses for its own natural "out of budget" ending -- so the
  // goodbye reads identically to a real one, just triggered by elapsed time
  // instead of the question/follow-up budget.
  //
  // Gated on phase === "questions", not merely "past greeting": when the
  // stored phase is "format", planTurn's phase==="format" branch is what
  // produces question one's text as THIS turn's reply. Overriding to the
  // closing prompt at that point would skip question one entirely and go
  // straight to goodbye -- exactly the "just the intro" failure mode the cap
  // must not produce. Only once phase has reached "questions" has question
  // one already been asked in a prior turn.
  const trialCapExpired =
    session.trial_capped === true &&
    !plan.normal.done &&
    (session.phase ?? "questions") === "questions" &&
    Date.now() - new Date(session.started_at).getTime() >= FIRST_SESSION_CAP_MS;

  // forcedClosingPrompt(), not closingPrompt(): swapping in the gentler
  // closing prompt mid-question (message history still ending on the
  // candidate's in-progress answer) was not enough to stop the model from
  // asking a follow-up anyway -- confirmed by logging the literal prompt and
  // reply during testing. See forcedClosingPrompt's own comment.
  const system = trialCapExpired ? forcedClosingPrompt() : plan.system;
  const controlToken = trialCapExpired ? null : plan.controlToken;
  const onControl = trialCapExpired ? null : plan.onControl;

  let state = trialCapExpired
    ? { ...plan.normal, done: true, phase: "closing" as const }
    : plan.normal;
  let reply = await llm(system, messages);

  if (controlToken && reply.startsWith(controlToken) && onControl) {
    state = onControl.state;
    reply = await llm(onControl.system, messages);
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
  // tell the client where to go next. A trial-capped session never chains --
  // the cap is on session #1 specifically, not on however many rounds the
  // loop it happens to belong to has; the client routes to /pricing instead.
  let nextRound: { roundType: string; sessionId: string } | null = null;
  let loopComplete: string | null = null;
  if (done && session.loop_id && !session.trial_capped) {
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
  } else if (done && session.loop_id && session.trial_capped) {
    // Close out the loop rather than leaving it "active" forever with no
    // further round ever coming.
    await admin
      .from("loops")
      .update({ status: "completed" })
      .eq("id", session.loop_id);
  }

  return NextResponse.json({
    sessionId: session.id,
    reply: reply!,
    nextRound,
    loopComplete,
    done,
    // Whenever this specific session ends -- by the clock or by naturally
    // reaching its own end first -- the client shows the trial's "explore
    // plans" screen instead of routing to feedback/next-round as normal.
    trialCapped: done && session.trial_capped === true,
    ...progressPayload(session, state),
  });
}

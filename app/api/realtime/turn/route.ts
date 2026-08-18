import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/interview/companies";
import { QUESTIONS, type Question } from "@/lib/interview/questions";
import { startSession } from "@/lib/interview/start";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";
import {
  advanceState,
  buildInstructions,
  isSubstantiveAnswer,
} from "@/lib/realtime/conversation";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

export const maxDuration = 30;

interface Body {
  sessionId: string;
  role?: "candidate" | "interviewer";
  text?: string;
  /**
   * Coding/design work product. Realtime instructions are set once when the
   * session opens, so the model would otherwise never see code written after
   * that. Sending it here refreshes the model's view.
   */
  artifact?: object;
  /** Push an artifact update without recording a turn (e.g. after "Run"). */
  artifactOnly?: boolean;
  /**
   * Set when the model called advance_question. Sent as its own request rather
   * than riding on a turn, because the tool call and the transcription arrive
   * independently and either can land first.
   */
  advanceOnly?: boolean;
}

/**
 * Persists a finalized turn from the live session and owns interview
 * progression.
 *
 * The realtime model can REQUEST to advance, but the counters live here, so a
 * live session follows exactly the same 3-question / max-2-follow-up rules as
 * text mode. The response tells the client whether to push new instructions
 * into the running session.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const body: Body = await request.json().catch(() => ({}) as Body);
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  if (!body.advanceOnly && !body.artifactOnly && (!body.role || !body.text?.trim())) {
    return NextResponse.json(
      { error: "role and text required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Artifact pushes cost nothing on the model side, so they are not charged.
  if (!body.artifactOnly) {
    const tier = await getUserTier(admin, user.id);
    const budget = await consumeGlobalBudget("realtime_turn", tier);
    if (budget.exceeded) return serviceBusyResponse(tier);
    void recordUsage("realtime_turn", user.id, request);
  }

  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Merge (never replace) so server-owned fields like problemId survive.
  if (body.artifact !== undefined) {
    session.artifact = { ...session.artifact, ...body.artifact };
    await admin
      .from("sessions")
      .update({ artifact: session.artifact })
      .eq("id", session.id);
  }

  if (!body.advanceOnly && !body.artifactOnly) {
    await admin.from("turns").insert({
      session_id: session.id,
      role: body.role,
      text: body.text!.trim(),
    });
  }

  let ctx = null;
  let loop: { company: string; level: string; rounds: string[] } | null = null;
  if (session.loop_id) {
    const { data } = await admin
      .from("loops")
      .select("company, level, rounds")
      .eq("id", session.loop_id)
      .single();
    if (data) {
      loop = data;
      ctx = getContext(data.company, data.level);
    }
  }

  /** Working rounds embed the artifact in their prompt, so it must be rebuilt. */
  const artifactDrivenRound = session.round_type !== "behavioral";

  // Artifact-only push: refresh what the model can see, change no state.
  if (body.artifactOnly) {
    return NextResponse.json({
      ok: true,
      done: false,
      instructions: artifactDrivenRound
        ? buildInstructions(
            session,
            {
              questionIndex: session.question_index,
              followupCount: session.followup_count,
              phase: (session.phase ?? "questions") as never,
              done: false,
            },
            ctx
          )
        : null,
    });
  }

  // Interviewer turns are recorded but never move the state machine.
  if (session.status !== "active") {
    return NextResponse.json({ ok: true, done: false });
  }
  if (!body.advanceOnly && body.role !== "candidate") {
    return NextResponse.json({ ok: true, done: false });
  }

  // Conversational scaffolding ("Hello?", "sorry, can you repeat that") must
  // not spend the follow-up budget. The probe caught two such lines pushing the
  // interview to the next question.
  const substantive = body.advanceOnly
    ? false
    : isSubstantiveAnswer(body.text ?? "");

  const state = advanceState(session, {
    substantive,
    modelRequestedAdvance: body.advanceOnly === true,
  });
  const questionIndex = state.questionIndex;
  const followupCount = state.followupCount;
  const done = state.done;
  const advanced = questionIndex !== session.question_index;

  console.log(
    `[realtime] turn session=${session.id} round=${session.round_type} ` +
      `substantive=${substantive} advanceReq=${body.advanceOnly === true} ` +
      `q=${session.question_index}->${questionIndex} fc=${session.followup_count}->${followupCount} ` +
      `phase=${session.phase}->${state.phase} done=${done}`
  );

  await admin
    .from("sessions")
    .update({
      question_index: questionIndex,
      followup_count: followupCount,
      phase: state.phase,
      ...(done
        ? { status: "completed", ended_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", session.id);

  // Loop sequencing is identical to the turn-based path.
  let nextRound: { roundType: string; sessionId: string } | null = null;
  let loopComplete: string | null = null;
  if (done && session.loop_id && loop) {
    const nextOrder = (session.round_order ?? 0) + 1;
    const upcoming = loop.rounds?.[nextOrder];
    if (upcoming && isRoundType(upcoming) && ROUND_IMPLEMENTED[upcoming]) {
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
    } else {
      await admin
        .from("loops")
        .update({ status: "completed" })
        .eq("id", session.loop_id);
      if ((loop.rounds?.length ?? 0) > 1) loopComplete = session.loop_id;
    }
  }

  // Forward-looking instructions, always. Never a reactive response.create:
  // turn detection has already created the model's reply by the time we get
  // here, so a second one is rejected with
  // `conversation_already_has_active_response` and silently dropped. Pushing
  // instructions instead means the model performs the acknowledgement and the
  // transition itself, in one natural utterance, on its next reply.
  const instructions = buildInstructions(session, state, ctx);

  return NextResponse.json({
    ok: true,
    done,
    advanced,
    questionIndex,
    followupCount,
    instructions,
    nextRound,
    loopComplete,
  });
}

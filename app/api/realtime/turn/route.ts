import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/interview/companies";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "@/lib/interview/questions";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS, startSession } from "@/lib/interview/start";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";
import { buildRealtimeInstructions } from "@/lib/realtime/instructions";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

interface Body {
  sessionId: string;
  role?: "candidate" | "interviewer";
  text?: string;
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

  const body: Body = await request.json().catch(() => ({}) as Body);
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  if (!body.advanceOnly && (!body.role || !body.text?.trim())) {
    return NextResponse.json(
      { error: "role and text required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!body.advanceOnly) {
    await admin.from("turns").insert({
      session_id: session.id,
      role: body.role,
      text: body.text!.trim(),
    });
  }

  // Interviewer turns are recorded but never move the state machine.
  if (session.status !== "active") {
    return NextResponse.json({ ok: true, done: false });
  }
  if (!body.advanceOnly && body.role !== "candidate") {
    return NextResponse.json({ ok: true, done: false });
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

  let questionIndex: number = session.question_index;
  let followupCount: number = session.followup_count;
  let done = false;
  let advanced = false;

  if (session.round_type === "behavioral") {
    const questions: Question[] = session.questions ?? QUESTIONS;
    if (!body.advanceOnly) followupCount += 1;
    // The model may ask to move on early, but never past the hard cap.
    const shouldAdvance = body.advanceOnly || followupCount > MAX_FOLLOWUPS;
    if (shouldAdvance) {
      questionIndex += 1;
      followupCount = 0;
      advanced = true;
      done = questionIndex >= questions.length;
    }
  } else {
    const cap =
      session.round_type === "coding" ? MAX_CODING_TURNS : MAX_DESIGN_TURNS;
    if (!body.advanceOnly) questionIndex += 1;
    done = body.advanceOnly === true || questionIndex >= cap;
  }

  await admin
    .from("sessions")
    .update({
      question_index: questionIndex,
      followup_count: followupCount,
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

  // When the question changed, hand the model refreshed instructions naming
  // the new question and the follow-up budget.
  let instructions: string | null = null;
  let sayNext: string | null = null;
  if (advanced && !done) {
    const refreshed = {
      ...session,
      question_index: questionIndex,
      followup_count: followupCount,
    };
    instructions = buildRealtimeInstructions(refreshed, ctx);
    const questions: Question[] = session.questions ?? QUESTIONS;
    sayNext = `Briefly acknowledge their answer in a few neutral words, then ask exactly this question: "${questions[questionIndex].text}"`;
  }
  if (done) {
    sayNext =
      "Thank the candidate warmly but briefly for their time. Do not give any feedback or evaluation. One or two sentences, then stop.";
  }

  return NextResponse.json({
    ok: true,
    done,
    advanced,
    questionIndex,
    followupCount,
    instructions,
    sayNext,
    nextRound,
    loopComplete,
  });
}

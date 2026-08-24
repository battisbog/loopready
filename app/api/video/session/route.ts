import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/interview/companies";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import {
  getEntitlements,
  getUserTier,
  outOfVideoCredits,
  reserveVideoCredit,
  releaseVideoCredit,
} from "@/lib/tiers";
import {
  buildInstructions,
  buildSpokenGreeting,
  shouldGreet,
} from "@/lib/realtime/conversation";
import {
  VIDEO_SESSION_MAX_MINUTES,
  VIDEO_CREDIT_THRESHOLD_MINUTES,
  VIDEO_WRAP_UP_MINUTES,
  videoAvailable,
} from "@/lib/video/config";
import { settleVideoSession } from "@/lib/video/settle";
import { createConversation, endConversation } from "@/lib/video/tavus";
import {
  DEMO_SECONDS,
  consumeDemoUse,
  demoExhaustedMessage,
  isDemoAccount,
} from "@/lib/demo/gate";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 60;

/**
 * Starts a Tavus video-avatar interview.
 *
 * ORDER MATTERS HERE. The checks run cheapest-and-most-absolute first:
 * feature flag, then auth, then rate limits, then entitlement, then the spend
 * ceiling, and only then does anything outbound and billable happen. A request
 * that is going to be refused must never cost money to refuse.
 *
 * The credit is RESERVED, not spent. It is committed later, by
 * /api/video/session/commit, once the session has proved it was real. If the
 * room fails to come up, the reservation is released in the same request.
 */
export async function POST(request: Request) {
  // 1. The flag, before anything else. When video is off this route behaves as
  //    though it does not exist, so a stale client cannot probe for it.
  if (!videoAvailable()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;
  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  // 2a. The shared demo account. Checked BEFORE entitlements, because it does
  //     not hold video credits and must not be judged by them; its budget is
  //     the lifetime cap instead. Consuming here, before the Tavus call, means
  //     a refused demo costs nothing.
  const demo = isDemoAccount(user.email);
  if (demo) {
    const gate = await consumeDemoUse(admin);
    console.log(
      `[demo] video attempt: allowed=${gate.allowed} used=${gate.used}/${gate.cap} disabled=${gate.disabled}`
    );
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: demoExhaustedMessage(gate.disabled),
          demoExhausted: true,
          signUpUrl: "/pricing",
        },
        { status: 403 }
      );
    }
  }

  // 2b. Entitlement and credits, before spending anything.
  const ent = await getEntitlements(admin, user.id);
  if (!demo && !ent.canUseVideo) return outOfVideoCredits(ent);
  // A reservation left behind by a session that already ended is not a real
  // conflict. The client can die between creating the room and settling it (a
  // crash, a closed laptop), and without this the candidate is locked out of
  // video permanently by their own previous attempt.
  if (
    ent.openReservationSessionId &&
    ent.openReservationSessionId !== sessionId
  ) {
    const { data: holder } = await admin
      .from("sessions")
      .select("id, status, video_ended_at, video_started_at, video_credit_state")
      .eq("id", ent.openReservationSessionId)
      .maybeSingle();

    // A room cannot outlive the cap Tavus enforces on it, so once that much
    // time has passed the session is over no matter what the row says.
    //
    // Without this clause a closed laptop was unrecoverable: pagehide never
    // fires, so status stayed "active" and video_ended_at stayed null, the
    // reservation was never considered stale, and the 409 below locked the
    // candidate out of video permanently while holding their credit. The
    // Tavus callback was supposed to cover this and could not -- it was being
    // refused by the proxy -- and the "sweep" its comment defers to was never
    // written.
    const startedAt = holder?.video_started_at
      ? new Date(holder.video_started_at).getTime()
      : null;
    const pastMaxDuration =
      startedAt !== null &&
      Date.now() - startedAt > (VIDEO_SESSION_MAX_MINUTES + 5) * 60_000;

    const stale =
      !holder ||
      holder.status !== "active" ||
      Boolean(holder.video_ended_at) ||
      pastMaxDuration;

    if (stale) {
      console.warn(
        `[video] recovering stale reservation on ${ent.openReservationSessionId} ` +
          `for user=${user.id} (pastMaxDuration=${pastMaxDuration})`
      );
      if (holder) {
        // Settle rather than blanket-release: a session that ran a full
        // interview before the client vanished has been delivered, and
        // handing the credit back would be giving it away.
        await settleVideoSession(admin, user.id, holder, "abandoned");
      } else {
        await releaseVideoCredit(admin, user.id, ent.openReservationSessionId);
      }
      ent.openReservationSessionId = null;
    }
  }

  if (
    ent.openReservationSessionId &&
    ent.openReservationSessionId !== sessionId
  ) {
    // One reservation at a time. Two tabs must not each hold a credit.
    return NextResponse.json(
      {
        error:
          "You already have a video interview open in another tab. Finish or close it before starting another.",
        openSessionId: ent.openReservationSessionId,
      },
      { status: 409 }
    );
  }

  // 3. Global spend ceiling. A video minute is the most expensive thing we sell.
  const tier = await getUserTier(admin, user.id);
  const budget = await consumeGlobalBudget("realtime_session", tier, 2);
  if (budget.exceeded) return serviceBusyResponse(tier);

  // 4. Reserve BEFORE calling Tavus. Reserving after a successful create would
  //    leave a billable room running with no credit attached if the reserve
  //    then failed.
  const reserved = demo
    ? ({ ok: true as const, remaining: undefined })
    : await reserveVideoCredit(admin, user.id, sessionId);
  if (!reserved.ok) {
    return NextResponse.json(
      { error: "Could not reserve a video credit.", reason: reserved.reason },
      { status: 409 }
    );
  }

  // 5. Build the interviewer. Identical to the voice path: same phase machine,
  //    same prompts, same reserve. Only the presence differs.
  let ctx = null;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level")
      .eq("id", session.loop_id)
      .single();
    if (loop) ctx = getContext(loop.company, loop.level);
  }

  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const rows = turns ?? [];
  const greet = shouldGreet(rows);

  const state = {
    questionIndex: session.question_index,
    followupCount: session.followup_count,
    phase: (session.phase ?? "greeting") as
      | "greeting"
      | "format"
      | "questions"
      | "closing",
    done: false,
  };

  let instructions: string;
  try {
    instructions =
      buildInstructions(session, state, ctx) +
      `

TIME
This session ends automatically after ${VIDEO_SESSION_MAX_MINUTES} minutes. At
around ${VIDEO_WRAP_UP_MINUTES} minutes, begin closing: finish the current
thread, thank them, and stop. Never leave them mid-answer with no ending.`;
  } catch (e) {
    if (!demo) await releaseVideoCredit(admin, user.id, sessionId);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cannot start round" },
      { status: 409 }
    );
  }

  // 6. Only now does anything billable happen.
  let conversation;
  try {
    conversation = await createConversation({
      instructions,
      // The SPOKEN form. custom_greeting is read out verbatim, so it must be
      // the actual words, never our instruction text.
      greeting: greet ? buildSpokenGreeting(session, ctx) : undefined,
      sessionId,
      // Tavus enforces this server-side; a tampered client cannot extend it.
      maxMinutes: demo ? DEMO_SECONDS / 60 : VIDEO_SESSION_MAX_MINUTES,
      callbackUrl: `${getSiteUrl()}/api/video/callback`,
    });
  } catch (e) {
    // The room never came up, so the candidate keeps their credit.
    const released = demo
      ? { ok: true }
      : await releaseVideoCredit(admin, user.id, sessionId);
    console.error(
      `[video] create failed for session=${sessionId}, credit released=${released.ok}:`,
      e
    );
    return NextResponse.json(
      { error: "Could not start the video interview. Your credit was not used." },
      { status: 502 }
    );
  }

  // 7. Record the room so the commit, cap and cleanup paths can find it.
  const { error: saveError } = await admin
    .from("sessions")
    .update({
      video_conversation_id: conversation.conversationId,
      video_started_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (saveError) {
    // We cannot track a room we failed to record, so do not leave it billing.
    await endConversation(conversation.conversationId);
    if (!demo) await releaseVideoCredit(admin, user.id, sessionId);
    console.error("[video] could not persist conversation id:", saveError);
    return NextResponse.json(
      { error: "Could not start the video interview. Your credit was not used." },
      { status: 500 }
    );
  }

  void recordUsage("video_session", user.id, request);
  console.log(
    `[video] started session=${sessionId} conversation=${conversation.conversationId} ` +
      `tier=${tier} creditsLeft=${reserved.remaining ?? "?"} greet=${greet}`
  );

  return NextResponse.json({
    conversationUrl: conversation.conversationUrl,
    conversationId: conversation.conversationId,
    maxMinutes: demo ? DEMO_SECONDS / 60 : VIDEO_SESSION_MAX_MINUTES,
    wrapUpMinutes: demo ? 0 : VIDEO_WRAP_UP_MINUTES,
    demo,
    // Where the demo sends people when their 30 seconds are up.
    ...(demo ? { demoEndsAt: "/pricing" } : {}),
    // The client shows this so a candidate knows when the credit is spent.
    creditThresholdMinutes: VIDEO_CREDIT_THRESHOLD_MINUTES,
    videoCreditsRemaining: reserved.remaining ?? ent.videoCreditsRemaining,
    shouldGreet: greet,
    state: {
      roundType: session.round_type,
      questionIndex: session.question_index,
      questionCount: (session.questions ?? []).length || 1,
      phase: state.phase,
    },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  commitVideoCredit,
  refundVideoCredit,
  releaseVideoCredit,
} from "@/lib/tiers";
import {
  VIDEO_CREDIT_THRESHOLD_MINUTES,
  videoAvailable,
} from "@/lib/video/config";
import { endConversation } from "@/lib/video/tavus";

export const maxDuration = 30;

interface Body {
  sessionId: string;
  /** Why the session is ending; decides whether the credit is spent. */
  reason?: "completed" | "user_ended" | "connect_failed" | "session_failed";
}

/**
 * Ends a video session and settles the reserved credit.
 *
 * THE SETTLEMENT RULE, in one place so it cannot drift:
 *   used enough  -> commit   (they got an interview, we charge)
 *   too short    -> release  (never really started, no charge)
 *   failed late  -> refund   (it broke on us after we charged)
 *
 * "Enough" is measured server-side from video_started_at, never from a duration
 * the client reports, because the client has an obvious incentive to under-
 * report and no authority over the clock.
 */
export async function POST(request: Request) {
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

  const body: Body = await request.json().catch(() => ({}) as Body);
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, video_conversation_id, video_started_at, video_credit_state")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Stop the meter first. Everything after this is bookkeeping, and a failure
  // in bookkeeping must not leave a room billing.
  if (session.video_conversation_id) {
    await endConversation(session.video_conversation_id);
  }

  // Idempotent: a page unload plus an explicit end must not settle twice.
  if (session.video_credit_state && session.video_credit_state !== "reserved") {
    return NextResponse.json({
      ok: true,
      settlement: session.video_credit_state,
      alreadySettled: true,
    });
  }

  const startedAt = session.video_started_at
    ? new Date(session.video_started_at).getTime()
    : null;
  const minutes = startedAt ? (Date.now() - startedAt) / 60000 : 0;
  const reachedThreshold = minutes >= VIDEO_CREDIT_THRESHOLD_MINUTES;
  const reason = body.reason ?? "user_ended";

  let settlement: "committed" | "released" | "refunded";
  let ok = false;

  if (reason === "connect_failed" || !startedAt) {
    // Never connected. Nothing to charge for.
    ok = (await releaseVideoCredit(admin, user.id, session.id)).ok;
    settlement = "released";
  } else if (reason === "session_failed" && reachedThreshold) {
    // It ran long enough to charge, then broke. Charge, then hand it back, so
    // the ledger shows what happened rather than silently swallowing it.
    await commitVideoCredit(admin, user.id, session.id);
    ok = (
      await refundVideoCredit(
        admin,
        user.id,
        session.id,
        `session failed after ${minutes.toFixed(1)} min`
      )
    ).ok;
    settlement = "refunded";
  } else if (reachedThreshold) {
    ok = (await commitVideoCredit(admin, user.id, session.id)).ok;
    settlement = "committed";
  } else {
    // They left early. A few minutes of avatar is not an interview.
    ok = (await releaseVideoCredit(admin, user.id, session.id)).ok;
    settlement = "released";
  }

  await admin
    .from("sessions")
    .update({
      video_credit_state: settlement,
      video_ended_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  console.log(
    `[video] settled session=${session.id} reason=${reason} ` +
      `minutes=${minutes.toFixed(1)} threshold=${VIDEO_CREDIT_THRESHOLD_MINUTES} ` +
      `-> ${settlement} (ok=${ok})`
  );

  return NextResponse.json({
    ok,
    settlement,
    minutes: Number(minutes.toFixed(1)),
    charged: settlement === "committed",
  });
}

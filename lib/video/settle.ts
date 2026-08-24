import type { SupabaseClient } from "@supabase/supabase-js";
import {
  commitVideoCredit,
  refundVideoCredit,
  releaseVideoCredit,
} from "@/lib/tiers";
import { VIDEO_CREDIT_THRESHOLD_MINUTES } from "@/lib/video/config";

/**
 * THE SETTLEMENT RULE, in one place so it cannot drift:
 *   used enough  -> commit   (they got an interview, we charge)
 *   too short    -> release  (never really started, no charge)
 *   failed late  -> refund   (it broke on us after we charged)
 *
 * "Enough" is measured server-side from video_started_at, never from a duration
 * the client reports, because the client has an obvious incentive to
 * under-report and no authority over the clock.
 *
 * This lives here rather than in /api/video/end because two callers need it:
 * the end route, and the recovery path that settles a session whose client
 * never came back to end it.
 */

export type EndReason =
  | "completed"
  | "user_ended"
  | "connect_failed"
  | "session_failed"
  /** No client ever reported back; recovered later by another request. */
  | "abandoned";

export type Settlement = "committed" | "released" | "refunded";

export interface SettleResult {
  settlement: Settlement;
  ok: boolean;
  minutes: number;
  alreadySettled: boolean;
}

export interface SettleableSession {
  id: string;
  video_started_at: string | null;
  video_credit_state: string | null;
}

/**
 * Settles the credit a video session reserved, exactly once.
 *
 * Idempotent: any state other than "reserved"/null means a previous call
 * already settled it, and the stored settlement is returned unchanged.
 */
export async function settleVideoSession(
  admin: SupabaseClient,
  userId: string,
  session: SettleableSession,
  reason: EndReason
): Promise<SettleResult> {
  if (session.video_credit_state && session.video_credit_state !== "reserved") {
    return {
      settlement: session.video_credit_state as Settlement,
      ok: true,
      minutes: 0,
      alreadySettled: true,
    };
  }

  const startedAt = session.video_started_at
    ? new Date(session.video_started_at).getTime()
    : null;
  const minutes = startedAt ? (Date.now() - startedAt) / 60000 : 0;
  const reachedThreshold = minutes >= VIDEO_CREDIT_THRESHOLD_MINUTES;

  let settlement: Settlement;
  let ok = false;

  if (reason === "connect_failed" || !startedAt) {
    // Never connected. Nothing to charge for.
    ok = (await releaseVideoCredit(admin, userId, session.id)).ok;
    settlement = "released";
  } else if (reason === "session_failed" && reachedThreshold) {
    // It ran long enough to charge, then broke. Charge, then hand it back, so
    // the ledger shows what happened rather than silently swallowing it.
    await commitVideoCredit(admin, userId, session.id);
    ok = (
      await refundVideoCredit(
        admin,
        userId,
        session.id,
        `session failed after ${minutes.toFixed(1)} min`
      )
    ).ok;
    settlement = "refunded";
  } else if (reachedThreshold) {
    ok = (await commitVideoCredit(admin, userId, session.id)).ok;
    settlement = "committed";
  } else {
    // They left early. A few minutes of avatar is not an interview.
    ok = (await releaseVideoCredit(admin, userId, session.id)).ok;
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

  return { settlement, ok, minutes, alreadySettled: false };
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { videoAvailable } from "@/lib/video/config";
import { settleVideoSession, type EndReason } from "@/lib/video/settle";
import { endConversation } from "@/lib/video/tavus";

export const maxDuration = 30;

interface Body {
  sessionId: string;
  /** Why the session is ending; decides whether the credit is spent. */
  reason?: EndReason;
}

/**
 * Ends a video session and settles the reserved credit.
 *
 * The settlement rule itself lives in lib/video/settle.ts, because the
 * recovery path in /api/video/session needs the identical decision for a
 * session whose client never came back to end it.
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

  const reason = body.reason ?? "user_ended";
  const result = await settleVideoSession(admin, user.id, session, reason);

  if (result.alreadySettled) {
    return NextResponse.json({
      ok: true,
      settlement: result.settlement,
      alreadySettled: true,
    });
  }

  const { settlement, ok, minutes } = result;

  return NextResponse.json({
    ok,
    settlement,
    minutes: Number(minutes.toFixed(1)),
    charged: settlement === "committed",
  });
}

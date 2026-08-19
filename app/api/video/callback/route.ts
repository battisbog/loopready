import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { videoAvailable } from "@/lib/video/config";

export const maxDuration = 30;

/**
 * Tavus lifecycle callbacks.
 *
 * This is the safety net for the case the browser cannot cover: a candidate
 * closing their laptop mid-interview. The client's own end call never fires,
 * so without this the session row would sit open forever and the credit would
 * stay reserved.
 *
 * It deliberately does NOT settle the credit. Settlement lives in one place
 * (/api/video/end) so the rule cannot drift; this only records that the room
 * is gone and lets the sweep settle it.
 */
export async function POST(request: Request) {
  if (!videoAvailable()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const conversationId =
    body.conversation_id ?? body.conversationId ?? body.properties?.conversation_id;
  const event = body.event_type ?? body.event ?? "unknown";

  if (!conversationId) {
    // Acknowledge anyway: a 4xx makes Tavus retry something we cannot use.
    console.warn("[video] callback with no conversation id:", event);
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const ended = /ended|shutdown|completed|error/i.test(String(event));

  if (ended) {
    const { error } = await admin
      .from("sessions")
      .update({ video_ended_at: new Date().toISOString() })
      .eq("video_conversation_id", conversationId)
      .is("video_ended_at", null);
    if (error) console.error("[video] callback update failed:", error);
  }

  console.log(`[video] callback event=${event} conversation=${conversationId}`);
  return NextResponse.json({ ok: true });
}

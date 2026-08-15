import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startSession } from "@/lib/interview/start";
import { ROUND_IMPLEMENTED, isRoundType } from "@/lib/interview/rounds";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("sessions")
    .select("id, status, loop_id, round_order")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "active") {
    await admin
      .from("sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  // Ending a round early must still advance the loop. Without this the
  // remaining rounds are never created and the loop stalls forever.
  let nextRound: { roundType: string; sessionId: string } | null = null;
  let loopComplete: string | null = null;

  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level, rounds")
      .eq("id", session.loop_id)
      .single();

    if (loop) {
      const nextOrder = (session.round_order ?? 0) + 1;
      const upcoming = loop.rounds?.[nextOrder];

      if (upcoming && isRoundType(upcoming) && ROUND_IMPLEMENTED[upcoming]) {
        // Don't create a duplicate if this round was already advanced past.
        const { data: existing } = await admin
          .from("sessions")
          .select("id")
          .eq("loop_id", session.loop_id)
          .eq("round_order", nextOrder)
          .maybeSingle();

        if (existing) {
          nextRound = { roundType: upcoming, sessionId: existing.id };
        } else {
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
        }
      } else {
        await admin
          .from("loops")
          .update({ status: "completed" })
          .eq("id", session.loop_id);
        if ((loop.rounds?.length ?? 0) > 1) loopComplete = session.loop_id;
      }
    }
  }

  return NextResponse.json({ ok: true, nextRound, loopComplete });
}

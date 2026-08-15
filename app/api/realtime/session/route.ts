import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/interview/companies";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  REALTIME_MODEL,
  REALTIME_VOICE,
  TURN_DETECTION,
} from "@/lib/realtime/config";
import {
  ADVANCE_TOOL,
  buildRealtimeGreeting,
  buildRealtimeInstructions,
} from "@/lib/realtime/instructions";

export const maxDuration = 30;

/**
 * Mints a short-lived client secret for a WebRTC realtime session.
 * The standing OPENAI_API_KEY never reaches the browser.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Realtime voice needs OPENAI_API_KEY" },
      { status: 501 }
    );
  }

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

  let ctx = null;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level")
      .eq("id", session.loop_id)
      .single();
    if (loop) ctx = getContext(loop.company, loop.level);
  }

  let instructions: string;
  try {
    instructions = buildRealtimeInstructions(session, ctx);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cannot start round" },
      { status: 409 }
    );
  }

  // Resuming mid-interview: replay what has been said so the model has the
  // conversation so far rather than starting cold.
  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions,
        tools: [ADVANCE_TOOL],
        tool_choice: "auto",
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            turn_detection: TURN_DETECTION,
          },
          output: { voice: REALTIME_VOICE },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error("[realtime] client_secret failed:", await res.text());
    return NextResponse.json(
      { error: "Could not start the live interview" },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    clientSecret: data.value,
    expiresAt: data.expires_at,
    model: REALTIME_MODEL,
    voice: REALTIME_VOICE,
    greeting: buildRealtimeGreeting(session, ctx?.profile.displayName),
    history: (turns ?? []).map((t) => ({ role: t.role, text: t.text })),
    state: {
      roundType: session.round_type,
      questionIndex: session.question_index,
      questionCount: (session.questions ?? []).length || 1,
    },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/interview/companies";
import { discardGeneratedOpening } from "@/lib/interview/start";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";
import {
  NOISE_REDUCTION_CONFIG,
  REALTIME_MODEL,
  REALTIME_VOICE,
  TURN_DETECTION,
} from "@/lib/realtime/config";
import {
  ADVANCE_TOOL,
  buildGreeting,
  buildInstructions,
  shouldGreet,
} from "@/lib/realtime/conversation";

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

  const admin = createAdminClient();

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  // A whole round is charged here, not per turn. Once the WebRTC connection is
  // up it bills continuously without touching our server again, so refusing to
  // mint the secret is the only control point we have over it.
  const tier = await getUserTier(admin, user.id);
  const budget = await consumeGlobalBudget("realtime_session", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);
  void recordUsage("realtime_session", user.id, request);

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

  // Opening state: nothing has advanced yet, so the state is the row itself.
  const state = {
    questionIndex: session.question_index,
    followupCount: session.followup_count,
    phase: (session.phase ?? "questions") as
      | "greeting"
      | "format"
      | "questions"
      | "closing",
    done: false,
  };

  let instructions: string;
  try {
    instructions = buildInstructions(session, state, ctx);
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

  const rows = turns ?? [];
  // The interviewer owes an opening until the candidate has actually spoken.
  const greet = shouldGreet(rows);
  // Nothing in the transcript is real until then, and the generated opening
  // startSession stored is never spoken on this path -- the model greets from
  // buildGreeting and the result is transcribed back as its own turn.
  if (greet && rows.length) await discardGeneratedOpening(admin, sessionId);
  // When we are about to greet, the stored opening line was never delivered
  // aloud, so replaying it would make the model believe it had already spoken
  // and it would wait in silence. That was the silent-greeting bug.
  const history = greet ? [] : rows.map((t) => ({ role: t.role, text: t.text }));

  console.log(
    `[realtime] session=${sessionId} round=${session.round_type} turns=${rows.length} greet=${greet} history=${history.length}`
  );

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
            // Filters breaths/room noise out before turn detection ever sees
            // them, so they never register as candidate speech in the first
            // place. See lib/realtime/config.ts for the field verification.
            noise_reduction: NOISE_REDUCTION_CONFIG,
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
    greeting: buildGreeting(session, ctx),
    shouldGreet: greet,
    history,
    state: {
      roundType: session.round_type,
      questionIndex: session.question_index,
      questionCount: (session.questions ?? []).length || 1,
    },
  });
}

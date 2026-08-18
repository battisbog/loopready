import { NextResponse } from "next/server";
import { streamText, type ModelMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { interviewModel } from "@/lib/ai";
import { getContext } from "@/lib/interview/companies";
import { planTurn, progressPayload, type TurnState } from "@/lib/interview/turn";
import { startSession } from "@/lib/interview/start";
import { isRoundType, ROUND_IMPLEMENTED } from "@/lib/interview/rounds";
import { SentenceBuffer } from "@/lib/sentences";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

export const maxDuration = 60;

// Streams the interviewer's reply as speakable sentences so the client can
// start TTS on sentence one instead of waiting for the whole turn.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cheap gates first: nothing paid runs until all of these pass.
  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("interview", request);
  if (!ipLimited.ok) return ipLimited.response!;

  // Tier decides which ceiling applies: free traffic is cut off first so the
  // remaining headroom stays reserved for paying customers.
  const tier = await getUserTier(createAdminClient(), user.id);
  const budget = await consumeGlobalBudget("interview_turn", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);

  const admin = createAdminClient();
  const body = await request.json().catch(() => ({}));

  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (!body.userMessage?.trim()) {
    return NextResponse.json({ error: "userMessage required" }, { status: 400 });
  }

  await admin.from("turns").insert({
    session_id: session.id,
    role: "candidate",
    text: body.userMessage.trim(),
  });

  if (body.artifact !== undefined) {
    session.artifact = { ...session.artifact, ...body.artifact };
    await admin
      .from("sessions")
      .update({ artifact: session.artifact })
      .eq("id", session.id);
  }

  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const messages: ModelMessage[] = [
    { role: "user", content: "(The candidate joins the interview.)" },
    ...(turns ?? []).map(
      (t): ModelMessage => ({
        role: t.role === "interviewer" ? "assistant" : "user",
        content: t.text,
      })
    ),
  ];

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

  const plan = planTurn(session, ctx);
  if ("error" in plan) {
    return NextResponse.json({ error: plan.error }, { status: 409 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      const runGeneration = async (
        system: string,
        detectControl: string | null
      ): Promise<{ text: string; sawControl: boolean }> => {
        const result = streamText({ model: interviewModel(), system, messages });
        const sentences = new SentenceBuffer();
        let full = "";
        const sawControl = false;
        // Hold back the opening tokens until we know it isn't a control token.
        let gate = detectControl ? "" : null;

        for await (const token of result.textStream) {
          if (gate !== null) {
            gate += token;
            if (gate.trimStart().startsWith(detectControl!)) {
              return { text: "", sawControl: true };
            }
            // Enough characters to rule the token out?
            if (gate.trimStart().length < detectControl!.length) continue;
            const released = gate;
            gate = null;
            full += released;
            for (const s of sentences.push(released)) send("sentence", { text: s });
            continue;
          }
          full += token;
          for (const s of sentences.push(token)) send("sentence", { text: s });
        }

        if (gate !== null) {
          // Stream ended inside the gate (very short reply).
          if (gate.trimStart().startsWith(detectControl!)) {
            return { text: "", sawControl: true };
          }
          full += gate;
          for (const s of sentences.push(gate)) send("sentence", { text: s });
        }

        const tail = sentences.flush();
        if (tail) send("sentence", { text: tail });
        return { text: full.trim(), sawControl };
      };

      try {
        let state: TurnState = plan.normal;
        const first = await runGeneration(plan.system, plan.controlToken);
        let text = first.text;

        if (first.sawControl && plan.onControl) {
          state = plan.onControl.state;
          text = (await runGeneration(plan.onControl.system, null)).text;
        }

        // The model call succeeded; count it for abuse monitoring.
        void recordUsage("interview", user.id, request);

        // Persist exactly as the non-streaming route does.
        await admin
          .from("turns")
          .insert({ session_id: session.id, role: "interviewer", text });
        await admin
          .from("sessions")
          .update({
            question_index: state.questionIndex,
            followup_count: state.followupCount,
            phase: state.phase,
            ...(state.done
              ? { status: "completed", ended_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", session.id);

        let nextRound: { roundType: string; sessionId: string } | null = null;
        // Set when a MULTI-round loop just finished, so the client can send the
        // candidate to the combined verdict instead of the last round's debrief.
        let loopComplete: string | null = null;
        if (state.done && session.loop_id && loop) {
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

        send("done", {
          reply: text,
          done: state.done,
          nextRound,
          loopComplete,
          ...progressPayload(session, state),
        });
      } catch (e) {
        console.error("interview stream failed", e);
        send("error", { error: "Interview error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

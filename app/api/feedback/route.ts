import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { feedbackModel } from "@/lib/ai";
import { feedbackSchema } from "@/lib/feedback/schema";
import {
  CODING_FEEDBACK_SYSTEM_PROMPT,
  DESIGN_FEEDBACK_SYSTEM_PROMPT,
  FEEDBACK_SYSTEM_PROMPT,
  codingFeedbackUserPrompt,
  designFeedbackUserPrompt,
  feedbackUserPrompt,
} from "@/lib/feedback/prompt";
import { getContext } from "@/lib/interview/companies";
import { getProblem } from "@/lib/coding/problems";
import { getDesignPrompt } from "@/lib/design/prompts";
import { describeDiagram } from "@/lib/design/prompt";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("feedback", user.id);
  if (!limited.ok) return limited.response!;

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

  // Idempotent: return existing feedback if already generated
  const { data: existing } = await admin
    .from("feedback")
    .select()
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      overallSignal: existing.overall_signal,
      ...existing.content,
    });
  }

  const { data: turns } = await admin
    .from("turns")
    .select("role, text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const candidateTurns = (turns ?? []).filter((t) => t.role === "candidate");
  if (candidateTurns.length === 0) {
    return NextResponse.json(
      { error: "Nothing to evaluate — the candidate never answered" },
      { status: 422 }
    );
  }

  const transcript = (turns ?? [])
    .map((t) => `${t.role === "interviewer" ? "INTERVIEWER" : "CANDIDATE"}: ${t.text}`)
    .join("\n\n");

  let ctx = null;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level")
      .eq("id", session.loop_id)
      .single();
    if (loop) ctx = getContext(loop.company, loop.level);
  }

  const isCoding = session.round_type === "coding";
  const isDesign = session.round_type === "system_design";
  const problem = isCoding ? getProblem(session.artifact?.problemId) : undefined;
  const design = isDesign ? getDesignPrompt(session.artifact?.promptId) : undefined;

  const { object } = await generateObject({
    model: feedbackModel(),
    schema: feedbackSchema,
    system: isDesign
      ? DESIGN_FEEDBACK_SYSTEM_PROMPT
      : isCoding
        ? CODING_FEEDBACK_SYSTEM_PROMPT
        : FEEDBACK_SYSTEM_PROMPT,
    prompt: isDesign && design
      ? designFeedbackUserPrompt(
          transcript,
          describeDiagram(session.artifact),
          design.title,
          design.strongAnswerCovers,
          ctx
        )
      : isCoding && problem
        ? codingFeedbackUserPrompt(
            transcript,
            session.artifact?.code ?? "",
            session.artifact?.language ?? "python",
            session.artifact?.lastRun ?? null,
            problem.title,
            problem.strongAnswerCovers,
            ctx
          )
        : feedbackUserPrompt(transcript, ctx),
    providerOptions: { gateway: { tags: ["feature:feedback"] } },
  });

  await admin.from("feedback").insert({
    session_id: sessionId,
    overall_signal: object.overallSignal,
    content: object,
  });

  return NextResponse.json(object);
}

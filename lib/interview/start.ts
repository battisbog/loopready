import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { interviewModel } from "@/lib/ai";
import { greetingPrompt } from "./prompt";
import { getContext } from "./companies";
import { pickSessionQuestions, type Question } from "./questions";
import type { RoundType } from "./rounds";
import { pickProblem } from "@/lib/coding/problems";
import { codingOpening } from "@/lib/coding/prompt";
import { pickDesignPrompt } from "@/lib/design/prompts";
import { designOpening } from "@/lib/design/prompt";

interface StartArgs {
  admin: SupabaseClient;
  userId: string;
  roundType: RoundType;
  loopId?: string | null;
  roundOrder?: number;
  company?: string | null;
  level?: string | null;
}

export const MAX_CODING_TURNS = 14;

/**
 * The opening is generated rather than templated: a fixed string is exactly the
 * "script being read" feel we are trying to avoid, and the interviewer needs to
 * invent a consistent name and team for itself.
 */
async function generateGreeting(
  ctx: ReturnType<typeof getContext>,
  companyName?: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: interviewModel(),
      system: greetingPrompt(ctx),
      messages: [{ role: "user", content: "(The candidate joins the call.)" }],
    });
    const greeting = text.trim();
    if (greeting) return greeting;
  } catch (e) {
    console.error("[interview] greeting generation failed:", e);
  }
  // Never block the start of an interview on the model.
  const where =
    companyName && companyName !== "Generic FAANG" ? ` at ${companyName}` : "";
  return `Hi, thanks for joining. I'm a senior engineer${where}, and I'll be running your interview today. Before we start, tell me a bit about yourself and what you've been working on recently.`;
}

// Creates a session row (optionally inside a loop) and stores the opening turn.
export async function startSession({
  admin,
  userId,
  roundType,
  loopId = null,
  roundOrder = 0,
  company = null,
  level = null,
}: StartArgs) {
  const ctx = company && level ? getContext(company, level) : null;

  const row: Record<string, unknown> = {
    user_id: userId,
    round_type: roundType,
    loop_id: loopId,
    round_order: roundOrder,
  };

  let questionCount = 1;

  // The round's material is chosen now, but the interview OPENS with a
  // greeting. The problem or first question is presented later, once the
  // candidate has introduced themselves and heard the format.
  if (roundType === "system_design") {
    const design = pickDesignPrompt(ctx?.tier ?? "mid");
    row.artifact = { promptId: design.id, nodes: [], edges: [] };
  } else if (roundType === "coding") {
    const problem = pickProblem(ctx?.tier ?? "mid", {
      company: ctx?.profile.displayName,
    });
    const language = "python";
    row.artifact = {
      problemId: problem.id,
      language,
      code: problem.signatures[language],
    };
  } else {
    const questions = pickSessionQuestions(
      3,
      ctx?.profile.competencyEmphasis ?? [],
      { tier: ctx?.tier }
    );
    row.questions = questions;
    questionCount = questions.length;
  }

  row.phase = "greeting";
  const reply = await generateGreeting(ctx, ctx?.profile.displayName);

  const { data: session, error } = await admin
    .from("sessions")
    .insert(row)
    .select()
    .single();
  if (error || !session) throw new Error("Failed to create session");

  await admin
    .from("turns")
    .insert({ session_id: session.id, role: "interviewer", text: reply });

  return {
    sessionId: session.id as string,
    reply,
    done: false,
    questionIndex: 0,
    questionCount,
  };
}
export const MAX_DESIGN_TURNS = 16;

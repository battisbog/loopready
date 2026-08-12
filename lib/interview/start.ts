import type { SupabaseClient } from "@supabase/supabase-js";
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

function behavioralOpening(firstQuestion: Question, companyName?: string): string {
  const where = companyName && companyName !== "Generic FAANG" ? ` at ${companyName}` : "";
  return `Hi, thanks for joining. I'm a senior engineer${where} and I'll be running your behavioral round today — about three questions, and I may dig into your answers. Let's get started. ${firstQuestion.text}`;
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

  let reply: string;
  let questionCount = 1;

  if (roundType === "system_design") {
    const design = pickDesignPrompt(ctx?.tier ?? "mid");
    row.artifact = { promptId: design.id, nodes: [], edges: [] };
    reply = designOpening(design, ctx?.profile.displayName);
  } else if (roundType === "coding") {
    const problem = pickProblem(ctx?.tier ?? "mid");
    const language = "python";
    row.artifact = {
      problemId: problem.id,
      language,
      code: problem.signatures[language],
    };
    reply = codingOpening(problem, ctx?.profile.displayName);
  } else {
    const questions = pickSessionQuestions(3, ctx?.profile.competencyEmphasis ?? []);
    row.questions = questions;
    questionCount = questions.length;
    reply = behavioralOpening(questions[0], ctx?.profile.displayName);
  }

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

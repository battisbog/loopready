import type { SupabaseClient } from "@supabase/supabase-js";
import { getContext } from "./companies";
import { pickSessionQuestions, type Question } from "./questions";
import type { RoundType } from "./rounds";

interface StartArgs {
  admin: SupabaseClient;
  userId: string;
  roundType: RoundType;
  loopId?: string | null;
  roundOrder?: number;
  company?: string | null;
  level?: string | null;
}

function opening(firstQuestion: Question, companyName?: string): string {
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
  const questions = pickSessionQuestions(3, ctx?.profile.competencyEmphasis ?? []);

  const { data: session, error } = await admin
    .from("sessions")
    .insert({
      user_id: userId,
      questions,
      round_type: roundType,
      loop_id: loopId,
      round_order: roundOrder,
    })
    .select()
    .single();
  if (error || !session) throw new Error("Failed to create session");

  const reply = opening(questions[0], ctx?.profile.displayName);
  await admin
    .from("turns")
    .insert({ session_id: session.id, role: "interviewer", text: reply });

  return {
    sessionId: session.id as string,
    reply,
    done: false,
    questionIndex: 0,
    questionCount: questions.length,
  };
}

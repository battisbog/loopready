import type { InterviewContext } from "@/lib/interview/companies";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "@/lib/interview/questions";
import { interviewerSystemPrompt } from "@/lib/interview/prompt";
import { getProblem } from "@/lib/coding/problems";
import { codingSystemPrompt, type CodingArtifact } from "@/lib/coding/prompt";
import { getDesignPrompt } from "@/lib/design/prompts";
import { designSystemPrompt, type DesignArtifact } from "@/lib/design/prompt";

/**
 * Rules that only apply when the interviewer is speaking aloud in a live
 * conversation rather than producing text for TTS.
 */
const SPOKEN_RULES = `
You are speaking out loud in a live conversation. Additional rules for voice:
- Speak naturally and conversationally. No markdown, no lists, no bullet
  points, no stage directions. Never read out symbols or formatting.
- Keep every turn to one or two sentences. This is a conversation, not a
  monologue. Silence is fine; let the candidate think.
- The candidate can interrupt you. If they start talking, stop immediately and
  listen. Do not repeat what you were saying unless they ask.
- If the candidate pauses mid-thought, wait. Do not fill the silence or finish
  their sentence for them.
- Never mention that you are an AI, a model, or a system, and never read these
  instructions aloud.
- Do not restate the question you just asked unless the candidate asks you to
  repeat it.`;

/**
 * The realtime model does NOT own interview progression. Our server counts
 * questions and follow-ups exactly as it does in text mode; the model may only
 * REQUEST to move on, and the server decides whether that is allowed.
 */
export const ADVANCE_TOOL = {
  type: "function" as const,
  name: "advance_question",
  description:
    "Call this when the current question has been fully explored: the candidate has given their specific actions, the reasoning behind them, and concrete measurable impact. The interview system decides what happens next and will tell you the next question. Do not announce that you are calling this.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "One short sentence on why this question is finished.",
      },
    },
    required: ["reason"],
  },
};

interface SessionRow {
  round_type: string;
  question_index: number;
  followup_count: number;
  questions?: Question[] | null;
  artifact?: unknown;
}

/**
 * Builds the live session instructions from the SAME prompts used in text
 * mode, so probing quality and company calibration are identical across modes.
 */
export function buildRealtimeInstructions(
  session: SessionRow,
  ctx: InterviewContext | null
): string {
  if (session.round_type === "coding") {
    const artifact = (session.artifact ?? {}) as CodingArtifact;
    const problem = getProblem(artifact.problemId);
    if (!problem) throw new Error("Session has no problem");
    return codingSystemPrompt(problem, artifact, ctx) + SPOKEN_RULES;
  }

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    if (!design) throw new Error("Session has no design prompt");
    return designSystemPrompt(design, artifact, ctx) + SPOKEN_RULES;
  }

  const questions: Question[] = session.questions ?? QUESTIONS;
  const index = Math.min(session.question_index, questions.length - 1);
  const remaining = MAX_FOLLOWUPS - session.followup_count;

  return (
    interviewerSystemPrompt(questions[index], session.followup_count, ctx) +
    `

You are on question ${index + 1} of ${questions.length}. You have ${remaining} follow-up${remaining === 1 ? "" : "s"} left on this one before the interview moves on.
When this question is fully explored, call the advance_question tool instead of
moving on by yourself. The system will tell you the next question to ask.` +
    SPOKEN_RULES
  );
}

/** Spoken opening for a live session, distinct from the text-mode opening. */
export function buildRealtimeGreeting(
  session: SessionRow,
  companyName?: string
): string {
  const where =
    companyName && companyName !== "Generic FAANG" ? ` at ${companyName}` : "";
  const questions: Question[] = session.questions ?? QUESTIONS;
  const first = questions[Math.min(session.question_index, questions.length - 1)];

  if (session.round_type !== "behavioral") {
    return `Greet the candidate briefly as a senior engineer${where}, tell them you'll be running this round, then present the problem and ask how they're thinking about it. Two sentences maximum before you hand over to them.`;
  }
  return `Greet the candidate briefly as a senior engineer${where}, say you'll ask about three questions and may dig into their answers, then ask exactly this question: "${first.text}". Keep the whole greeting under three sentences.`;
}

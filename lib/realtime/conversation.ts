import type { InterviewContext } from "@/lib/interview/companies";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "@/lib/interview/questions";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS } from "@/lib/interview/start";
import {
  closingPrompt,
  interviewerSystemPrompt,
  type Phase,
} from "@/lib/interview/prompt";
import { getProblem } from "@/lib/coding/problems";
import { codingSystemPrompt, type CodingArtifact } from "@/lib/coding/prompt";
import { getDesignPrompt } from "@/lib/design/prompts";
import { designSystemPrompt, type DesignArtifact } from "@/lib/design/prompt";

/**
 * The single implementation of realtime greeting and interaction, shared by
 * every round.
 *
 * WHY THIS IS FORWARD-LOOKING
 * ---------------------------
 * Turn detection creates the model's reply the instant the candidate stops
 * speaking. Transcription and our own server round-trip both finish about 1.7
 * seconds later, so anything we try to say in reaction to a turn is rejected
 * with `conversation_already_has_active_response` and silently dropped. That is
 * measurable, not theoretical: see scripts/realtime-probe.mts.
 *
 * So nothing here reacts. After every turn we push instructions describing what
 * the model should do on its NEXT reply, and `session.update` always lands in
 * time because it is not competing with an in-flight response. The interviewer
 * therefore acknowledges and transitions on its own, in one natural utterance,
 * instead of being interrupted by a second forced one.
 */

export interface RealtimeSessionRow {
  round_type: string;
  question_index: number;
  followup_count: number;
  questions?: Question[] | null;
  artifact?: unknown;
  phase?: string | null;
}

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
 * How the interviewer must open every reply. Without this the model jumps
 * straight to its next question, which is what made the round feel like a
 * question dispenser.
 */
const ACKNOWLEDGE_RULE = `

HOW TO REACT TO WHAT THEY JUST SAID
Never open a reply with a bare question. Every single time, first react to the
substance of what they actually said in a few words: name the specific thing
they described, or reflect the tradeoff they made. Then ask your question in
the same breath, as one natural utterance. If their answer was thin or evasive,
say what is missing before you probe. If they asked you a question, answer it
first.`;

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

/**
 * Whether a candidate utterance is a real answer or just conversational
 * scaffolding.
 *
 * The probe caught "Hello?" and "Can you hear me?" each consuming a follow-up,
 * so two throwaway lines could push the interview to the next question. Only
 * substantive answers should spend the budget.
 */
export function isSubstantiveAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 25) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 6) return false;
  // Pure acknowledgements and repair requests, however long-winded.
  if (
    /^(hello|hi|hey|yes|yeah|yep|no|nope|ok|okay|sure|sorry|what|pardon|hmm+|uh+|um+)\b/i.test(
      trimmed
    ) &&
    words.length < 12
  ) {
    return false;
  }
  if (/^(can you (hear|repeat)|could you repeat|say that again|one (sec|moment))/i.test(trimmed)) {
    return false;
  }
  return true;
}

export interface RealtimeState {
  questionIndex: number;
  followupCount: number;
  phase: Phase;
  done: boolean;
}

/**
 * Advances the interview state by one candidate turn. Mirrors the text-mode
 * counters in lib/interview/turn.ts so the two modes cannot drift.
 */
export function advanceState(
  session: RealtimeSessionRow,
  opts: { substantive: boolean; modelRequestedAdvance: boolean }
): RealtimeState {
  const phase = (session.phase ?? "questions") as Phase;
  let questionIndex = session.question_index;
  let followupCount = session.followup_count;
  let done = false;

  if (session.round_type !== "behavioral") {
    const cap =
      session.round_type === "coding" ? MAX_CODING_TURNS : MAX_DESIGN_TURNS;
    if (opts.substantive) questionIndex += 1;
    done = opts.modelRequestedAdvance || questionIndex >= cap;
    return {
      questionIndex,
      followupCount: 0,
      phase: done ? "closing" : "questions",
      done,
    };
  }

  const questions: Question[] = session.questions ?? QUESTIONS;

  // The opening arc: the first substantive thing they say is their intro, not
  // an answer to a question, so it must not spend the follow-up budget.
  if (phase === "greeting" || phase === "format") {
    return {
      questionIndex,
      followupCount: 0,
      phase: "questions",
      done: false,
    };
  }

  if (opts.substantive) followupCount += 1;
  const exhausted = followupCount > MAX_FOLLOWUPS;

  if (opts.modelRequestedAdvance || exhausted) {
    questionIndex += 1;
    followupCount = 0;
    done = questionIndex >= questions.length;
  }

  return {
    questionIndex,
    followupCount,
    phase: done ? "closing" : "questions",
    done,
  };
}

/** The round's own system prompt, identical to what text mode uses. */
function roundPrompt(
  session: RealtimeSessionRow,
  state: RealtimeState,
  ctx: InterviewContext | null
): string {
  if (session.round_type === "coding") {
    const artifact = (session.artifact ?? {}) as CodingArtifact;
    const problem = getProblem(artifact.problemId);
    if (!problem) throw new Error("Session has no problem");
    return codingSystemPrompt(problem, artifact, ctx);
  }

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    if (!design) throw new Error("Session has no design prompt");
    return designSystemPrompt(design, artifact, ctx);
  }

  const questions: Question[] = session.questions ?? QUESTIONS;
  const index = Math.min(state.questionIndex, questions.length - 1);
  return interviewerSystemPrompt(questions[index], state.followupCount, ctx);
}

/**
 * Builds the instructions the model should act on for its NEXT reply.
 *
 * `state` is the state AFTER the turn just taken, so the directive always
 * describes what to do next rather than what should have happened.
 */
export function buildInstructions(
  session: RealtimeSessionRow,
  state: RealtimeState,
  ctx: InterviewContext | null
): string {
  if (state.done || state.phase === "closing") {
    return (
      closingPrompt() +
      `

The interview is over. Thank them warmly but briefly, give no feedback or
evaluation of any kind, and then stop talking.` +
      SPOKEN_RULES
    );
  }

  const base = roundPrompt(session, state, ctx);

  if (session.round_type !== "behavioral") {
    return (
      base +
      `

WHEN THE ROUND IS FINISHED
When the problem has been genuinely worked through, call the advance_question
tool rather than wrapping up by yourself. The system decides when the round
ends.` +
      ACKNOWLEDGE_RULE +
      SPOKEN_RULES
    );
  }

  const questions: Question[] = session.questions ?? QUESTIONS;
  const index = Math.min(state.questionIndex, questions.length - 1);
  const remaining = MAX_FOLLOWUPS - state.followupCount;
  const isLastQuestion = index >= questions.length - 1;

  // The one place the forward-looking design pays off: when the budget is
  // spent, the model is told in ADVANCE to transition on its next reply, so it
  // does so in a single natural utterance instead of being cut off by a second
  // forced response that the API would reject anyway.
  const directive =
    remaining <= 0
      ? isLastQuestion
        ? `

THIS IS YOUR LAST EXCHANGE
You have fully covered this question and it is the final one. On your next
reply, react briefly to what they just said, then thank them and close the
interview. Give no feedback or evaluation.`
        : `

MOVE ON NOW
You have fully covered question ${index + 1}. On your next reply, react briefly
to what they just said, then move to the next question and ask exactly this,
word for word: "${questions[index + 1].text}"
Do this in one natural utterance. Do not ask another follow-up on the current
question.`
      : `

You are on question ${index + 1} of ${questions.length}, with ${remaining} follow-up${remaining === 1 ? "" : "s"} left on it.
Keep probing this question. When it is genuinely exhausted before your budget
runs out, call the advance_question tool rather than moving on by yourself.`;

  return base + directive + ACKNOWLEDGE_RULE + SPOKEN_RULES;
}

/**
 * The spoken opening. Used only when the round has not actually begun.
 *
 * Covers the greeting and format phases of the text-mode arc in one utterance,
 * because in live voice a separate "here is the format" turn just delays the
 * candidate's first chance to speak.
 */
export function buildGreeting(
  session: RealtimeSessionRow,
  ctx: InterviewContext | null
): string {
  const name = ctx?.profile.displayName;
  const where = name && name !== "Generic FAANG" ? ` at ${name}` : "";

  if (session.round_type === "coding") {
    const artifact = (session.artifact ?? {}) as CodingArtifact;
    const problem = getProblem(artifact.problemId);
    return `Open the interview out loud. Introduce yourself as a senior engineer${where} and greet the candidate warmly. Say you'll be running their coding round. Tell them they can think out loud and that you care more about their reasoning than perfect syntax. Then state this problem in your own words, conversationally, without reading it verbatim: "${problem?.title ?? "the problem on screen"} — ${problem?.statement ?? ""}". Finish by asking how they want to approach it. Keep the whole thing to about four sentences, then stop and let them talk.`;
  }

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    return `Open the interview out loud. Introduce yourself as a senior engineer${where} and greet the candidate warmly. Say you'll be running their system design round. Tell them to start wherever they like and to think out loud. Then present this prompt in your own words, conversationally: "${design?.title ?? "the prompt on screen"} — ${design?.statement ?? ""}". Finish by asking what questions they have about the requirements before they start. Keep the whole thing to about four sentences, then stop and let them talk.`;
  }

  const questions: Question[] = session.questions ?? QUESTIONS;
  const first = questions[Math.min(session.question_index, questions.length - 1)];
  return `Open the interview out loud. Introduce yourself as a senior engineer${where} and greet the candidate warmly. Say you'll be running their behavioral round. Tell them it's about three questions and that you'll dig into their answers. Then ask exactly this question, word for word: "${first.text}". Keep the whole thing to about three sentences, then stop and let them talk.`;
}

/**
 * Whether the interviewer still owes the candidate an opening.
 *
 * NOT `history.length === 0`. startSession writes a generated opening line into
 * `turns` before the round is ever loaded, so a fresh session always has one
 * row and that test was never true. The reliable signal is whether the
 * CANDIDATE has ever spoken: until they have, the round has not begun,
 * whatever the interviewer rows say.
 */
export function shouldGreet(turns: { role: string }[]): boolean {
  return !turns.some((t) => t.role === "candidate");
}

import {
  GENERIC_DISPLAY_NAME,
  type InterviewContext,
} from "@/lib/interview/companies";
import { QUESTIONS, type Question } from "@/lib/interview/questions";
import {
  MAX_FOLLOWUPS,
  PACING_RULES,
  TARGET_MINUTES,
} from "@/lib/interview/length";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS } from "@/lib/interview/length";
import {
  closingPrompt,
  firstQuestionPrompt,
  formatPrompt,
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
substance of what they actually said in a few words: name back the specific
thing they described, or restate the tradeoff they made. Then ask your question
in the same breath, as one natural utterance.

Acknowledging is NOT approving and NOT helping. Reflect only what they actually
said, neutrally. Do not evaluate it, do not say whether it was good, and do not
add anything they did not say. If their answer was thin, probe the gap with a
question rather than naming what was missing, since naming it tells them the
answer. If they asked you a direct question about the format or the problem
statement, answer that; if they asked for the solution, put it back on them.`;

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

  // The opening arc, walked one step per candidate turn exactly as the text
  // path does. Collapsing it meant the candidate was never asked to introduce
  // themselves, which is the first thing a real interview does.
  //
  // Deliberately NOT gated on `substantive`: "yeah, sounds good" is a complete
  // and correct answer to "are you ready?", and must still advance the arc.
  if (phase === "greeting") {
    // They have just introduced themselves.
    return { questionIndex, followupCount: 0, phase: "format", done: false };
  }
  if (phase === "format") {
    // They have just confirmed they are ready.
    return { questionIndex, followupCount: 0, phase: "questions", done: false };
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

  // ─── the opening arc ───────────────────────────────────────────────────
  //
  // These are shifted one step, and that is not a mistake. Instructions here
  // are FORWARD-LOOKING: turn detection creates the model's reply before our
  // update can land, so what we install during phase P is what the model says
  // AFTER the candidate's phase-P turn.
  //
  //   installed during   the model's next reply does
  //   greeting           react to their intro, explain the format, ask if ready
  //   format             ask the first question / present the problem
  //   questions          probe
  //
  // Getting this off by one is what would make it ask question one straight
  // after their introduction, which is the bug being fixed.

  if (state.phase === "greeting") {
    return (
      formatPrompt(session.round_type, ctx) +
      `

Do NOT ask an interview question and do NOT present the problem in this reply.
Finish by handing back to them, then stop and listen.` +
      SPOKEN_RULES
    );
  }

  if (state.phase === "format") {
    if (session.round_type === "behavioral") {
      const qs: Question[] = session.questions ?? QUESTIONS;
      return (
        firstQuestionPrompt(qs[Math.min(state.questionIndex, qs.length - 1)], ctx) +
        PACING_RULES +
        SPOKEN_RULES
      );
    }
    // Working rounds present the problem here rather than asking a question.
    return (
      roundPrompt(session, state, ctx) +
      `

They have just confirmed they are ready. In this reply, present the problem
conversationally in your own words and ask how they want to approach it. Do not
read it out verbatim and do not start critiquing anything yet.` +
      ACKNOWLEDGE_RULE +
      PACING_RULES +
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
      PACING_RULES +
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

  return base + directive + ACKNOWLEDGE_RULE + PACING_RULES + SPOKEN_RULES;
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
  const where = name && name !== GENERIC_DISPLAY_NAME ? ` at ${name}` : "";
  const level = ctx?.levelLabel ? ` for a ${ctx.levelLabel} role` : "";

  const round =
    session.round_type === "coding"
      ? "coding round"
      : session.round_type === "system_design"
        ? "system design round"
        : "behavioral round";

  // Mirrors greetingPrompt in the text path: introduce yourself, say what the
  // session is, then hand the floor over. Crucially it does NOT ask an
  // interview question or present the problem yet, because a real interview
  // starts by hearing who the candidate is.
  return `Open the interview out loud, speaking naturally.

Do all of this in three or four sentences, in one flow:
- Say hello, give yourself a first name and a team, and say you are a senior
  engineer${where} (for example "Hi, I'm Priya, I'm a senior engineer on the
  payments team"). Pick a name and stay consistent with it for the whole
  interview.
- Say in one line that this is their ${round}${level} and that it will take
  about ${TARGET_MINUTES} minutes.
- Then hand over: ask them to tell you a bit about themselves and what they
  have been working on recently.

Do NOT ask an interview question yet. Do NOT present the problem yet. Do NOT
explain the format yet. Do NOT list anything. End by giving them the floor, then
stop talking and listen.`;
}

/**
 * The greeting as WORDS, not as instructions.
 *
 * buildGreeting returns a directive ("Open the interview out loud. Say hello,
 * give yourself a first name...") because the voice path hands it to
 * response.create, where the model follows it. Tavus's custom_greeting is the
 * opposite: it is the literal script the avatar speaks. Passing the directive
 * there made the interviewer read our prompt aloud, word for word.
 *
 * Same arc as the voice greeting: introduce, say what the session is, then hand
 * over. Deliberately no interview question and no problem statement.
 */
export function buildSpokenGreeting(
  session: RealtimeSessionRow,
  ctx: InterviewContext | null,
  interviewerName = "Sam"
): string {
  const company = ctx?.profile.displayName;
  const where = company && company !== GENERIC_DISPLAY_NAME ? ` here at ${company}` : "";
  const level = ctx?.levelLabel ? ` for the ${ctx.levelLabel} role` : "";

  const round =
    session.round_type === "coding"
      ? "coding round"
      : session.round_type === "system_design"
        ? "system design round"
        : "behavioral round";

  return (
    `Hi, I'm ${interviewerName}, I'm a senior engineer${where}. ` +
    `I'll be running your ${round}${level} today, and we'll take about 40 minutes. ` +
    `Before we get into it, tell me a bit about yourself and what you've been working on recently.`
  );
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

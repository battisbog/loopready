import type { InterviewContext } from "./companies";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "./questions";
import {
  closingPrompt,
  firstQuestionPrompt,
  formatPrompt,
  greetingPrompt,
  interviewerSystemPrompt,
  transitionPrompt,
  type Phase,
} from "./prompt";
import { MAX_CODING_TURNS, MAX_DESIGN_TURNS } from "./start";
import { getProblem } from "@/lib/coding/problems";
import {
  codingClosingPrompt,
  codingSystemPrompt,
  type CodingArtifact,
} from "@/lib/coding/prompt";
import { getDesignPrompt } from "@/lib/design/prompts";
import {
  designClosingPrompt,
  designSystemPrompt,
  type DesignArtifact,
} from "@/lib/design/prompt";

export interface TurnState {
  questionIndex: number;
  followupCount: number;
  done: boolean;
  phase: Phase;
}

export interface TurnPlan {
  /** System prompt for the first (usually only) generation. */
  system: string;
  /** If the model opens with this token, it wants to move on instead. */
  controlToken: string | null;
  /** State to persist if the model produced a normal reply. */
  normal: TurnState;
  /** Prompt + state to use when the control token fired. */
  onControl: { system: string; state: TurnState } | null;
}

interface SessionRow {
  round_type: string;
  question_index: number;
  followup_count: number;
  questions?: Question[] | null;
  artifact?: unknown;
  /** Sessions created before phases existed default to "questions". */
  phase?: string | null;
}

/**
 * Decides what to ask next. Pure and synchronous so the streaming and
 * non-streaming routes cannot drift apart.
 */
export function planTurn(
  session: SessionRow,
  ctx: InterviewContext | null
): TurnPlan | { error: string } {
  const questionIndex = session.question_index;
  const followupCount = session.followup_count;
  const phase = (session.phase ?? "questions") as Phase;

  // ---- Opening arc, before any interview question is asked ----
  // Every round type shares this: greet, hear their intro, set expectations,
  // then begin. Only after that does the round-specific machine take over.
  if (phase === "greeting") {
    return {
      system: formatPrompt(session.round_type, ctx),
      controlToken: null,
      normal: {
        questionIndex,
        followupCount,
        done: false,
        phase: "format",
      },
      onControl: null,
    };
  }

  if (phase === "format") {
    // Behavioral asks its first question here; the working rounds present
    // their problem via the round prompt instead.
    const questions: Question[] = session.questions ?? QUESTIONS;
    const opener =
      session.round_type === "behavioral"
        ? firstQuestionPrompt(questions[0], ctx)
        : null;

    if (opener) {
      return {
        system: opener,
        controlToken: null,
        normal: {
          questionIndex: 0,
          followupCount: 0,
          done: false,
          phase: "questions",
        },
        onControl: null,
      };
    }
    // Coding / system design: fall through to the round prompt, which states
    // the problem, but mark the phase as started.
  }

  // True only on the single turn right after their self-intro, for a
  // non-behavioral round (phase was "format" and there was no behavioral
  // opener above). Without an explicit note here, codingSystemPrompt /
  // designSystemPrompt read like the round is already underway -- nothing in
  // them says "this is the very first reply, present the problem now" -- so
  // the model has no signal that further questions about the candidate's
  // background are off the table. Mirrors the same fix in
  // lib/realtime/conversation.ts's buildInstructions, made after a live
  // trial session asked about the candidate's projects again right where the
  // problem should have been presented.
  const justIntroduced = phase === "format";
  const transitionNote = justIntroduced
    ? `

They have just introduced themselves. Their background is now closed -- do
not ask anything more about their experience, projects, or resume. In this
reply, acknowledge their intro in one short line, then present the problem
conversationally in your own words and ask how they want to approach it. Do
not read it out verbatim and do not start critiquing anything yet.`
    : "";

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    if (!design) return { error: "Session has no design prompt" };
    const next = questionIndex + 1;
    const outOfTurns = next >= MAX_DESIGN_TURNS;
    const closing = {
      system: designClosingPrompt(),
      state: {
        questionIndex: next,
        followupCount: 0,
        done: true,
        phase: "closing" as Phase,
      },
    };
    if (outOfTurns) {
      return { system: closing.system, controlToken: null, normal: closing.state, onControl: null };
    }
    return {
      system: designSystemPrompt(design, artifact, ctx) + transitionNote,
      controlToken: "[DONE]",
      normal: {
        questionIndex: next,
        followupCount: 0,
        done: false,
        phase: "questions",
      },
      onControl: closing,
    };
  }

  if (session.round_type === "coding") {
    const artifact = (session.artifact ?? {}) as CodingArtifact;
    const problem = getProblem(artifact.problemId);
    if (!problem) return { error: "Session has no problem" };
    const next = questionIndex + 1;
    const outOfTurns = next >= MAX_CODING_TURNS;
    const closing = {
      system: codingClosingPrompt(),
      state: {
        questionIndex: next,
        followupCount: 0,
        done: true,
        phase: "closing" as Phase,
      },
    };
    if (outOfTurns) {
      return { system: closing.system, controlToken: null, normal: closing.state, onControl: null };
    }
    return {
      system: codingSystemPrompt(problem, artifact, ctx) + transitionNote,
      controlToken: "[DONE]",
      normal: {
        questionIndex: next,
        followupCount: 0,
        done: false,
        phase: "questions",
      },
      onControl: closing,
    };
  }

  // Behavioral: probe the current question, or advance to the next one.
  const questions: Question[] = session.questions ?? QUESTIONS;
  const advanceIndex = questionIndex + 1;
  const finished = advanceIndex >= questions.length;
  const advance = {
    system: finished
      ? closingPrompt()
      : transitionPrompt(questions[advanceIndex], ctx),
    state: {
      questionIndex: advanceIndex,
      followupCount: 0,
      done: finished,
      phase: (finished ? "closing" : "questions") as Phase,
    },
  };

  if (followupCount >= MAX_FOLLOWUPS) {
    return {
      system: advance.system,
      controlToken: null,
      normal: advance.state,
      onControl: null,
    };
  }

  return {
    system: interviewerSystemPrompt(questions[questionIndex], followupCount, ctx),
    controlToken: "[NEXT]",
    normal: {
      questionIndex,
      followupCount: followupCount + 1,
      done: false,
      phase: "questions",
    },
    onControl: advance,
  };
}

export function progressPayload(
  session: SessionRow,
  state: TurnState
): Record<string, number> {
  if (session.round_type !== "behavioral") {
    return { questionIndex: 0, questionCount: 1, turn: state.questionIndex };
  }
  const questions: Question[] = session.questions ?? QUESTIONS;
  return {
    questionIndex: Math.min(state.questionIndex, questions.length - 1),
    questionCount: questions.length,
  };
}

import type { InterviewContext } from "./companies";
import { MAX_FOLLOWUPS, QUESTIONS, type Question } from "./questions";
import {
  closingPrompt,
  interviewerSystemPrompt,
  transitionPrompt,
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

  if (session.round_type === "system_design") {
    const artifact = (session.artifact ?? {}) as DesignArtifact;
    const design = getDesignPrompt(artifact.promptId);
    if (!design) return { error: "Session has no design prompt" };
    const next = questionIndex + 1;
    const outOfTurns = next >= MAX_DESIGN_TURNS;
    const closing = {
      system: designClosingPrompt(),
      state: { questionIndex: next, followupCount: 0, done: true },
    };
    if (outOfTurns) {
      return { system: closing.system, controlToken: null, normal: closing.state, onControl: null };
    }
    return {
      system: designSystemPrompt(design, artifact, ctx),
      controlToken: "[DONE]",
      normal: { questionIndex: next, followupCount: 0, done: false },
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
      state: { questionIndex: next, followupCount: 0, done: true },
    };
    if (outOfTurns) {
      return { system: closing.system, controlToken: null, normal: closing.state, onControl: null };
    }
    return {
      system: codingSystemPrompt(problem, artifact, ctx),
      controlToken: "[DONE]",
      normal: { questionIndex: next, followupCount: 0, done: false },
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

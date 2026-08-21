import { ROUND_IMPLEMENTED, isRoundType, type RoundType } from "./rounds";

/**
 * A configured loop: which rounds, in order, and how each one is delivered.
 *
 * Shared by the client (to preview cost) and the server (to enforce it), so the
 * "this loop will use N credits" the candidate is shown and the number the
 * server charges cannot disagree.
 */

export type RoundMode = "voice" | "video";

export interface PlannedRound {
  roundType: RoundType;
  mode: RoundMode;
}

/** A loop longer than this is not practice, it is an endurance test. */
export const MAX_ROUNDS_PER_LOOP = 6;
/** Per type, so nobody queues five identical behavioral rounds by accident. */
export const MAX_PER_ROUND_TYPE = 3;

export interface PlanCost {
  totalRounds: number;
  videoRounds: number;
  /** 1 credit per video ROUND. Voice rounds are free on an entitled tier. */
  creditsNeeded: number;
}

/**
 * What a plan costs. One credit per video round, never per loop, so a candidate
 * can mix a video behavioral with voice coding and pay for exactly the one.
 */
export function planCost(rounds: PlannedRound[]): PlanCost {
  const videoRounds = rounds.filter((r) => r.mode === "video").length;
  return {
    totalRounds: rounds.length,
    videoRounds,
    creditsNeeded: videoRounds,
  };
}

export type PlanProblem =
  | { code: "empty"; message: string }
  | { code: "too_many"; message: string }
  | { code: "too_many_of_type"; message: string }
  | { code: "unavailable_round"; message: string }
  | { code: "video_disabled"; message: string }
  | { code: "not_enough_credits"; message: string; creditsNeeded: number; creditsAvailable: number };

/**
 * Validates a plan. The SERVER is the authority: the client uses this only to
 * disable the button early and explain why, and every check runs again on the
 * request. A crafted request must not be able to start six video rounds on one
 * credit.
 */
export function validatePlan(
  rounds: unknown,
  opts: { videoEnabled: boolean; creditsAvailable: number }
): { ok: true; plan: PlannedRound[]; cost: PlanCost } | { ok: false; problem: PlanProblem } {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return { ok: false, problem: { code: "empty", message: "Choose at least one round." } };
  }
  if (rounds.length > MAX_ROUNDS_PER_LOOP) {
    return {
      ok: false,
      problem: {
        code: "too_many",
        message: `A loop can have at most ${MAX_ROUNDS_PER_LOOP} rounds.`,
      },
    };
  }

  const plan: PlannedRound[] = [];
  const perType = new Map<string, number>();

  for (const raw of rounds) {
    const roundType = (raw as PlannedRound)?.roundType;
    const mode = (raw as PlannedRound)?.mode === "video" ? "video" : "voice";

    if (!isRoundType(roundType) || !ROUND_IMPLEMENTED[roundType]) {
      return {
        ok: false,
        problem: { code: "unavailable_round", message: "That round is not available yet." },
      };
    }
    const n = (perType.get(roundType) ?? 0) + 1;
    if (n > MAX_PER_ROUND_TYPE) {
      return {
        ok: false,
        problem: {
          code: "too_many_of_type",
          message: `At most ${MAX_PER_ROUND_TYPE} rounds of the same type.`,
        },
      };
    }
    perType.set(roundType, n);

    if (mode === "video" && !opts.videoEnabled) {
      // Fails closed rather than quietly downgrading: silently giving someone
      // voice when they asked for video is worse than refusing.
      return {
        ok: false,
        problem: { code: "video_disabled", message: "Video interviews are not available yet." },
      };
    }
    plan.push({ roundType, mode });
  }

  const cost = planCost(plan);
  if (cost.creditsNeeded > opts.creditsAvailable) {
    return {
      ok: false,
      problem: {
        code: "not_enough_credits",
        message:
          `This loop needs ${cost.creditsNeeded} video credit${cost.creditsNeeded === 1 ? "" : "s"} ` +
          `and you have ${opts.creditsAvailable}. Switch some rounds to voice, or buy more credits.`,
        creditsNeeded: cost.creditsNeeded,
        creditsAvailable: opts.creditsAvailable,
      },
    };
  }

  return { ok: true, plan, cost };
}

/** One-click starting points, so the common case is not a configuration task. */
export const PRESETS: {
  id: string;
  label: string;
  description: string;
  rounds: RoundType[];
}[] = [
  {
    id: "full",
    label: "Full loop",
    description: "Behavioral, coding and system design, like a real onsite.",
    rounds: ["behavioral", "coding", "system_design"],
  },
  {
    id: "behavioral",
    label: "Behavioral only",
    description: "One behavioral round.",
    rounds: ["behavioral"],
  },
  {
    id: "coding",
    label: "Coding only",
    description: "Two coding rounds, back to back.",
    rounds: ["coding", "coding"],
  },
];

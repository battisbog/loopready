/**
 * How long a round runs. One place, so length can be tuned without hunting
 * through prompts and state machines.
 *
 * The target is a realistic 30 to 45 minutes per round. A real loop does not
 * ask three questions and stop; it covers ground and digs in. Practice that
 * ends in fifteen minutes teaches the wrong pacing, and a candidate who has
 * only ever answered three questions is not ready for a session that asks
 * eight.
 *
 * Every value is env-overridable so length can be tuned against real sessions
 * without a deploy.
 *
 * ARITHMETIC behind the defaults, so they can be re-derived rather than
 * guessed at. One exchange (candidate answer plus the interviewer's reply) runs
 * roughly 90 seconds in practice.
 *
 *   behavioral   2 intro turns + 5 questions x (1 answer + 3 follow-ups)
 *                = 22 exchanges  ~=  33 min, and longer when answers run long
 *   coding       20 exchanges, but they are slower because the candidate is
 *                also typing  ~=  35 min
 *   design       22 exchanges, slower again because they are drawing  ~= 38 min
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Main behavioral questions per session, each from a different competency. */
export const BEHAVIORAL_QUESTIONS = envInt("INTERVIEW_BEHAVIORAL_QUESTIONS", 5);

/**
 * Follow-ups allowed per behavioral question before the round moves on.
 *
 * This is a ceiling, not a quota: the interviewer may still call
 * advance_question early when a question is genuinely exhausted. Raising it
 * buys depth (situation, their specific actions, impact, what they would change)
 * rather than more surface area.
 */
export const MAX_FOLLOWUPS = envInt("INTERVIEW_MAX_FOLLOWUPS", 3);

/** Candidate turns before the coding round closes. */
export const MAX_CODING_TURNS = envInt("INTERVIEW_CODING_TURNS", 20);

/** Candidate turns before the system design round closes. */
export const MAX_DESIGN_TURNS = envInt("INTERVIEW_DESIGN_TURNS", 22);

/** Shown to the candidate up front, and used in the interviewer's pacing. */
export const TARGET_MINUTES = envInt("INTERVIEW_TARGET_MINUTES", 40);

/**
 * How long a brand-new user's first-ever session runs before it is wrapped up
 * and routed to /pricing (see lib/rate-limit.ts's isFirstEverSession and
 * sessions.trial_capped).
 *
 * Traced against the live-voice opening arc rather than the ~90s/exchange
 * figure above, which is for TEXT mode's separately-turned greeting and
 * format phases. Voice's buildGreeting (lib/realtime/conversation.ts) folds
 * both into ONE spoken utterance before the candidate ever replies, so voice
 * needs only a single candidate turn (their self-intro) before the first real
 * question is asked -- one fewer exchange than text mode.
 *
 *   greeting+format (merged) + candidate intro   ~45-60s
 *   Q1 asked + candidate's first real answer     ~55-70s
 *   one follow-up asked + answered                ~55-70s
 *   connection/turn-detection/model latency        ~15-20s
 *   -----------------------------------------------------
 *   total to "question asked, answered, and one probing follow-up"  ~3-3.5 min
 *
 * 4 minutes leaves margin for a slower/nervous candidate to complete that
 * follow-up exchange rather than being cut off mid-arc, which is the whole
 * point of the cap (a taste of a REAL exchange, not just the greeting).
 */
export const FIRST_SESSION_CAP_MINUTES = envInt("FIRST_SESSION_CAP_MINUTES", 4);
export const FIRST_SESSION_CAP_MS = FIRST_SESSION_CAP_MINUTES * 60_000;

/**
 * Pacing guidance shared by every round.
 *
 * Without this the model races: it treats each answer as a box to tick and
 * moves on, which is what made rounds finish in half the intended time. This
 * tells it that depth is the job. It deliberately does not license hint-giving;
 * the reserve rules in stance.ts still apply.
 */
export const PACING_RULES = `

PACING
This round runs about ${TARGET_MINUTES} minutes. You are not trying to get
through material, you are trying to understand this candidate. Spending several
minutes on one question is normal and correct.

Before you move on from anything, make sure you actually have: the situation,
what THEY specifically did (not the team), the reasoning behind those choices,
and the concrete result. If any of those is missing or vague, that is your next
question. A follow-up that digs into an answer you already have is almost always
more useful than a new topic.

Do not rush to the next question to save time, and do not wrap the interview up
early because you feel you have enough. The system decides when the round ends.`;

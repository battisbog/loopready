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
 * How long the "Try it free" trial session (homepage hero CTA, VIDEO mode)
 * runs before it is wrapped up and routed to /pricing. See
 * app/trial/start/page.tsx (creates the flagged session) and
 * sessions.trial_capped (the flag the turn routes and buildInstructions key
 * off to force a graceful close).
 *
 * The trial round is CODING (app/trial/start/page.tsx), not behavioral, so
 * this is re-derived for that pacing specifically rather than reusing
 * behavioral's arc:
 *
 *   greeting+format (merged, one utterance) + candidate intro   ~45-60s
 *   problem presented + candidate talks through their approach  ~55-70s
 *     (codingSystemPrompt asks for approach before code, same as text mode)
 *   candidate actually WRITES some code before there is anything
 *     real to discuss -- this is the term behavioral's arc doesn't
 *     have at all, and it's not optional: a check-in on zero code
 *     written is not a "real probing exchange"                   ~90-120s
 *   one real exchange about that code (interviewer reacts,
 *     candidate responds)                                        ~55-70s
 *   connection/turn-detection/model latency, Daily/WebRTC room
 *     join, Tavus avatar connect (video adds real latency voice
 *     doesn't have -- lib/video/config.ts's own comment notes
 *     generally slower turn-taking too)                          ~20-30s
 *   -----------------------------------------------------------------
 *   total to "problem understood, code written, one real exchange about it"
 *                                                                 ~4.5-5.8 min
 *
 * Set to 6 minutes for margin to actually reach that exchange rather than
 * being cut off mid-typing, which is the whole point of the cap (a taste of
 * a REAL exchange, not just the problem statement). Tavus's own hard
 * maxMinutes cutoff (app/api/video/session/route.ts) is set a couple of
 * minutes past this as a backstop, not the primary mechanism -- see its own
 * comment.
 */
export const TRIAL_TASTE_MINUTES = envInt("TRIAL_TASTE_MINUTES", 6);
export const TRIAL_TASTE_MS = TRIAL_TASTE_MINUTES * 60_000;

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

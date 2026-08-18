/**
 * What each paid operation actually costs, in microdollars (1e-6 USD).
 *
 * The global daily ceiling used to count CALLS, which made it meaningless: one
 * realtime voice session and one TTS sentence both counted as "1", despite
 * differing by three orders of magnitude. A cap expressed in calls cannot
 * protect a bill expressed in dollars.
 *
 * These figures come from measured token usage (scripts/realtime-probe.mts
 * prints real `usage` blocks) plus published list prices, rounded UP. They are
 * estimates for budgeting, not billing: the point is that the ceiling is in the
 * right unit and the relative weights are honest.
 */

/** 1 US dollar expressed in the unit used throughout this module. */
export const USD = 1_000_000;

export type Operation =
  /** One text-mode interviewer turn (generateText). */
  | "interview_turn"
  /** Minting a realtime WebRTC session. Charged up front, see below. */
  | "realtime_session"
  /** One realtime exchange: instructions re-sent plus audio in and out. */
  | "realtime_turn"
  /** One TTS sentence. */
  | "tts_sentence"
  /** One Whisper transcription of a candidate utterance. */
  | "transcribe"
  /** One sandboxed code execution. */
  | "code_run"
  /** End-of-round feedback (large structured generation). */
  | "feedback"
  /** Loop-level combined verdict. */
  | "loop_summary";

/**
 * Measured basis for the realtime numbers, so these can be re-derived when
 * prices move:
 *   in  ≈ 1394 tokens/turn (1231 text + 163 audio), cached 0
 *   out ≈  418 tokens/turn (127 text + 291 audio)
 * at text $4/$16 and audio $32/$64 per million, that is ~31,000 microdollars.
 *
 * `cached 0` is the thing to watch: the ~3.4k-character instruction set is
 * re-sent every turn, so a long round costs more than turn_count x this.
 */
export const COST: Record<Operation, number> = {
  interview_turn: 4_000, // $0.004
  // A whole session, charged when the secret is minted, because that is the
  // only moment we can refuse. Sized for a full round rather than a turn:
  // refusing at mint time is the only lever we have over a WebRTC connection
  // that then bills continuously without touching our server.
  realtime_session: 700_000, // $0.70
  realtime_turn: 31_000, // $0.031, measured
  tts_sentence: 1_500, // $0.0015
  transcribe: 600, // $0.0006, Whisper at $0.006/min
  code_run: 1_000, // $0.001, sandbox compute
  feedback: 20_000, // $0.02, long structured output
  loop_summary: 12_000, // $0.012
};

/**
 * The daily ceiling, in dollars. Set GLOBAL_DAILY_API_CAP_USD in the
 * environment; there is no way to change it without a deploy otherwise, which
 * is the point of a backstop.
 */
export const DAILY_CAP_USD = Number(process.env.GLOBAL_DAILY_API_CAP_USD ?? 25);

export const DAILY_CAP_MICRO = Math.round(DAILY_CAP_USD * USD);

/**
 * Fraction of the daily ceiling free users may consume.
 *
 * Above this, free traffic is refused while paying customers keep working. The
 * remainder is a reserve that only paid tiers can spend, so a spike in free
 * usage can never take the product away from someone who paid for it.
 */
export const FREE_TIER_BUDGET_SHARE = Number(
  process.env.FREE_TIER_BUDGET_SHARE ?? 0.6
);

export const FREE_TIER_CEILING_MICRO = Math.round(
  DAILY_CAP_MICRO * FREE_TIER_BUDGET_SHARE
);

/** Human-readable dollars, for logs and the dashboard. */
export function usd(micro: number): string {
  return `$${(micro / USD).toFixed(2)}`;
}

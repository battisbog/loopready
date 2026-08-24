/**
 * Posting a turn from a LIVE round, with retries.
 *
 * Why this exists rather than a bare fetch in each hook:
 *
 * A live round is autonomous. Once the WebRTC or Tavus session is up, the model
 * keeps interviewing whether or not our server is reachable. So a failed turn
 * POST does not look like a failure to the candidate -- the interviewer carries
 * on asking questions -- while underneath, the turn is never persisted and the
 * phase machine never advances.
 *
 * Both hooks previously swallowed that: the realtime hook returned null on
 * !res.ok, and the video hook never checked res.ok at all (an error body is
 * still valid JSON, so it read as success and did nothing). A single 429 or a
 * 503 from the spend ceiling could therefore truncate a candidate's transcript
 * silently, and the debrief would be graded on the fragment that survived.
 *
 * Transient statuses are retried on a short backoff -- short enough to land
 * inside a normal pause between turns, so retries cannot reorder the
 * transcript. Anything still failing after that is reported, because a
 * candidate is better served by knowing than by a silently ruined interview.
 */

/** Statuses worth trying again: rate limit, spend ceiling, transient server. */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const BACKOFF_MS = [300, 900];

/** What /api/realtime/turn returns on success. */
export interface TurnResponse {
  ok?: boolean;
  done?: boolean;
  advanced?: boolean;
  questionIndex?: number;
  followupCount?: number;
  instructions?: string | null;
  nextRound?: { roundType?: string; sessionId: string } | null;
  loopComplete?: string | null;
}

export interface TurnPostResult {
  ok: boolean;
  data: TurnResponse | null;
  /** Set when every attempt failed; suitable for showing to the candidate. */
  error: string | null;
}

export async function postTurn(
  sessionId: string,
  body: Record<string, unknown>
): Promise<TurnPostResult> {
  let lastStatus = 0;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      const res = await fetch("/api/realtime/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...body }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as TurnResponse | null;
        return { ok: true, data, error: null };
      }

      lastStatus = res.status;
      if (!RETRYABLE.has(res.status)) break;
    } catch {
      // Network blip: same treatment as a transient server error.
      lastStatus = 0;
    }

    const delay = BACKOFF_MS[attempt];
    if (delay === undefined) break;
    await new Promise((r) => setTimeout(r, delay));
  }

  console.error(`[interview] turn POST failed (status ${lastStatus || "network"})`);
  return {
    ok: false,
    data: null,
    error:
      lastStatus === 429
        ? "We're having trouble keeping up. Your last answer may not have been saved."
        : "We couldn't save your last answer. Your connection may have dropped.",
  };
}

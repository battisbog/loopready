/**
 * Video-avatar interview configuration.
 *
 * The entire feature is dark until BOTH flags are on. They are separate on
 * purpose: the client flag decides whether the UI ever offers video, and the
 * server flag decides whether the API will start one. A stale client bundle,
 * a crafted request, or a half-finished rollout therefore cannot start a paid
 * Tavus session while the feature is meant to be off.
 */

/** Client-visible. Controls whether video appears in the UI at all. */
export const VIDEO_ENABLED_CLIENT =
  process.env.NEXT_PUBLIC_VIDEO_ENABLED === "true";

/**
 * Server-side authority. Must be explicitly "true"; anything else is off,
 * including unset, so a missing env var can never enable a paid feature.
 */
export const VIDEO_ENABLED_SERVER = process.env.VIDEO_ENABLED === "true";

/**
 * Which Tavus account is live.
 *
 * A second account exists purely as a failover, configured with an identical
 * persona (same system prompt, same objectives and guardrails, same replica,
 * same turn-taking and LLM settings) so a switch changes nothing the candidate
 * can perceive.
 *
 * The switch is a deliberate manual act, not automatic failover. Silently
 * retrying a failed video session against a second billed account would double
 * the spend on a transient error and hide the outage that caused it, so
 * flipping this is a decision a human makes.
 *
 * To switch: set TAVUS_USE_BACKUP=true in Vercel and redeploy.
 */
export const TAVUS_USE_BACKUP = process.env.TAVUS_USE_BACKUP === "true";

/**
 * Credentials for whichever account is selected. Absent means the feature
 * cannot run, whatever the flags.
 *
 * Falls back to the primary value per-field, so a half-filled backup config
 * cannot silently produce a mismatched pair -- e.g. the backup API key with
 * the primary's persona id, which belongs to a different account and would
 * fail on every request.
 */
const useBackup =
  TAVUS_USE_BACKUP && Boolean(process.env.TAVUS_BACKUP_API_KEY);

export const TAVUS = {
  apiKey:
    (useBackup ? process.env.TAVUS_BACKUP_API_KEY : process.env.TAVUS_API_KEY) ??
    "",
  replicaId:
    (useBackup
      ? process.env.TAVUS_BACKUP_REPLICA_ID ?? process.env.TAVUS_REPLICA_ID
      : process.env.TAVUS_REPLICA_ID) ?? "",
  personaId:
    (useBackup
      ? process.env.TAVUS_BACKUP_PERSONA_ID
      : process.env.TAVUS_PERSONA_ID) ?? "",
  apiBase: process.env.TAVUS_API_BASE ?? "https://tavusapi.com",
  /** Which account these credentials belong to, for logs and /api/health. */
  account: useBackup ? ("backup" as const) : ("primary" as const),
};

// Loud on boot: running on the failover is a state someone must not forget
// they are in, because the primary stops being exercised while it is on.
if (TAVUS_USE_BACKUP && !useBackup) {
  console.error(
    "[video] TAVUS_USE_BACKUP is set but TAVUS_BACKUP_API_KEY is missing; staying on the PRIMARY account."
  );
} else if (useBackup) {
  console.warn("[video] Tavus is running on the BACKUP account.");
}

export function tavusConfigured(): boolean {
  return Boolean(TAVUS.apiKey && TAVUS.replicaId && TAVUS.personaId);
}

/**
 * Whether the server will start a video session at all. Every video route
 * checks this first, before auth, credits, or any outbound call.
 */
export function videoAvailable(): boolean {
  return VIDEO_ENABLED_SERVER && tavusConfigured();
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Minutes of real use before a reserved credit is actually spent.
 *
 * Below this the candidate gets their credit back: a session that dropped in
 * the first minute is our failure, not their interview.
 */
export const VIDEO_CREDIT_THRESHOLD_MINUTES = envInt(
  "VIDEO_CREDIT_THRESHOLD_MINUTES",
  5
);

/**
 * Hard ceiling on one session. Tavus bills by the minute, so this is the
 * difference between a bounded cost and an open tab left running overnight.
 */
export const VIDEO_SESSION_MAX_MINUTES = envInt("VIDEO_SESSION_MAX_MINUTES", 45);

/**
 * When to start wrapping up. The interviewer needs runway to close properly,
 * so it is told to land the plane before the hard cap, never cut off mid-word.
 */
export const VIDEO_WRAP_UP_MINUTES = Math.max(
  1,
  VIDEO_SESSION_MAX_MINUTES - envInt("VIDEO_WRAP_UP_LEAD_MINUTES", 5)
);

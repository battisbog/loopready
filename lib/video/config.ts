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

/** Tavus credentials. Absent means the feature cannot run, whatever the flags. */
export const TAVUS = {
  apiKey: process.env.TAVUS_API_KEY ?? "",
  replicaId: process.env.TAVUS_REPLICA_ID ?? "",
  personaId: process.env.TAVUS_PERSONA_ID ?? "",
  apiBase: process.env.TAVUS_API_BASE ?? "https://tavusapi.com",
};

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

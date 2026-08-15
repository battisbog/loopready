/**
 * Realtime voice configuration.
 *
 * TRADEOFF: the Realtime API is speech-to-speech, so the voice comes from
 * OpenAI. ElevenLabs cannot be used here — its audio would have to be
 * generated after a text response, which reintroduces the latency and the
 * turn-taking rigidity this mode exists to remove. The ElevenLabs push-to-talk
 * path stays available behind NEXT_PUBLIC_REALTIME_VOICE=false.
 *
 * Voices accepted by the API (verified against /v1/realtime/client_secrets):
 *   alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
 * `cedar` and `marin` are the newest and most natural. `cedar` reads as a
 * calm, grounded male voice, which suits a senior-engineer interviewer.
 */
export const REALTIME_MODEL =
  process.env.REALTIME_MODEL || "gpt-realtime-2.1";

export const REALTIME_VOICE = process.env.REALTIME_VOICE || "cedar";

/** Client-side flag. Falls back to push-to-talk when unset. */
export const REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_REALTIME_VOICE === "true";

/**
 * Semantic VAD lets the model judge whether the candidate has actually
 * finished a thought rather than firing on a fixed silence threshold, which
 * matters when someone pauses mid-story. `interrupt_response` is what gives
 * us barge-in for free.
 */
export const TURN_DETECTION = {
  type: "semantic_vad" as const,
  eagerness: "auto" as const,
  create_response: true,
  interrupt_response: true,
};

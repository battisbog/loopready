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
 * How quickly the model decides the candidate has finished.
 *
 * "high" shortens the pause before the interviewer replies, but a real user
 * hit the cost of that: it is also over-eager to decide the candidate has
 * started talking, so a breath, a cough or a quiet "um" was enough to cut the
 * interviewer off mid-sentence. Defaulting to "auto" trades a slightly longer
 * response gap for not talking over people who have not actually interrupted
 * -- the correct trade, since a twitchy interviewer breaks the illusion far
 * worse than a extra half-second of latency does.
 *
 * Configurable so the feel can be A/B'd without a deploy:
 *   low    most patient, longest gap
 *   auto   the API default, and now OUR default
 *   high   snappiest, but measurably too trigger-happy on tiny sounds
 */
export type Eagerness = "low" | "auto" | "high";

const EAGERNESS = (process.env.REALTIME_EAGERNESS ?? "auto") as Eagerness;

export const REALTIME_EAGERNESS: Eagerness = ["low", "auto", "high"].includes(
  EAGERNESS
)
  ? EAGERNESS
  : "auto";

/**
 * Semantic VAD lets the model judge whether the candidate has actually
 * finished a thought rather than firing on a fixed silence threshold, which
 * matters when someone pauses mid-story. `interrupt_response` is what gives
 * us barge-in for free: it is kept true so a candidate who genuinely starts
 * answering still cuts the interviewer off immediately, which is correct.
 *
 * Deliberately NOT server_vad: that fires on a silence duration alone, so
 * closing the gap would mean talking over anyone who pauses to think. It is
 * also the reason a minimum-interruption-duration setting is not available
 * here -- prefix_padding_ms / silence_duration_ms / threshold are all
 * server_vad-only fields; the live API rejects every one of them under
 * semantic_vad with "Unknown parameter" (verified directly against
 * /v1/realtime/client_secrets, not assumed from docs).
 */
export const TURN_DETECTION = {
  type: "semantic_vad" as const,
  eagerness: REALTIME_EAGERNESS,
  create_response: true,
  interrupt_response: true,
};

/**
 * Input noise reduction. THE biggest lever against false interruptions: it
 * filters breaths, room tone and background noise out of what the model even
 * sees as candidate audio, before turn detection ever runs on it -- so a
 * cough or a quiet "um" stops registering as speech at all, rather than
 * registering as speech that eagerness then has to be tuned around.
 *
 * Field and accepted values confirmed directly against the live API
 * (session.audio.input.noise_reduction.type, "near_field" | "far_field");
 * this is not in the client-visible request shape used anywhere else in this
 * file, so it was not something training data could be trusted on.
 *
 * "near_field" is for a mic close to the mouth -- a laptop or headset mic,
 * which is what every candidate is using. "far_field" is for a mic across a
 * room (a conference speakerphone) and would UNDER-filter here.
 */
export type NoiseReductionMode = "near_field" | "far_field";

const NOISE_REDUCTION = (process.env.REALTIME_NOISE_REDUCTION ??
  "near_field") as NoiseReductionMode;

export const REALTIME_NOISE_REDUCTION: NoiseReductionMode = [
  "near_field",
  "far_field",
].includes(NOISE_REDUCTION)
  ? NOISE_REDUCTION
  : "near_field";

export const NOISE_REDUCTION_CONFIG = {
  type: REALTIME_NOISE_REDUCTION,
};

/**
 * Verbose event logging for the realtime lifecycle. Off by default: the log is
 * one line per event and would be noise in a normal session.
 */
export const REALTIME_DEBUG =
  process.env.NEXT_PUBLIC_REALTIME_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

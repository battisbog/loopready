"use client";

import VoiceRing, { type RingState } from "./voice-ring";
import InterviewerStage from "./interviewer-stage";
import type { Status } from "./use-voice-turn";

/**
 * The interviewer's on-screen presence.
 *
 * This exists so the presence layer can be swapped without touching any round
 * component. Voice mode shows the reactive ring. A future video mode will show
 * a live avatar here and becomes the centrepiece of the product; the ring is
 * deliberately confined to voice mode and is not part of that path.
 *
 * "orb" is kept as the mode name because it is what every caller passes and it
 * describes the slot, not the shape that fills it.
 */
export type PresenceMode = "orb" | "portrait" | "video";

export default function InterviewerPresence({
  mode = "orb",
  status,
  line,
  variant = "hero",
}: {
  mode?: PresenceMode;
  /** Accepts both push-to-talk and live statuses. */
  status: Status | RingState;
  /** Only used by the portrait mode; the ring is deliberately caption-free. */
  line?: string;
  variant?: "hero" | "compact";
}) {
  const hero = variant === "hero";

  if (mode === "portrait") {
    return (
      <InterviewerStage
        status={status as Status}
        line={line}
        variant={variant}
      />
    );
  }

  // Reserved for the video avatar. Until that ships, fall back to the orb so
  // the surface is never blank.
  if (mode === "video") {
    return (
      <InterviewerPresence
        mode="orb"
        status={status}
        line={line}
        variant={variant}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center ${hero ? "gap-6" : "gap-3"}`}>
      <div className="relative flex items-center justify-center">
        <VoiceRing state={status as RingState} size={hero ? 300 : 132} />
        <span
          className={`absolute flex items-center gap-1.5 rounded-full border border-line bg-base/90 px-2.5 py-1 text-[11px] font-medium text-secondary backdrop-blur ${
            hero ? "bottom-2" : "-bottom-1 scale-90"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-hover opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </div>

    </div>
  );
}

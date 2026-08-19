"use client";

import VoiceRing, { type RingState } from "./voice-ring";
import VideoAvatar from "./video-avatar";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
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
  video = null,
}: {
  mode?: PresenceMode;
  /** Accepts both push-to-talk and live statuses. */
  status: Status | RingState;
  /** Video mode only: the Tavus room and the already-granted mic. */
  video?: { conversationUrl: string; micStream: MediaStream } | null;
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

  // The avatar occupies exactly the slot the ring does, so every round gets it
  // without knowing anything about video. Falls back to the ring whenever the
  // flag is off or the room is missing, so a half-configured deploy degrades to
  // the working experience rather than a blank frame.
  if (mode === "video") {
    if (!VIDEO_ENABLED_CLIENT || !video) {
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
        <VideoAvatar
          conversationUrl={video.conversationUrl}
          micStream={video.micStream}
          size={hero ? 320 : 140}
        />
      </div>
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

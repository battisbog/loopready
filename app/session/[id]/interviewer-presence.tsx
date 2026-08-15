"use client";

import VoiceOrb, { type OrbState } from "./voice-orb";
import InterviewerStage from "./interviewer-stage";
import type { Status } from "./use-voice-turn";

/**
 * The interviewer's on-screen presence.
 *
 * This exists so the presence layer can be swapped without touching any round
 * component. Voice mode shows the reactive orb. A future video mode will show
 * a live avatar here and becomes the centrepiece of the product; the orb is
 * deliberately confined to voice mode and is not part of that path.
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
  status: Status | OrbState;
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
        <VoiceOrb state={status as OrbState} size={hero ? 300 : 132} />
        <span
          className={`absolute flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur ${
            hero ? "bottom-2" : "-bottom-1 scale-90"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {line && (
        <p
          className={`text-balance text-center leading-relaxed ${
            hero
              ? "max-w-2xl text-lg text-zinc-100 sm:text-xl"
              : "max-w-full text-sm text-zinc-300"
          }`}
        >
          {line}
        </p>
      )}
    </div>
  );
}

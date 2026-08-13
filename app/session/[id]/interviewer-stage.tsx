"use client";

import Image from "next/image";
import { useState } from "react";
import type { Status } from "./use-voice-turn";

/**
 * The interviewer's on-screen presence. `hero` fills the behavioral round;
 * `compact` sits beside the editor or canvas in the working rounds.
 */
export default function InterviewerStage({
  status,
  line,
  variant = "hero",
}: {
  status: Status;
  line?: string;
  variant?: "hero" | "compact";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const speaking = status === "speaking";
  const hero = variant === "hero";

  const frame = hero
    ? "h-40 w-40 sm:h-56 sm:w-56"
    : "h-20 w-20";

  return (
    <div
      className={`flex flex-col items-center ${hero ? "gap-6" : "gap-3"}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings — only while the interviewer is actually talking */}
        {speaking && (
          <>
            <span
              className={`ring-pulse pointer-events-none absolute inset-0 rounded-full border border-emerald-400/60 ${frame}`}
            />
            <span
              className={`ring-pulse pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40 ${frame}`}
              style={{ animationDelay: "0.8s" }}
            />
          </>
        )}

        {/* Steady halo so the frame never looks flat when idle */}
        <span
          aria-hidden
          className={`pointer-events-none absolute rounded-full transition-all duration-700 ${frame} ${
            speaking
              ? "shadow-[0_0_60px_-8px_rgba(52,211,153,0.55)]"
              : "shadow-[0_0_40px_-14px_rgba(52,211,153,0.25)]"
          }`}
        />

        <div
          className={`relative overflow-hidden rounded-full border-2 bg-zinc-900 transition-colors duration-500 ${frame} ${
            speaking ? "border-emerald-400/70" : "border-zinc-700/70"
          }`}
        >
          {imageFailed ? (
            <FallbackPortrait />
          ) : (
            <Image
              src="/interviewer.png"
              alt="Your interviewer"
              width={512}
              height={512}
              priority={hero}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Live badge */}
        <span
          className={`absolute flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur ${
            hero ? "-bottom-3" : "-bottom-2 scale-90"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* Talking waveform, so it reads as "they are speaking" at a glance */}
      <div
        className={`flex items-end gap-1 transition-opacity duration-300 ${
          speaking ? "opacity-100" : "opacity-0"
        } ${hero ? "h-5" : "h-3"}`}
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`wave-bar w-1 rounded-full bg-emerald-400 ${
              hero ? "h-5" : "h-3"
            }`}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      {line && (
        <p
          className={`text-balance text-center leading-relaxed text-zinc-100 ${
            hero
              ? "max-w-2xl text-lg sm:text-xl"
              : "max-w-full text-sm text-zinc-300"
          }`}
        >
          {line}
        </p>
      )}
    </div>
  );
}

/** Used only if the placeholder image is missing. */
function FallbackPortrait() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="fp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f4b51" />
          <stop offset="100%" stopColor="#1a2124" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="#111315" />
      <circle cx="50" cy="38" r="18" fill="url(#fp)" />
      <path d="M18 100c0-18 14-30 32-30s32 12 32 30z" fill="url(#fp)" />
    </svg>
  );
}

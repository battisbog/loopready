"use client";

import type { LiveStatus } from "./use-realtime-turn";

/** Accepts push-to-talk statuses too, so the shared shell can pass either. */
export type LiveStatusLike = LiveStatus | "idle" | "recording" | "transcribing";

/**
 * Replaces the mic button in hands-free mode. There is nothing to press, so
 * this exists to make it obvious the mic is open and who currently has the
 * floor.
 */
export default function LiveIndicator({
  status,
  statusLabel,
  error,
  partial,
  size = "large",
}: {
  status: LiveStatusLike;
  statusLabel: string;
  error?: string | null;
  partial?: { role: string; text: string } | null;
  size?: "large" | "small";
}) {
  const large = size === "large";
  const listening = status === "listening" || status === "recording";
  const connecting = status === "connecting";
  const failed = status === "failed";

  return (
    <div className="flex flex-col items-center gap-3">
      {partial?.role === "candidate" && partial.text && (
        <p
          className={`text-center italic leading-relaxed text-muted ${
            large ? "max-w-xl text-sm" : "max-w-full text-xs"
          }`}
        >
          {partial.text}
        </p>
      )}

      {error && (
        <p className={`text-center text-error ${large ? "text-sm" : "text-xs"}`}>
          {error}
        </p>
      )}

      <div
        className={`flex items-center gap-3 rounded-full border px-4 transition-colors ${
          large ? "py-2.5" : "py-2"
        } ${
          failed
            ? "border-error/40 bg-error/10"
            : listening
              ? "border-accent-border bg-accent-muted"
              : "border-line bg-surface"
        }`}
      >
        {/* Live mic meter: bars move only while the candidate has the floor */}
        <span className="flex h-4 items-end gap-0.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-0.5 rounded-full ${
                listening ? "wave-bar bg-accent-hover" : "bg-elevated"
              } ${listening ? "h-4" : "h-1.5"}`}
              style={{ animationDelay: `${i * 0.13}s` }}
            />
          ))}
        </span>

        <span
          className={`font-medium ${large ? "text-sm" : "text-xs"} ${
            failed
              ? "text-error"
              : listening
                ? "text-accent"
                : "text-secondary"
          }`}
        >
          {connecting ? "Connecting…" : statusLabel}
        </span>
      </div>

      {!large && (
        <p className="text-center text-[11px] text-muted">
          Hands free. Just talk.
        </p>
      )}
    </div>
  );
}

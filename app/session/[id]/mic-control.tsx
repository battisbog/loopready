"use client";

import type { Status } from "./use-voice-turn";

/** Plain interview language rather than technical pipeline states. */
const LABEL: Record<Status, string> = {
  idle: "Tap to answer",
  recording: "Listening…",
  transcribing: "Thinking…",
  thinking: "Thinking…",
  speaking: "Interviewer is speaking…",
  done: "Interview complete",
};

export default function MicControl({
  status,
  recording,
  busy,
  onToggle,
  answer,
  error,
  hint,
  size = "large",
}: {
  status: Status;
  recording: boolean;
  busy: boolean;
  onToggle: () => void;
  /** The candidate's most recent transcribed answer, shown as a caption. */
  answer?: string;
  error?: string | null;
  hint?: string | null;
  size?: "large" | "small";
}) {
  const large = size === "large";
  const disabled = busy || status === "done";

  return (
    <div className="flex flex-col items-center gap-3">
      {answer && !error && (
        <p
          className={`text-center italic leading-relaxed text-muted ${
            large ? "max-w-xl text-sm" : "max-w-full text-xs"
          }`}
        >
          &ldquo;{answer}&rdquo;
        </p>
      )}

      {error && (
        <p className={`text-center text-error ${large ? "text-sm" : "text-xs"}`}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className={`text-center text-warn ${large ? "text-xs" : "text-[11px]"}`}>
          {hint}
        </p>
      )}

      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label={recording ? "Stop and send answer" : "Start answering"}
        className={`group relative flex items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
          large ? "h-20 w-20" : "h-14 w-14"
        } ${
          recording
            ? "bg-error shadow-[0_0_44px_-6px_rgba(239,68,68,0.7)] hover:bg-error"
            : "bg-accent shadow-[0_0_44px_-10px_rgba(52,211,153,0.7)] hover:bg-accent-hover enabled:hover:scale-105"
        }`}
      >
        {recording && (
          <span className="ring-pulse absolute inset-0 rounded-full border-2 border-error/40" />
        )}
        {recording ? (
          <span className={`rounded-md bg-base ${large ? "h-6 w-6" : "h-4 w-4"}`} />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={`text-accent-fg ${large ? "h-8 w-8" : "h-6 w-6"}`}
          >
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <path d="M12 18v4" />
          </svg>
        )}
      </button>

      <p
        className={`font-medium tracking-wide ${
          large ? "text-sm" : "text-xs"
        } ${recording ? "text-error" : "text-secondary"}`}
      >
        {LABEL[status]}
      </p>
    </div>
  );
}

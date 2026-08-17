"use client";

import type { ReactNode } from "react";
import InterviewerPresence from "./interviewer-presence";
import LiveIndicator, { type LiveStatusLike } from "./live-indicator";
import MicControl from "./mic-control";
import TranscriptPanel from "./transcript-panel";
import AudioSourceBadge, { type ServerAudio } from "./audio-source-badge";
import { Badge } from "@/components/ui";
import type { Turn } from "./use-voice-turn";

/**
 * The chrome every round shares: header, progress, interviewer presence, voice
 * control and transcript. Rounds differ only by the optional `surface` slot
 * (code editor, design canvas).
 *
 * Purely presentational so the live and push-to-talk wrappers can each own
 * their hook without duplicating any layout.
 */
export interface ShellProps {
  header?: string;
  elapsed: number;
  turns: Turn[];
  /** Orb state; accepts both live and push-to-talk statuses. */
  orbStatus: string;
  statusLabel: string;
  error?: string | null;
  hint?: string | null;
  onEnd: () => void;

  /** Progress rail. Omitted for single-problem rounds. */
  questionIndex?: number;
  questionCount?: number;

  /** Live mode */
  live?: boolean;
  /** Push-to-talk mode controls */
  recording?: boolean;
  busy?: boolean;
  onToggleRecording?: () => void;
  serverAudio?: ServerAudio;

  /** Editor or canvas. When present the layout becomes two-column. */
  surface?: ReactNode;
}

export default function InterviewShell({
  header,
  elapsed,
  turns,
  orbStatus,
  statusLabel,
  error,
  hint,
  onEnd,
  questionIndex = 0,
  questionCount = 0,
  live = false,
  recording = false,
  busy = false,
  onToggleRecording,
  serverAudio,
  surface,
}: ShellProps) {
  const progress = questionCount ? Math.min(questionIndex + 1, questionCount) : 0;
  const compact = Boolean(surface);

  const voiceControl = live ? (
    <LiveIndicator
      status={orbStatus as LiveStatusLike}
      statusLabel={statusLabel}
      error={error}
      size={compact ? "small" : "large"}
    />
  ) : (
    <MicControl
      status={orbStatus as never}
      recording={recording}
      busy={busy}
      onToggle={onToggleRecording ?? (() => {})}
      error={error}
      hint={hint}
      size={compact ? "small" : "large"}
    />
  );

  return (
    <main className="flex h-screen flex-col bg-base">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {header && <span className="font-medium text-accent">{header}</span>}
          {questionCount > 1 && (
            <span className="text-secondary">
              Question {progress} of {questionCount}
            </span>
          )}
          <span className="font-mono text-xs text-muted">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
          {live ? (
            <Badge tone="accent" dot>
              Live voice
            </Badge>
          ) : (
            serverAudio && <AudioSourceBadge serverAudio={serverAudio} />
          )}
        </div>
        <button
          onClick={onEnd}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-secondary"
        >
          End interview
        </button>
      </header>

      {questionCount > 1 && (
        <div className="flex shrink-0 gap-1 px-4 pt-3 sm:px-6">
          {Array.from({ length: questionCount }).map((_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                i < progress ? "bg-accent" : "bg-elevated"
              }`}
            />
          ))}
        </div>
      )}

      {compact ? (
        // Working rounds: interviewer rail beside the surface.
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-line lg:border-b-0 lg:border-r">
            <div className="flex flex-col items-center gap-4 border-b border-line px-4 py-6">
              <InterviewerPresence
                mode="orb"
                status={orbStatus as never}
                variant="compact"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <TranscriptPanel turns={turns} className="text-center" />
            </div>
            <div className="border-t border-line p-4">{voiceControl}</div>
          </aside>
          <section className="min-h-0">{surface}</section>
        </div>
      ) : (
        // Conversation-only rounds: the interviewer is the screen.
        <>
          <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
            <InterviewerPresence
              mode="orb"
              status={orbStatus as never}
              variant="hero"
            />
          </section>
          <section className="shrink-0 space-y-4 border-t border-line px-6 py-6">
            {voiceControl}
            <TranscriptPanel turns={turns} className="text-center" />
          </section>
        </>
      )}
    </main>
  );
}

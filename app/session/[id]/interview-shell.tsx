"use client";

import { useState, type ReactNode } from "react";
import InterviewerPresence from "./interviewer-presence";
import SplitPane from "./split-pane";
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
  /**
   * Video mode. When present the avatar replaces the ring in the presence
   * slot; everything else about the shell is unchanged.
   */
  video?: {
    conversationUrl: string;
    micStream: MediaStream;
    onJoined?: (call: import("@daily-co/daily-js").DailyCall) => void;
    onAppMessage?: (data: unknown) => void;
    onError?: (message: string) => void;
  } | null;
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
  video = null,
}: ShellProps) {
  // Ending is irreversible and generates feedback, so it takes two clicks.
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
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
        {confirmEnd ? (
          // Inline rather than a modal: the interviewer is still talking, and
          // throwing a dialog over a live round is worse than a two-step click.
          <span className="flex items-center gap-2">
            <span className="text-sm text-secondary">End for good?</span>
            <button
              onClick={() => {
                setConfirmEnd(false);
                setEnding(true);
                onEnd();
              }}
              disabled={ending}
              className="rounded-md bg-error px-3 py-1.5 text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {ending ? "Ending…" : "Yes, end it"}
            </button>
            <button
              onClick={() => setConfirmEnd(false)}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-secondary"
            >
              Keep going
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-secondary"
          >
            End interview
          </button>
        )}
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
        <SplitPane
          left={
            <aside className="flex h-full min-h-0 flex-col border-b border-line lg:border-b-0">
            <div className="flex flex-col items-center gap-4 border-b border-line px-4 py-6">
              <InterviewerPresence
                mode={video ? "video" : "orb"}
                video={video}
                status={orbStatus as never}
                variant="compact"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <TranscriptPanel turns={turns} className="text-center" />
            </div>
              <div className="border-t border-line p-4">{voiceControl}</div>
            </aside>
          }
          right={<section className="h-full min-h-0">{surface}</section>}
        />
      ) : (
        // Conversation-only rounds: the interviewer is the screen.
        <>
          <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
            <InterviewerPresence
              mode={video ? "video" : "orb"}
              video={video}
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

"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import InterviewShell from "./interview-shell";
import { useRealtimeTurn } from "./use-realtime-turn";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import { REALTIME_ENABLED } from "@/lib/realtime/config";

export interface RoundShellProps {
  sessionId: string;
  initialTurns: Turn[];
  header?: string;
  questionIndex?: number;
  questionCount?: number;
  /** Latest work product to send with each turn (code, diagram). */
  getArtifactPatch?: () => object | undefined;
  /**
   * Work surface. Receives `pushArtifact`, which refreshes what the
   * interviewer can see without recording a turn (used after "Run").
   */
  renderSurface?: (api: { pushArtifact: () => void }) => ReactNode;
}

/**
 * Entry point for every round.
 *
 * React forbids calling hooks conditionally, so the live and push-to-talk
 * paths are separate COMPONENTS and the branch happens here. That is what lets
 * all three rounds share one voice experience without duplicating it.
 */
export default function RoundShell(props: RoundShellProps) {
  return REALTIME_ENABLED ? <LiveRound {...props} /> : <PushToTalkRound {...props} />;
}

function useDoneRouting(sessionId: string) {
  const router = useRouter();
  return (next: string | null, loopId?: string | null) =>
    router.push(
      next
        ? `/session/${next}`
        : loopId
          ? `/loop/${loopId}`
          : `/session/${sessionId}/feedback`
    );
}

function LiveRound({
  sessionId,
  initialTurns,
  header,
  questionIndex = 0,
  questionCount = 0,
  getArtifactPatch,
  renderSurface,
}: RoundShellProps) {
  const onDone = useDoneRouting(sessionId);
  const [qIndex, setQIndex] = useState(questionIndex);

  const {
    turns,
    status,
    statusLabel,
    error,
    elapsed,
    endEarly,
    pushArtifact,
    speaking,
  } = useRealtimeTurn({
    sessionId,
    initialTurns,
    getArtifactPatch,
    onProgress: ({ questionIndex: i }) => setQIndex(i),
    onDone,
  });

  return (
    <InterviewShell
      live
      header={header}
      elapsed={elapsed}
      turns={turns}
      orbStatus={status === "connecting" ? "connecting" : speaking ? "speaking" : "listening"}
      statusLabel={statusLabel}
      error={error}
      onEnd={endEarly}
      questionIndex={qIndex}
      questionCount={questionCount}
      surface={renderSurface?.({ pushArtifact: () => void pushArtifact() })}
    />
  );
}

function PushToTalkRound({
  sessionId,
  initialTurns,
  header,
  questionIndex = 0,
  questionCount = 0,
  getArtifactPatch,
  renderSurface,
}: RoundShellProps) {
  const onDone = useDoneRouting(sessionId);
  const [qIndex, setQIndex] = useState(questionIndex);

  const {
    turns,
    status,
    statusLabel,
    error,
    hint,
    elapsed,
    toggleRecording,
    endEarly,
    recording,
    busy,
    serverAudio,
  } = useVoiceTurn({
    sessionId,
    initialTurns,
    getArtifactPatch,
    onProgress: ({ questionIndex: i }) => setQIndex(i),
    onDone,
  });

  return (
    <InterviewShell
      header={header}
      elapsed={elapsed}
      turns={turns}
      orbStatus={status}
      statusLabel={statusLabel}
      error={error}
      hint={hint}
      onEnd={endEarly}
      questionIndex={qIndex}
      questionCount={questionCount}
      recording={recording}
      busy={busy}
      onToggleRecording={toggleRecording}
      serverAudio={serverAudio}
      // Push-to-talk rebuilds the prompt server-side on each turn, so there is
      // nothing to refresh — but the work still needs persisting.
      surface={renderSurface?.({
        pushArtifact: () => {
          const patch = getArtifactPatch?.();
          if (!patch) return;
          void fetch("/api/artifact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, patch }),
          }).catch(() => {});
        },
      })}
    />
  );
}

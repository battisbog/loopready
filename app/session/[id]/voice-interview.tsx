"use client";

import RoundShell from "./round-shell";
import type { Turn } from "./use-voice-turn";

/** Behavioral round: conversation only, no work surface. */
export default function VoiceInterview({
  sessionId,
  initialTurns,
  questionIndex,
  questionCount,
  header,
}: {
  sessionId: string;
  initialTurns: Turn[];
  questionIndex: number;
  questionCount: number;
  header?: string;
}) {
  return (
    <RoundShell
      sessionId={sessionId}
      initialTurns={initialTurns}
      header={header}
      questionIndex={questionIndex}
      questionCount={questionCount}
    />
  );
}

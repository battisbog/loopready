"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import InterviewShell from "./interview-shell";
import { useRealtimeTurn } from "./use-realtime-turn";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import { REALTIME_ENABLED } from "@/lib/realtime/config";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
import { useVideoTurn } from "./use-video-turn";
import MicGate from "./mic-gate";

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
 *
 * The microphone gate sits in front of BOTH paths, which is the whole reason it
 * lives at this level: behavioral, coding and system design all mount through
 * here, so permission is asked exactly once, before anything starts, and never
 * again mid-interview.
 */
export default function RoundShell(props: RoundShellProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Read from the URL rather than state, so a reload lands in the same mode.
  //
  // This MUST be an effect, not a useState initializer: the initializer also
  // runs during SSR, where window is undefined, and hydration then keeps that
  // false forever. That is exactly how ?mode=video silently did nothing and
  // every session fell through to the voice path.
  //
  // Running after mount is safe because nothing branches on it until the
  // candidate has finished the mic check, which is many frames later.
  // useSyncExternalStore reads the URL on the client and returns false during
  // SSR, without the cascading-render warning a setState-in-effect produces.
  const wantsVideo = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("mode") === "video",
    () => false
  );

  // The round owns the stream once the gate hands it over, so releasing it is
  // this component's job. Without this the mic indicator stays lit after the
  // candidate navigates away. Keyed on the stream itself, so the cleanup always
  // closes over the one it was given.
  useEffect(() => {
    if (!stream) return;
    return () => stream.getTracks().forEach((t) => t.stop());
  }, [stream]);

  if (!stream) {
    return (
      <MicGate
        onReady={setStream}
        roundLabel={
          wantsVideo && VIDEO_ENABLED_CLIENT
            ? `${props.header ?? "Interview"} · video mode`
            : props.header
        }
      />
    );
  }

  // Video is opt-in per session via ?mode=video, and only when the flag is on.
  // Anything else falls through to the existing voice paths untouched.
  if (wantsVideo && VIDEO_ENABLED_CLIENT) {
    return <VideoRound {...props} stream={stream} />;
  }

  return REALTIME_ENABLED ? (
    <LiveRound {...props} stream={stream} />
  ) : (
    <PushToTalkRound {...props} stream={stream} />
  );
}

type RoundProps = RoundShellProps & { stream: MediaStream };

/** Ending the interview returns to the dashboard, not into another round. */
function useLeaveToDashboard() {
  const router = useRouter();
  return () => router.push("/dashboard");
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
  stream,
}: RoundProps) {
  const onDone = useDoneRouting(sessionId);
  const onLeave = useLeaveToDashboard();
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
    stream,
    getArtifactPatch,
    onProgress: ({ questionIndex: i }) => setQIndex(i),
    onDone,
    onLeave,
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
  stream,
}: RoundProps) {
  const onDone = useDoneRouting(sessionId);
  const onLeave = useLeaveToDashboard();
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
    stream,
    getArtifactPatch,
    onProgress: ({ questionIndex: i }) => setQIndex(i),
    onDone,
    onLeave,
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

/**
 * Video-avatar round. Same shell, same transcript, same controls; the presence
 * slot holds the avatar instead of the ring, and Tavus rather than OpenAI
 * carries the conversation.
 */
function VideoRound({
  sessionId,
  initialTurns,
  header,
  questionIndex = 0,
  questionCount = 0,
  renderSurface,
  stream,
}: RoundProps) {
  const onDone = useDoneRouting(sessionId);
  const onLeave = useLeaveToDashboard();
  const {
    turns,
    status,
    error,
    elapsed,
    room,
    endEarly,
    onAppMessage,
    onJoined,
    onVideoError,
    onNaturalEnd,
  } = useVideoTurn({ sessionId, initialTurns, onDone, onLeave });

  return (
    <InterviewShell
      live
      header={header}
      elapsed={elapsed}
      turns={turns}
      orbStatus={status === "speaking" ? "speaking" : status === "failed" ? "failed" : "listening"}
      statusLabel={
        status === "starting"
          ? "Starting your video interview…"
          : status === "connecting"
            ? "Connecting to your interviewer…"
            : status === "speaking"
              ? "Interviewer is speaking. You can cut in any time"
              : status === "done"
                ? "Interview complete"
                : status === "failed"
                  ? "Video failed"
                  : "Listening. Just talk, and pause when you're finished"
      }
      error={error}
      onEnd={endEarly}
      questionIndex={questionIndex}
      questionCount={questionCount}
      video={
        room
          ? {
              conversationUrl: room.conversationUrl,
              micStream: stream,
              maxSeconds: room.maxMinutes * 60,
              onJoined,
              onAppMessage,
              onError: onVideoError,
              onNaturalEnd,
            }
          : null
      }
      surface={renderSurface?.({ pushArtifact: () => {} })}
    />
  );
}

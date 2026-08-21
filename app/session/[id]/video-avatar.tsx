"use client";

import { useEffect, useRef, useState } from "react";
import DailyIframe, {
  type DailyCall,
  type DailyEventObjectParticipant,
} from "@daily-co/daily-js";
import { audioLevels } from "@/lib/audio-levels";

/**
 * The interviewer's video presence.
 *
 * Tavus hands back a Daily room URL, so joining is a Daily call, not a plain
 * video element. We build a headless call object rather than an iframe so the
 * avatar renders inside our own layout with our own chrome, in the same slot
 * the ring occupies.
 *
 * The candidate's microphone is already granted by the mic gate, so this
 * component never prompts. It hands Daily the existing track instead.
 */
export default function VideoAvatar({
  conversationUrl,
  micStream,
  className = "",
  onJoined,
  onLeft,
  onError,
  onAppMessage,
}: {
  conversationUrl: string;
  /** Granted upstream by MicGate; Daily must not acquire its own. */
  micStream: MediaStream;
  /** Sized by the parent, so the layout decides how much room the avatar gets. */
  className?: string;
  onJoined?: (call: DailyCall) => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
  onAppMessage?: (data: unknown) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  /** Track ids currently attached, so we never reattach the same pair. */
  const attachedRef = useRef<string>("");
  const [state, setState] = useState<"joining" | "live" | "failed">("joining");

  useEffect(() => {
    let alive = true;
    let call: DailyCall | null = null;
    attachedRef.current = "";
    const audioTrack = micStream.getAudioTracks()[0];

    // Serialised and awaited, because destroy() is ASYNC. The previous version
    // called destroy() and constructed immediately, so in React strict mode the
    // remount still collided with a teardown that had not finished and Daily
    // threw "Duplicate DailyIframe instances are not allowed" straight through
    // to the error boundary.
    (async () => {
      try {
        const previous = DailyIframe.getCallInstance();
        if (previous) {
          try {
            await previous.destroy();
          } catch {
            /* already gone */
          }
        }
        if (!alive) return;

        call = DailyIframe.createCallObject({
          // The mic gate owns permission; Daily reuses that track.
          audioSource: audioTrack ?? true,
          videoSource: false, // the candidate is not on camera in v1
          subscribeToTracksAutomatically: true,
        });
        callRef.current = call;

        /**
         * Attaches the avatar's tracks once the replica publishes them.
         *
         * Daily fires participant-updated constantly (speaking changes, track
         * state, network events). Rebuilding the MediaStream and reassigning
         * srcObject on each one restarts playback, and audio and video then
         * resume from slightly different points, which is what makes the mouth
         * drift out of step with the words. So the tracks are compared by id and
         * only reattached when they genuinely change.
         */
        const attach = (
          p: DailyEventObjectParticipant["participant"] | undefined
        ) => {
          if (!p || p.local || !videoRef.current) return;
          const video = p.tracks?.video?.persistentTrack;
          const audio = p.tracks?.audio?.persistentTrack;
          if (!video && !audio) return;

          const signature = `${video?.id ?? "-"}|${audio?.id ?? "-"}`;
          if (signature === attachedRef.current) return;
          attachedRef.current = signature;

          const stream = new MediaStream();
          if (video) stream.addTrack(video);
          if (audio) stream.addTrack(audio);
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {
            /* autoplay is unlocked by the mic gate's click */
          });

          // Same amplitude bus the ring uses, so shared UI keeps working. This
          // is a read-only tap and never carries the audio that is played.
          if (audio) audioLevels.attachStream("output", new MediaStream([audio]));
        };

        call
          .on("joined-meeting", () => {
            if (!alive) return;
            setState("live");
            onJoined?.(call!);
          })
          .on("participant-joined", (e) => attach(e?.participant))
          .on("participant-updated", (e) => attach(e?.participant))
          .on("app-message", (e) => onAppMessage?.(e?.data))
          .on("left-meeting", () => alive && onLeft?.())
          .on("error", (e) => {
            if (!alive) return;
            setState("failed");
            onError?.(e?.errorMsg ?? "Video connection failed");
          });

        await call.join({ url: conversationUrl });
      } catch (e) {
        // Report rather than throw. A failure here must show a message inside
        // the round, not replace the whole page with an error boundary.
        if (!alive) return;
        setState("failed");
        onError?.(e instanceof Error ? e.message : "Could not join the video room");
      }
    })();

    return () => {
      alive = false;
      audioLevels.detach("output");
      const c = call;
      callRef.current = null;
      if (!c) return;
      // Leave before destroy, or Daily can leave the room occupied and the
      // Tavus meter keeps running.
      void c
        .leave()
        .catch(() => {})
        .finally(() => {
          c.destroy().catch(() => {});
        });
    };
    // Joining twice would create a second billable participant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUrl]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-line bg-surface ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        className="h-full w-full object-cover"
      />
      {state !== "live" && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <p className="text-sm text-muted">
            {state === "joining" ? "Connecting to your interviewer…" : "Video failed"}
          </p>
        </div>
      )}
      {state === "live" && (
        <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-base/90 px-2.5 py-1 text-[11px] font-medium text-secondary backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-hover opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      )}
    </div>
  );
}

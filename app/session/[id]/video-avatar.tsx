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
  size = 300,
  onJoined,
  onLeft,
  onError,
  onAppMessage,
}: {
  conversationUrl: string;
  /** Granted upstream by MicGate; Daily must not acquire its own. */
  micStream: MediaStream;
  size?: number;
  onJoined?: (call: DailyCall) => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
  onAppMessage?: (data: unknown) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [state, setState] = useState<"joining" | "live" | "failed">("joining");

  useEffect(() => {
    let alive = true;
    const audioTrack = micStream.getAudioTracks()[0];

    // Daily THROWS on a second instance ("Duplicate DailyIframe instances are
    // not allowed"), and React strict mode mounts every effect twice in dev.
    // The first mount's async destroy has not finished when the second runs, so
    // reuse whatever instance already exists instead of constructing one.
    const existing = DailyIframe.getCallInstance();
    if (existing) {
      try {
        existing.destroy();
      } catch {
        /* already torn down */
      }
    }

    const call = DailyIframe.createCallObject({
      // The mic gate owns permission; Daily reuses that track.
      audioSource: audioTrack ?? true,
      videoSource: false, // the candidate is not on camera in v1
      subscribeToTracksAutomatically: true,
    });
    callRef.current = call;

    /** Attaches the avatar's tracks once the replica publishes them. */
    function attach(p: DailyEventObjectParticipant["participant"] | undefined) {
      if (!p || p.local || !videoRef.current) return;
      const video = p.tracks?.video?.persistentTrack;
      const audio = p.tracks?.audio?.persistentTrack;
      const stream = new MediaStream();
      if (video) stream.addTrack(video);
      if (audio) stream.addTrack(audio);
      if (!stream.getTracks().length) return;
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {
        /* autoplay is unlocked by the mic gate's click; ignore races */
      });
      // Drive the same amplitude bus the ring uses, so any shared UI that
      // reacts to "the interviewer is talking" keeps working unchanged.
      if (audio) audioLevels.attachStream("output", new MediaStream([audio]));
    }

    call
      .on("joined-meeting", () => {
        if (!alive) return;
        setState("live");
        onJoined?.(call);
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

    // Any failure here is contained: the shell keeps the transcript, timer and
    // End button, so the candidate is never dropped on an error page.
    call.join({ url: conversationUrl }).catch((e: Error) => {
      if (!alive) return;
      setState("failed");
      onError?.(e.message);
    });

    return () => {
      alive = false;
      audioLevels.detach("output");
      // Leave before destroy, or Daily can leave the room occupied, which
      // keeps the Tavus meter running.
      void call
        .leave()
        .catch(() => {})
        .finally(() => {
          try {
            call.destroy();
          } catch {
            /* a strict-mode remount may already have destroyed it */
          }
        });
      callRef.current = null;
    };
    // Joining twice would create a second billable participant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationUrl]);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-line bg-surface"
      style={{ width: size, height: size }}
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

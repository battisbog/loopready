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
  /** Expected call length, in seconds. Used to tell a genuine failure apart
   * from Tavus's own duration cap ending the room on schedule. */
  maxSeconds,
  onJoined,
  onLeft,
  onError,
  onNaturalEnd,
  onAppMessage,
}: {
  conversationUrl: string;
  /** Granted upstream by MicGate; Daily must not acquire its own. */
  micStream: MediaStream;
  /** Sized by the parent, so the layout decides how much room the avatar gets. */
  className?: string;
  maxSeconds?: number;
  onJoined?: (call: DailyCall) => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
  /** Fired instead of onError when the call ended on schedule, not by accident. */
  onNaturalEnd?: () => void;
  onAppMessage?: (data: unknown) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  /** Track ids currently attached, so we never reattach the same pair. */
  const attachedRef = useRef<string>("");
  const joinedAtRef = useRef<number | null>(null);
  /** Guards the "live" reveal so it only ever fires once per mount. */
  const revealedRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<"joining" | "live" | "ended" | "failed">(
    "joining"
  );

  /**
   * Tavus enforces the session's max_call_duration by ending the Daily room,
   * which this SDK reports as an `error` event with a message like "Meeting
   * has ended". Without this, a 30-second demo hitting its cap on schedule
   * looked identical to a genuine connection failure: same "Video failed"
   * screen. Classify by BOTH signals -- close to the expected duration, or the
   * message reading like an intentional close -- so scheduled endings and real
   * failures never share one code path.
   */
  const isExpectedEnd = (message: string) => {
    const elapsed = joinedAtRef.current
      ? (Date.now() - joinedAtRef.current) / 1000
      : 0;
    const nearCap = maxSeconds != null && elapsed >= maxSeconds - 5;
    const soundsExpected = /meeting.*(end|ended)|ejected|duration/i.test(
      message
    );
    return nearCap || soundsExpected;
  };

  useEffect(() => {
    let alive = true;
    let call: DailyCall | null = null;
    attachedRef.current = "";
    revealedRef.current = false;
    revealTimerRef.current = null;
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
         * Reveals the live feed, replacing the "Connecting…" cover.
         *
         * Previously this happened on Daily's "joined-meeting" event, which
         * only means the call object has joined the room -- it fires well
         * before the replica's video track is attached, and even once
         * attached, WebRTC's first couple of seconds of frames are typically
         * choppy while bitrate estimation and the jitter buffer ramp up. The
         * cover was dropping the moment signaling finished, so the candidate
         * watched that ramp-up directly: the reported "choppy for the first
         * 3 seconds" symptom. Now the cover stays up until the video element
         * has actually started rendering frames (the "playing" event), plus a
         * short settle delay to clear that ramp-up, so the candidate only
         * ever sees smooth video.
         */
        const scheduleReveal = (videoEl: HTMLVideoElement | null) => {
          if (revealedRef.current || revealTimerRef.current) return;
          const commit = () => {
            if (revealedRef.current || !alive) return;
            revealedRef.current = true;
            setState("live");
          };
          if (!videoEl) {
            // No video track to wait out (audio-only update) -- nothing to hide.
            commit();
            return;
          }
          const onPlaying = () => {
            videoEl.removeEventListener("playing", onPlaying);
            revealTimerRef.current = setTimeout(commit, 800);
          };
          videoEl.addEventListener("playing", onPlaying);
        };

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

          scheduleReveal(video ? videoRef.current : null);
        };

        call
          .on("joined-meeting", () => {
            if (!alive) return;
            joinedAtRef.current = Date.now();
            onJoined?.(call!);
          })
          .on("participant-joined", (e) => attach(e?.participant))
          .on("participant-updated", (e) => attach(e?.participant))
          .on("app-message", (e) => onAppMessage?.(e?.data))
          .on("left-meeting", () => {
            if (!alive) return;
            if (isExpectedEnd("")) {
              setState("ended");
              onNaturalEnd?.();
            } else {
              onLeft?.();
            }
          })
          .on("error", (e) => {
            if (!alive) return;
            const message = e?.errorMsg ?? "Video connection failed";
            if (isExpectedEnd(message)) {
              setState("ended");
              onNaturalEnd?.();
            } else {
              setState("failed");
              onError?.(message);
            }
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
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
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
            {state === "joining"
              ? "Connecting to your interviewer…"
              : state === "ended"
                ? "Wrapping up…"
                : "Video failed"}
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

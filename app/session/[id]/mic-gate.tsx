"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, Card } from "@/components/ui";
import { audioLevels } from "@/lib/audio-levels";
import { unlockAudioElement } from "@/lib/audio-unlock";
import { isIOSNonSafari } from "@/lib/platform";

/**
 * Microphone permission and sound check, run BEFORE the interview starts.
 *
 * The browser's permission prompt used to fire when the session mounted, which
 * put a modal over the screen at the exact moment the interviewer began
 * speaking. The first thing a candidate heard was a question they were not
 * listening to, and the first thing they did was click a dialog.
 *
 * So permission is acquired here, deliberately, and the granted stream is
 * handed to the session. Nothing downstream calls getUserMedia.
 *
 * The click that grants permission is also a user gesture, which is what lets
 * the AudioContext resume and the interviewer's first line actually play under
 * browser autoplay policy.
 */

type Phase =
  /** Working out whether the browser already has permission. */
  | "checking"
  /** Waiting for the candidate to press the button that triggers the prompt. */
  | "prompt"
  /** getUserMedia is in flight. */
  | "requesting"
  /** Stream is live and the meter is running. */
  | "ready"
  | "denied"
  /** No microphone at all, or an insecure context. */
  | "unavailable";

export default function MicGate({
  onReady,
  roundLabel,
}: {
  /** Called with a live stream the session takes ownership of. */
  onReady: (stream: MediaStream) => void;
  roundLabel?: string;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [detail, setDetail] = useState<string | null>(null);
  /** Peak level seen so far, so a brief "hello" is enough to prove it works. */
  const [heard, setHeard] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const handedOffRef = useRef(false);
  // The address-bar permission icon this gate normally points at doesn't
  // exist the same way in an iOS Chrome/Firefox/Edge shell, so those
  // browsers need Settings-app instructions instead. Read via
  // useSyncExternalStore (not a state-setting effect) so SSR reliably
  // returns false rather than depending on hydration timing -- same
  // reasoning as the `wantsVideo` read in round-shell.tsx.
  const iosNonSafari = useSyncExternalStore(
    () => () => {},
    () => isIOSNonSafari(),
    () => false
  );

  const request = useCallback(async () => {
    // Primed here (synchronously, before any await) so it runs inside
    // whatever user gesture triggered this call. The live round's remote
    // audio element reuses this same unlocked element later, once the
    // WebRTC handshake -- several network round-trips away -- finally
    // delivers the interviewer's track. See lib/audio-unlock.ts.
    unlockAudioElement();
    setPhase("requesting");
    setDetail(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      audioLevels.attachStream("input", stream);
      setPhase("ready");
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPhase("denied");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setPhase("unavailable");
        setDetail("No microphone was found on this device.");
      } else {
        setPhase("denied");
        setDetail(e instanceof Error ? e.message : null);
      }
    }
  }, []);

  // Decide whether we can skip the explanation screen. A previously granted
  // permission means getUserMedia resolves without showing any prompt, so we
  // go straight to the sound check rather than making them click twice.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        // Every iOS browser (Chrome, Firefox, Edge, Safari) is WebKit under
        // the hood, so "no getUserMedia" here isn't a Safari-only problem --
        // it means this specific browser shell hasn't wired up media capture
        // (older iOS versions, or some in-app/embedded browsers). Telling
        // Chrome/Firefox/Edge users to "use Safari" when the real fix is
        // often just updating iOS or leaving an embedded webview was
        // actively wrong, so this no longer names a specific browser.
        setPhase("unavailable");
        setDetail(
          "This browser cannot access a microphone. Try updating iOS, or open this page in your regular browser rather than an in-app/embedded one."
        );
        return;
      }
      try {
        // Not available in every browser (Safari historically throws here),
        // which is why the failure path just shows the normal prompt screen.
        const status = await navigator.permissions?.query({
          name: "microphone" as PermissionName,
        });
        if (!alive) return;
        if (status?.state === "granted") {
          void request();
          return;
        }
        if (status?.state === "denied") {
          setPhase("denied");
          return;
        }
        setPhase("prompt");
      } catch {
        if (alive) setPhase("prompt");
      }
    })();
    return () => {
      alive = false;
    };
  }, [request]);

  // Live input meter. Reads the same amplitude bus the interview uses, so a
  // working meter here proves the exact path the round depends on.
  useEffect(() => {
    if (phase !== "ready") return;
    let raf = 0;
    let peak = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const level = audioLevels.level("input");
      if (level > peak) peak = level;
      if (peak > 0.06) setHeard(true);
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${Math.min(1, level * 1.6).toFixed(3)})`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // If the gate unmounts without handing the stream over, release the mic.
  // Once handed off the session owns it and must not have it stopped here.
  useEffect(() => {
    return () => {
      if (handedOffRef.current) return;
      audioLevels.detach("input");
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    // Re-prime on the actual "Start interview" tap too -- the closest
    // possible gesture to when the round's remote audio element will need
    // to start playing.
    unlockAudioElement();
    handedOffRef.current = true;
    onReady(stream);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6 py-10">
      <div className="w-full max-w-md">
        {roundLabel && (
          <p className="mb-2 text-center text-sm font-medium text-accent">
            {roundLabel}
          </p>
        )}
        <h1 className="text-center text-2xl font-semibold text-primary">
          Sound check
        </h1>
        <p className="mt-2 text-center text-sm text-secondary">
          This interview is spoken, so we need your microphone before we begin.
        </p>

        <Card className="mt-6">
          {phase === "checking" && (
            <p className="text-sm text-muted">Checking your microphone…</p>
          )}

          {phase === "prompt" && (
            <>
              <p className="text-sm text-secondary">
                Your browser will ask for permission. Choose Allow, and we will
                check that we can hear you before the interviewer starts.
              </p>
              <Button className="mt-4 w-full" onClick={request}>
                Enable microphone
              </Button>
            </>
          )}

          {phase === "requesting" && (
            <p className="text-sm text-secondary">
              Waiting for you to allow microphone access…
            </p>
          )}

          {phase === "ready" && (
            <>
              <p className="text-sm text-secondary">
                Say something, like &ldquo;testing, one two&rdquo;.
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated">
                <div
                  ref={meterRef}
                  className="h-full origin-left rounded-full bg-accent"
                  style={{ transform: "scaleX(0)", willChange: "transform" }}
                />
              </div>

              <p
                className={`mt-3 text-sm transition-colors ${
                  heard ? "text-accent" : "text-muted"
                }`}
              >
                {heard
                  ? "We can hear you. You're all set."
                  : "Waiting to hear you…"}
              </p>

              <Button
                className="mt-4 w-full"
                onClick={start}
                variant={heard ? "primary" : "secondary"}
              >
                {heard ? "Start interview" : "Start anyway"}
              </Button>
              {!heard && (
                <p className="mt-2 text-center text-xs text-muted">
                  If the bar is not moving, check your input device, then start
                  when you are ready.
                </p>
              )}
            </>
          )}

          {phase === "denied" && (
            <>
              <p className="text-sm font-medium text-error">
                Microphone access is blocked
              </p>
              <p className="mt-2 text-sm text-secondary">
                The interview is spoken, so it cannot run without a microphone.
                To enable it:
              </p>
              {iosNonSafari ? (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-secondary">
                  <li>
                    Open the iOS Settings app, then find this browser in the
                    app list (not this browser&rsquo;s own in-page settings).
                  </li>
                  <li>Turn Microphone on for it.</li>
                  <li>Reload this page.</li>
                </ol>
              ) : (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-secondary">
                  <li>
                    Click the icon at the left of the address bar (a padlock, a
                    slider, or a crossed-out microphone).
                  </li>
                  <li>Set Microphone to Allow.</li>
                  <li>Reload this page.</li>
                </ol>
              )}
              {detail && <p className="mt-3 text-xs text-muted">{detail}</p>}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
                <Button variant="ghost" className="flex-1" href="/dashboard">
                  Back to dashboard
                </Button>
              </div>
            </>
          )}

          {phase === "unavailable" && (
            <>
              <p className="text-sm font-medium text-error">
                No microphone available
              </p>
              <p className="mt-2 text-sm text-secondary">
                {detail ??
                  "We could not find a microphone on this device. Connect one and reload."}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
                <Button variant="ghost" className="flex-1" href="/dashboard">
                  Back to dashboard
                </Button>
              </div>
            </>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          Your audio is used to run the interview and is not stored as a
          recording.
        </p>
      </div>
    </main>
  );
}

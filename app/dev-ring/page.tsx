"use client";

import { useEffect, useRef, useState } from "react";
import VoiceRing, { type RingState } from "../session/[id]/voice-ring";
import { audioLevels } from "@/lib/audio-levels";

const STATES: RingState[] = [
  "idle",
  "connecting",
  "thinking",
  "listening",
  "recording",
  "speaking",
  "done",
  "failed",
];

/**
 * Preview harness for tuning the ring without running a real interview.
 *
 * The synthetic voice matters as much as the mic: it drives the "output" bus,
 * which is the interviewer's side, and that is the one state a mic cannot
 * exercise.
 */
export default function DevRing() {
  const [state, setState] = useState<RingState>("speaking");
  const [micOn, setMicOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const synth = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  useEffect(() => () => synth.current?.stop(), []);

  async function toggleMic() {
    if (micOn) {
      audioLevels.detach("input");
      setMicOn(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioLevels.attachStream("input", stream);
    setMicOn(true);
  }

  /**
   * A speech-shaped signal: a voiced tone whose envelope opens and closes at
   * roughly syllable rate, so the ring sees the same kind of amplitude curve a
   * real sentence produces.
   */
  function toggleVoice() {
    if (voiceOn) {
      synth.current?.stop();
      synth.current = null;
      audioLevels.detach("output");
      setVoiceOn(false);
      return;
    }

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 0;

    const carrier = ctx.createOscillator();
    carrier.type = "sawtooth";
    carrier.frequency.value = 130;

    // Syllables: a slow LFO on the gain, offset so it never fully closes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 3.4;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.35;
    const floor = ctx.createConstantSource();
    floor.offset.value = 0.4;

    lfo.connect(lfoDepth).connect(gain.gain);
    floor.connect(gain.gain);
    carrier.connect(gain).connect(dest);

    carrier.start();
    lfo.start();
    floor.start();

    audioLevels.attachStream("output", dest.stream);
    synth.current = {
      ctx,
      stop: () => {
        try {
          carrier.stop();
          lfo.stop();
          floor.stop();
          void ctx.close();
        } catch {}
      },
    };
    setVoiceOn(true);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-6">
      <VoiceRing state={state} size={320} />

      <p className="text-sm text-muted">
        state: <span className="text-accent-hover">{state}</span>
      </p>

      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {STATES.map((s) => (
          <button
            key={s}
            data-state={s}
            onClick={() => setState(s)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              state === s
                ? "border-accent-border bg-accent-muted text-accent-hover"
                : "border-line text-secondary hover:border-line-strong"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          id="toggle-voice"
          onClick={toggleVoice}
          className="rounded-md border border-line px-4 py-2 text-sm text-secondary transition-colors hover:border-line-strong"
        >
          {voiceOn ? "Stop interviewer voice" : "Play synthetic interviewer voice"}
        </button>
        <button
          onClick={toggleMic}
          className="rounded-md border border-line px-4 py-2 text-sm text-secondary transition-colors hover:border-line-strong"
        >
          {micOn ? "Stop mic" : "Feed my mic in"}
        </button>
      </div>

      <p className="max-w-sm text-center text-xs text-muted">
        Speaking plus the synthetic voice exercises the interviewer side.
        Recording plus the mic exercises the candidate side.
      </p>
    </main>
  );
}

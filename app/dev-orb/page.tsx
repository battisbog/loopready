"use client";

import { useState } from "react";
import VoiceOrb, { type OrbState } from "../session/[id]/voice-orb";
import { audioLevels } from "@/lib/audio-levels";

const STATES: OrbState[] = [
  "idle",
  "recording",
  "transcribing",
  "thinking",
  "speaking",
  "done",
];

/** Preview harness for tuning the orb without running a real interview. */
export default function DevOrb() {
  const [state, setState] = useState<OrbState>("idle");
  const [micOn, setMicOn] = useState(false);

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-6">
      <VoiceOrb state={state} size={320} />

      <p className="text-sm text-zinc-500">
        state: <span className="text-emerald-400">{state}</span>
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              state === s
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={toggleMic}
        className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700"
      >
        {micOn ? "Stop mic" : "Feed my mic into the orb"}
      </button>
      <p className="max-w-sm text-center text-xs text-zinc-600">
        Set the state to &ldquo;recording&rdquo; and start the mic to see live
        amplitude drive the displacement.
      </p>
    </main>
  );
}

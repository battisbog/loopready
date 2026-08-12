"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Turn {
  role: string;
  text: string;
}

type Status =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "done";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Tap the mic and answer out loud",
  recording: "Recording — tap again when you're done",
  transcribing: "Transcribing…",
  thinking: "Interviewer is thinking…",
  speaking: "Interviewer is speaking…",
  done: "Interview complete",
};

export default function VoiceInterview({
  sessionId,
  initialTurns,
  questionIndex,
  questionCount,
}: {
  sessionId: string;
  initialTurns: Turn[];
  questionIndex: number;
  questionCount: number;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [status, setStatus] = useState<Status>("idle");
  const [qIndex, setQIndex] = useState(questionIndex);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const spokeOpening = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, status]);

  // Speak the latest interviewer turn on first load (e.g. the opening question)
  useEffect(() => {
    if (spokeOpening.current) return;
    spokeOpening.current = true;
    const last = initialTurns[initialTurns.length - 1];
    if (last?.role === "interviewer") {
      playTts(last.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function playTts(text: string): Promise<void> {
    try {
      setStatus("speaking");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve()); // autoplay may be blocked before first gesture
      });
      URL.revokeObjectURL(url);
    } catch {
      // Captions still show the text; don't block the interview on audio
    }
  }

  async function toggleRecording() {
    setError(null);
    if (status === "recording") {
      recorderRef.current?.stop();
      return;
    }
    if (status !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        handleAnswer(blob, mime);
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setError("Microphone access is required for the interview.");
    }
  }

  async function handleAnswer(blob: Blob, mime: string) {
    try {
      setStatus("transcribing");
      const form = new FormData();
      form.append(
        "audio",
        new File([blob], mime.includes("webm") ? "answer.webm" : "answer.mp4", {
          type: mime,
        })
      );
      const tRes = await fetch("/api/transcribe", { method: "POST", body: form });
      const tData = await tRes.json();
      if (!tRes.ok) throw new Error(tData.error ?? "Transcription failed");
      const text: string = tData.text;
      if (!text) {
        setStatus("idle");
        setError("Didn't catch that — try again.");
        return;
      }
      setTurns((t) => [...t, { role: "candidate", text }]);
      setHint(
        text.split(/\s+/).length > 220
          ? "That answer ran long — in a real interview you'd want to be more concise."
          : null
      );

      setStatus("thinking");
      const iRes = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userMessage: text }),
      });
      const iData = await iRes.json();
      if (!iRes.ok) throw new Error(iData.error ?? "Interview error");
      setTurns((t) => [...t, { role: "interviewer", text: iData.reply }]);
      setQIndex(iData.questionIndex);

      await playTts(iData.reply);

      if (iData.done) {
        setStatus("done");
        router.push(`/session/${sessionId}/feedback`);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function endEarly() {
    audioRef.current?.pause();
    await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    router.push(`/session/${sessionId}/feedback`);
  }

  const recording = status === "recording";
  const busy =
    status === "transcribing" || status === "thinking" || status === "speaking";

  return (
    <main className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm font-medium text-zinc-400">
          Question {Math.min(qIndex + 1, questionCount)} of {questionCount}
          <span className="font-mono text-xs text-zinc-600">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
        </span>
        <button
          onClick={endEarly}
          className="text-sm text-zinc-600 hover:text-zinc-400"
        >
          End interview early
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
        {turns.map((t, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              t.role === "interviewer"
                ? "bg-zinc-900 text-zinc-200"
                : "ml-auto bg-emerald-500/15 text-emerald-100"
            }`}
          >
            {t.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col items-center gap-3 pb-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-amber-400/80">{hint}</p>}
        <button
          onClick={toggleRecording}
          disabled={busy || status === "done"}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className={`flex h-20 w-20 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
            recording
              ? "animate-pulse bg-red-500 hover:bg-red-400"
              : "bg-emerald-500 hover:bg-emerald-400"
          }`}
        >
          <MicIcon recording={recording} />
        </button>
        <p className="text-sm text-zinc-500">{STATUS_LABEL[status]}</p>
      </div>
    </main>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  if (recording) {
    return <div className="h-6 w-6 rounded-sm bg-zinc-950" />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-8 w-8 text-zinc-950"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <path d="M12 18v4" />
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ServerAudio } from "./audio-source-badge";

export interface Turn {
  role: string;
  text: string;
}

export type Status =
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

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: { isFinal: boolean; 0: { transcript: string } }[];
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  return Ctor ? new Ctor() : null;
}

interface Options {
  sessionId: string;
  initialTurns: Turn[];
  // Extra artifact state (code, diagram) sent with each answer.
  getArtifactPatch?: () => object | undefined;
  onProgress?: (data: { questionIndex: number; questionCount: number }) => void;
  onDone: (nextSessionId: string | null) => void;
}

// Shared push-to-talk pipeline: record → transcribe → interview → speak.
export function useVoiceTurn({
  sessionId,
  initialTurns,
  getArtifactPatch,
  onProgress,
  onDone,
}: Options) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [serverAudio, setServerAudio] = useState<ServerAudio>({
    stt: false,
    tts: false,
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokeOpening = useRef(false);
  // Guards every async continuation: audio must never start (or keep going)
  // after the user leaves the interview.
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const teardown = () => {
      aliveRef.current = false;
      stopAllAudio();
      try {
        recorderRef.current?.stop();
      } catch {}
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
    // Chrome can keep speaking across a hard navigation, so cover that too.
    window.addEventListener("pagehide", teardown);
    return () => {
      window.removeEventListener("pagehide", teardown);
      teardown();
    };
  }, []);

  function stopAllAudio() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/audio/capabilities")
      .then((r) => r.json())
      .then(setServerAudio)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (spokeOpening.current) return;
    spokeOpening.current = true;
    const last = initialTurns[initialTurns.length - 1];
    if (last?.role === "interviewer") {
      playTts(last.text).then(() =>
        setStatus((s) => (s === "speaking" ? "idle" : s))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speakWithBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!aliveRef.current) return resolve();
      if (!("speechSynthesis" in window)) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            /Daniel|Samantha|Google US English/i.test(v.name)
        ) ?? voices.find((v) => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;
      u.rate = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }

  async function playTts(text: string): Promise<void> {
    if (!aliveRef.current) return;
    setStatus("speaking");
    try {
      if (!serverAudio.tts) {
        await speakWithBrowser(text);
        return;
      }
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      // The request may have resolved after the user navigated away.
      if (!aliveRef.current) return;
      const url = URL.createObjectURL(blob);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
    } catch {
      await speakWithBrowser(text);
    }
  }

  async function toggleRecording() {
    setError(null);
    if (status === "recording") {
      recorderRef.current?.stop();
      recognitionRef.current?.stop();
      return;
    }
    if (status !== "idle") return;
    if (serverAudio.stt) startMediaRecorder();
    else startBrowserRecognition();
  }

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) =>
        e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        transcribeAndAnswer(new Blob(chunksRef.current, { type: mime }), mime);
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setError("Microphone access is required for the interview.");
    }
  }

  function startBrowserRecognition() {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError(
        "This browser doesn't support speech recognition — use Chrome, or add an OpenAI key for server-side transcription."
      );
      return;
    }
    transcriptRef.current = "";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finals = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal)
          finals += event.results[i][0].transcript + " ";
      }
      transcriptRef.current = finals.trim();
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        setError("Microphone access is required for the interview.");
        setStatus("idle");
      }
    };
    recognition.onend = () => {
      const text = transcriptRef.current.trim();
      if (!text) {
        setStatus("idle");
        setError("Didn't catch that — try again.");
        return;
      }
      submitAnswer(text);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setStatus("recording");
  }

  async function transcribeAndAnswer(blob: Blob, mime: string) {
    try {
      setStatus("transcribing");
      const form = new FormData();
      form.append(
        "audio",
        new File([blob], mime.includes("webm") ? "answer.webm" : "answer.mp4", {
          type: mime,
        })
      );
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");
      const text: string = (data.text ?? "").trim();
      if (!text) {
        setStatus("idle");
        setError("Didn't catch that — try again.");
        return;
      }
      await submitAnswer(text);
    } catch {
      setServerAudio((s) => ({ ...s, stt: false }));
      setStatus("idle");
      setError(
        "Server transcription unavailable — switched to browser speech. Tap the mic and repeat your answer."
      );
    }
  }

  async function submitAnswer(text: string) {
    try {
      setTurns((t) => [...t, { role: "candidate", text }]);
      setHint(
        text.split(/\s+/).length > 220
          ? "That answer ran long — in a real interview you'd want to be more concise."
          : null
      );
      setStatus("thinking");

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userMessage: text,
          artifact: getArtifactPatch?.(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Interview error");

      setTurns((t) => [...t, { role: "interviewer", text: data.reply }]);
      onProgress?.({
        questionIndex: data.questionIndex,
        questionCount: data.questionCount,
      });

      await playTts(data.reply);
      if (!aliveRef.current) return;

      if (data.done) {
        setStatus("done");
        stopAllAudio();
        onDone(data.nextRound?.sessionId ?? null);
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function endEarly() {
    // Silence immediately — the user is leaving, don't wait on the request.
    aliveRef.current = false;
    stopAllAudio();
    setStatus("done");
    await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    onDone(null);
  }

  return {
    turns,
    status,
    statusLabel: STATUS_LABEL[status],
    error,
    hint,
    elapsed,
    toggleRecording,
    endEarly,
    serverAudio,
    recording: status === "recording",
    busy:
      status === "transcribing" ||
      status === "thinking" ||
      status === "speaking",
  };
}

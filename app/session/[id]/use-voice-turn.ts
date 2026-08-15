"use client";

import { useEffect, useRef, useState } from "react";
import type { ServerAudio } from "./audio-source-badge";
import { SpeechQueue } from "./speech-queue";

export interface Turn {
  role: string;
  text: string;
  /** True while this turn is still being streamed in. */
  streaming?: boolean;
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
  recording: "Recording. Tap again when you're done",
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

/** Minimal SSE reader — parses `event:` / `data:` frames from a fetch body. */
async function readSSE(
  body: ReadableStream<Uint8Array>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvent: (event: string, data: any) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) {
        try {
          onEvent(event, JSON.parse(dataLines.join("\n")));
        } catch {
          // ignore malformed frame
        }
      }
    }
  }
}

/** Client-side sentence split, mirroring the server's chunking rules. */
function splitForSpeech(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of parts) {
    const piece = raw.trim();
    if (!piece) continue;
    const last = out[out.length - 1];
    // Keep the first chunk short (fast start), then merge to ~60 chars.
    if (last && (out.length === 1 ? last.length < 60 : last.length < 60)) {
      out[out.length - 1] = `${last} ${piece}`;
    } else {
      out.push(piece);
    }
  }
  return out.length ? out : [text];
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
  onDone: (nextSessionId: string | null, loopId?: string | null) => void;
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
  const queueRef = useRef<SpeechQueue | null>(null);
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
    queueRef.current?.stop();
    queueRef.current = null;
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

  /** Fetches one chunk of speech. Returns null to signal "use the fallback". */
  async function fetchSpeech(text: string): Promise<Blob | null> {
    if (!serverAudio.tts || !aliveRef.current) return null;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return aliveRef.current && blob.size > 0 ? blob : null;
    } catch {
      return null;
    }
  }

  function newQueue(): SpeechQueue {
    queueRef.current?.stop();
    const q = new SpeechQueue(fetchSpeech, (t) => speakWithBrowser(t));
    queueRef.current = q;
    return q;
  }

  /**
   * Speaks a complete piece of text (the opening turn). Split into sentences so
   * the first one starts playing while the rest are still being synthesised.
   */
  async function playTts(text: string): Promise<void> {
    if (!aliveRef.current) return;
    setStatus("speaking");
    if (!serverAudio.tts) {
      await speakWithBrowser(text);
      return;
    }
    const queue = newQueue();
    for (const part of splitForSpeech(text)) queue.push(part);
    await queue.idle();
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
        "This browser doesn't support speech recognition. Use Chrome, or add an OpenAI key for server-side transcription."
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
        setError("Didn't catch that. Try again.");
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
        setError("Didn't catch that. Try again.");
        return;
      }
      await submitAnswer(text);
    } catch {
      setServerAudio((s) => ({ ...s, stt: false }));
      setStatus("idle");
      setError(
        "Server transcription unavailable, so we switched to browser speech. Tap the mic and repeat your answer."
      );
    }
  }

  async function submitAnswer(text: string) {
    try {
      setTurns((t) => [...t, { role: "candidate", text }]);
      setHint(
        text.split(/\s+/).length > 220
          ? "That answer ran long. In a real interview you'd want to be more concise."
          : null
      );
      setStatus("thinking");

      const res = await fetch("/api/interview/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userMessage: text,
          artifact: getArtifactPatch?.(),
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Interview error");
      }

      const queue = newQueue();
      let spoken = "";
      // Boxed so TypeScript doesn't narrow it to `never` via the callback.
      const outcome: {
        value: {
          reply: string;
          done: boolean;
          nextRound?: { sessionId: string } | null;
          loopComplete?: string | null;
          questionIndex: number;
          questionCount: number;
        } | null;
      } = { value: null };

      // Each sentence starts speaking as soon as it exists — we never wait for
      // the full reply.
      await readSSE(res.body, (event, data) => {
        if (!aliveRef.current) return;
        if (event === "sentence") {
          if (!spoken) setStatus("speaking");
          spoken = spoken ? `${spoken} ${data.text}` : data.text;
          setTurns((t) => {
            const last = t[t.length - 1];
            if (last?.role === "interviewer" && last.streaming) {
              return [...t.slice(0, -1), { ...last, text: spoken }];
            }
            return [...t, { role: "interviewer", text: spoken, streaming: true }];
          });
          queue.push(data.text);
        } else if (event === "done") {
          outcome.value = data;
        } else if (event === "error") {
          throw new Error(data.error ?? "Interview error");
        }
      });

      if (!aliveRef.current) return;
      const result = outcome.value;
      if (!result) throw new Error("Interview stream ended unexpectedly");

      setTurns((t) => {
        const last = t[t.length - 1];
        if (last?.role === "interviewer" && last.streaming) {
          return [...t.slice(0, -1), { role: "interviewer", text: result.reply }];
        }
        return [...t, { role: "interviewer", text: result.reply }];
      });
      onProgress?.({
        questionIndex: result.questionIndex,
        questionCount: result.questionCount,
      });

      // Let the queued audio finish before handing the mic back.
      await queue.idle();
      if (!aliveRef.current) return;

      if (result.done) {
        setStatus("done");
        stopAllAudio();
        onDone(result.nextRound?.sessionId ?? null, result.loopComplete ?? null);
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
    const res = await fetch("/api/interview/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    // Ending a round inside a loop moves on to the next round rather than
    // abandoning the remaining ones.
    const data = await res.json().catch(() => ({}));
    onDone(data.nextRound?.sessionId ?? null, data.loopComplete ?? null);
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

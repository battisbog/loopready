"use client";

export interface ServerAudio {
  stt: boolean;
  tts: boolean;
  ttsProvider?: string;
  sttProvider?: string;
}

// Makes voice-quality problems diagnosable at a glance: shows whether audio is
// coming from the server pipeline or the browser's built-in speech.
export default function AudioSourceBadge({
  serverAudio,
}: {
  serverAudio: ServerAudio;
}) {
  const both = serverAudio.stt && serverAudio.tts;
  const neither = !serverAudio.stt && !serverAudio.tts;

  const label = both
    ? `${serverAudio.ttsProvider ?? "Server"} voice`
    : neither
      ? "Browser voice"
      : "Mixed audio";

  const detail = both
    ? `Speech: ${serverAudio.sttProvider ?? "Whisper"} · Voice: ${serverAudio.ttsProvider ?? "OpenAI"}`
    : neither
      ? "Using the browser's built-in speech, which is lower quality. Set ELEVENLABS_API_KEY or OPENAI_API_KEY for a natural voice."
      : `Speech: ${serverAudio.stt ? (serverAudio.sttProvider ?? "Whisper") : "browser"} · Voice: ${
          serverAudio.tts ? (serverAudio.ttsProvider ?? "OpenAI") : "browser"
        }`;

  return (
    <span
      title={detail}
      className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        both
          ? "border-accent-border bg-accent-muted text-accent"
          : neither
            ? "border-warn/30 bg-warn-muted text-warn"
            : "border-line-strong bg-elevated/60 text-secondary"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          both ? "bg-accent-hover" : neither ? "bg-warn" : "bg-muted"
        }`}
      />
      {label}
    </span>
  );
}

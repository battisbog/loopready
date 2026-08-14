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
      ? "Using the browser's built-in speech, which is lower quality. Set an API key for natural voice."
      : `Speech: ${serverAudio.stt ? (serverAudio.sttProvider ?? "Whisper") : "browser"} · Voice: ${
          serverAudio.tts ? (serverAudio.ttsProvider ?? "OpenAI") : "browser"
        }`;

  return (
    <span
      title={detail}
      className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        both
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : neither
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          both ? "bg-emerald-400" : neither ? "bg-amber-400" : "bg-zinc-400"
        }`}
      />
      {label}
    </span>
  );
}

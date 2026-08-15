// Voice pipeline.
//
// TTS provider order: ElevenLabs (best) → OpenAI → browser Web Speech (client
// side, last resort). STT: OpenAI Whisper, else browser speech recognition.
// The AI Gateway has no audio endpoints (verified: /v1/audio/* 404s), so these
// call the providers directly.

export const TTS_MAX_CHARS = 1000;

// Calm, professional male narrator. Override with ELEVENLABS_VOICE_ID; see
// docs/voices.md for alternatives that suit an interviewer.
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "onwK4e9ZLuTAKqWW03F9"; // "Daniel"
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";

// OpenAI is the fallback provider. gpt-4o-mini-tts accepts delivery
// instructions, which is the difference between a flat narrator read and
// something that sounds like a person conducting an interview.
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || "ash";
const OPENAI_TTS_INSTRUCTIONS =
  process.env.OPENAI_TTS_INSTRUCTIONS ||
  "Speak as a calm, experienced senior engineer conducting a job interview. " +
    "Measured pace, warm but professional, natural conversational intonation. " +
    "Do not sound like a narrator, an announcer, or an assistant.";

export interface AudioCapabilities {
  stt: boolean;
  tts: boolean;
  sttProvider?: string;
  ttsProvider?: string;
}

export function audioCapabilities(): AudioCapabilities {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasEleven = Boolean(process.env.ELEVENLABS_API_KEY);
  return {
    stt: hasOpenAI,
    tts: hasEleven || hasOpenAI,
    sttProvider: hasOpenAI ? "Whisper" : undefined,
    ttsProvider: hasEleven ? "ElevenLabs" : hasOpenAI ? "OpenAI" : undefined,
  };
}

export async function transcribe(file: File): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return (data.text ?? "").trim();
}

async function elevenLabsSpeak(text: string): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY!;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs failed (${res.status}): ${await res.text()}`);
  }
  return res.arrayBuffer();
}

async function openAISpeak(text: string): Promise<ArrayBuffer> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: OPENAI_TTS_VOICE,
      input: text,
      response_format: "mp3",
      ...(OPENAI_TTS_MODEL.startsWith("gpt-")
        ? { instructions: OPENAI_TTS_INSTRUCTIONS }
        : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI TTS failed (${res.status}): ${await res.text()}`);
  }
  return res.arrayBuffer();
}

export interface SpeakStreamResult {
  stream: ReadableStream<Uint8Array>;
  provider: string;
}

async function elevenLabsStream(text: string): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.ELEVENLABS_API_KEY!;
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=mp3_44100_128&optimize_streaming_latency=3`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok || !res.body) {
    throw new Error(`ElevenLabs stream failed (${res.status}): ${await res.text()}`);
  }
  return res.body;
}

async function openAIStream(text: string): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.OPENAI_API_KEY!;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: OPENAI_TTS_VOICE,
      input: text,
      response_format: "mp3",
      stream_format: "audio",
      ...(OPENAI_TTS_MODEL.startsWith("gpt-")
        ? { instructions: OPENAI_TTS_INSTRUCTIONS }
        : {}),
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`OpenAI TTS stream failed (${res.status}): ${await res.text()}`);
  }
  return res.body;
}

/**
 * Returns audio as a stream so the client can start playing before the whole
 * clip exists. Falls back down the provider chain on failure.
 */
const announced = new Set<string>();
function announceProvider(provider: string, detail: string) {
  if (announced.has(provider)) return;
  announced.add(provider);
  console.log(`[tts] serving audio via ${provider} (${detail})`);
}

export async function speakStream(rawText: string): Promise<SpeakStreamResult> {
  const text = rawText.slice(0, TTS_MAX_CHARS);

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const stream = await elevenLabsStream(text);
      announceProvider(
        "elevenlabs",
        `voice=${ELEVENLABS_VOICE_ID} model=${ELEVENLABS_MODEL}`
      );
      return { stream, provider: "elevenlabs" };
    } catch (e) {
      console.error("[tts] ElevenLabs failed, falling back to OpenAI:", e);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    const stream = await openAIStream(text);
    announceProvider(
      "openai",
      `voice=${OPENAI_TTS_VOICE} model=${OPENAI_TTS_MODEL}`
    );
    return { stream, provider: "openai" };
  }
  console.warn(
    "[tts] No TTS provider configured. The client will use browser speech."
  );
  throw new Error("No TTS provider configured");
}

export interface SpeakResult {
  audio: ArrayBuffer;
  provider: string;
}

export async function speak(rawText: string): Promise<SpeakResult> {
  // Interviewer turns are short by design; this guards against a runaway reply
  // costing a fortune or timing out.
  const text = rawText.slice(0, TTS_MAX_CHARS);

  if (process.env.ELEVENLABS_API_KEY) {
    try {
      return { audio: await elevenLabsSpeak(text), provider: "elevenlabs" };
    } catch (e) {
      console.error("ElevenLabs TTS failed, falling back to OpenAI:", e);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return { audio: await openAISpeak(text), provider: "openai" };
  }
  throw new Error("No TTS provider configured");
}

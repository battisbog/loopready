// STT (Whisper) and TTS. Prefers a direct OpenAI key when present; otherwise
// routes through the Vercel AI Gateway's OpenAI-compatible endpoint using the
// OIDC token / gateway key.

function audioConfig() {
  if (process.env.OPENAI_API_KEY) {
    return {
      base: "https://api.openai.com/v1",
      key: process.env.OPENAI_API_KEY,
      sttModel: "whisper-1",
      ttsModel: "gpt-4o-mini-tts",
    };
  }
  const key =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  return {
    base: "https://ai-gateway.vercel.sh/v1",
    key: key!,
    sttModel: "openai/whisper-1",
    ttsModel: "openai/gpt-4o-mini-tts",
  };
}

export async function transcribe(file: File): Promise<string> {
  const { base, key, sttModel } = audioConfig();
  const form = new FormData();
  form.append("file", file);
  form.append("model", sttModel);
  const res = await fetch(`${base}/audio/transcriptions`, {
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

export async function speak(text: string): Promise<ArrayBuffer> {
  const { base, key, ttsModel } = audioConfig();
  const res = await fetch(`${base}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ttsModel,
      voice: "onyx",
      input: text,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    throw new Error(`TTS failed (${res.status}): ${await res.text()}`);
  }
  return res.arrayBuffer();
}

// STT (Whisper) and TTS via OpenAI. Requires OPENAI_API_KEY — the AI Gateway
// has no audio endpoints (verified: /v1/audio/* returns 404). Without the key,
// the client uses the browser's Web Speech API instead (see voice-interview.tsx).

function audioConfig() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  return {
    base: "https://api.openai.com/v1",
    key,
    sttModel: "whisper-1",
    ttsModel: "gpt-4o-mini-tts",
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

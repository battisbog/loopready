import { NextResponse } from "next/server";

// The AI Gateway doesn't serve audio endpoints, so server-side STT/TTS is
// only available with a direct OpenAI key. Without it the client falls back
// to the browser's Web Speech API.
export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({ stt: hasOpenAI, tts: hasOpenAI });
}

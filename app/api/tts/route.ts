import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speakStream } from "@/lib/audio";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("tts", user.id);
  if (!limited.ok) return limited.response!;

  const { text } = await request.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    // Piped straight through — the first audio bytes reach the browser while
    // the provider is still synthesising the rest.
    const { stream, provider } = await speakStream(text);
    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Provider": provider,
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}

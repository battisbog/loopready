import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speak } from "@/lib/audio";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await request.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const { audio, provider } = await speak(text);
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-TTS-Provider": provider,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}

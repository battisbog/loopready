import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { speakStream } from "@/lib/audio";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cheap gates first: nothing paid runs until all of these pass.
  const limited = await checkRateLimit("tts", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("tts", request);
  if (!ipLimited.ok) return ipLimited.response!;

  const budget = await consumeGlobalBudget();
  if (budget.exceeded) return serviceBusyResponse();

  const { text } = await request.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    // Piped straight through — the first audio bytes reach the browser while
    // the provider is still synthesising the rest.
    const { stream, provider } = await speakStream(text);
    // Provider accepted the request; count it. Failures fall to catch below.
    void recordUsage("tts", user.id, request);
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

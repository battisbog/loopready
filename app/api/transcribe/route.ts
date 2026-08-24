import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribe } from "@/lib/audio";
import {
  checkIpRateLimit,
  checkRateLimit,
  consumeGlobalBudget,
  recordUsage,
  serviceBusyResponse,
} from "@/lib/rate-limit";
import { getUserTier } from "@/lib/tiers";

export const maxDuration = 60;

/** Matches the transcription provider's own per-file ceiling. */
const MAX_AUDIO_BYTES = Number(process.env.MAX_AUDIO_BYTES ?? 25 * 1024 * 1024);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cheap gates first: nothing paid runs until all of these pass.
  const limited = await checkRateLimit("transcribe", user.id);
  if (!limited.ok) return limited.response!;

  const ipLimited = await checkIpRateLimit("transcribe", request);
  if (!ipLimited.ok) return ipLimited.response!;

  // Tier decides which ceiling applies: free traffic is cut off first so the
  // remaining headroom stays reserved for paying customers.
  const tier = await getUserTier(createAdminClient(), user.id);
  const budget = await consumeGlobalBudget("transcribe", tier);
  if (budget.exceeded) return serviceBusyResponse(tier);

  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "audio file required" }, { status: 400 });
  }
  // The spend ceiling charges a FIXED unit per call, sized for one interview
  // answer, but nothing bounded how much audio a call could carry. Transcription
  // is billed per minute of audio, so a single long upload could cost many times
  // what the budget counter was told it did -- the ceiling would hold on paper
  // while the real bill ran past it. 25MB is also the provider's own hard limit,
  // so anything larger was a wasted round trip regardless.
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "That recording is too long. Keep answers under a few minutes." },
      { status: 413 }
    );
  }

  try {
    const text = await transcribe(file);
    void recordUsage("transcribe", user.id, request);
    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}

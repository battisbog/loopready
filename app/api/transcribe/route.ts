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

  try {
    const text = await transcribe(file);
    void recordUsage("transcribe", user.id, request);
    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { ROUND_IMPLEMENTED, isRoundType, type RoundType } from "@/lib/interview/rounds";
import { startSession } from "@/lib/interview/start";
import {
  checkDailySessionQuota,
  checkRateLimit,
  dailyQuotaResponse,
} from "@/lib/rate-limit";

// Creates a loop (company + level + chosen rounds) and starts its first round.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await checkRateLimit("interview", user.id);
  if (!limited.ok) return limited.response!;

  const body = await request.json().catch(() => ({}));
  const company = String(body.company ?? "generic");
  const level = String(body.level ?? "");
  const rounds: unknown = body.rounds;

  const profile = COMPANY_PROFILES[company];
  if (!profile) {
    return NextResponse.json({ error: "Unknown company" }, { status: 400 });
  }
  if (!profile.levels[level]) {
    return NextResponse.json({ error: "Unknown level for this company" }, { status: 400 });
  }
  if (!Array.isArray(rounds) || rounds.length === 0) {
    return NextResponse.json({ error: "Pick at least one round" }, { status: 400 });
  }
  const roundList = rounds.filter(isRoundType) as RoundType[];
  if (roundList.length !== rounds.length) {
    return NextResponse.json({ error: "Unknown round type" }, { status: 400 });
  }
  const unavailable = roundList.filter((r) => !ROUND_IMPLEMENTED[r]);
  if (unavailable.length) {
    return NextResponse.json(
      { error: `Not available yet: ${unavailable.join(", ")}` },
      { status: 501 }
    );
  }

  const admin = createAdminClient();

  const quota = await checkDailySessionQuota(admin, user.id);
  if (quota.exceeded) return dailyQuotaResponse(quota);

  const { data: loop, error } = await admin
    .from("loops")
    .insert({ user_id: user.id, company, level, rounds: roundList })
    .select()
    .single();
  if (error || !loop) {
    return NextResponse.json({ error: "Failed to create loop" }, { status: 500 });
  }

  const first = await startSession({
    admin,
    userId: user.id,
    roundType: roundList[0],
    loopId: loop.id,
    roundOrder: 0,
    company,
    level,
  });

  return NextResponse.json({ loopId: loop.id, ...first });
}

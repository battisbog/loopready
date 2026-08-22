import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/tiers";
import { isDemoAccount, peekDemoUsage } from "@/lib/demo/gate";

export const dynamic = "force-dynamic";

/**
 * What the current user may start. Read-only, and only ever used to render the
 * "you have M credits" line; every limit is enforced again server-side when a
 * loop is created.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const ent = await getEntitlements(admin, user.id);

  // The shared demo account spends its lifetime cap, not credits. Surfacing the
  // cap here lets the start page offer video without inventing a fake balance,
  // and the server-side cap still bounds everything.
  if (isDemoAccount(user.email)) {
    const demo = await peekDemoUsage(admin);
    return NextResponse.json({
      tier: ent.tier,
      demo: true,
      canUseVideo: demo.remaining > 0 && !demo.disabled,
      videoCreditsRemaining: demo.remaining,
      videoCreditsResetAt: null,
      demoUsed: demo.used,
      demoCap: demo.cap,
    });
  }

  return NextResponse.json({
    tier: ent.tier,
    canUseVideo: ent.canUseVideo,
    videoCreditsRemaining: ent.videoCreditsRemaining,
    videoCreditsResetAt: ent.videoCreditsResetAt,
  });
}

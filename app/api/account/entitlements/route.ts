import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/tiers";

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

  const ent = await getEntitlements(createAdminClient(), user.id);
  return NextResponse.json({
    tier: ent.tier,
    canUseVideo: ent.canUseVideo,
    videoCreditsRemaining: ent.videoCreditsRemaining,
    videoCreditsResetAt: ent.videoCreditsResetAt,
  });
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/tiers";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
import AppSidebar, { SIDEBAR_CONTENT_PADDING } from "@/components/app-sidebar";

/**
 * Shell for the authenticated app: dashboard, start, history, feedback,
 * billing, settings, and loop verdicts. A route group ((app)) so the sidebar
 * is fetched and rendered once, not re-declared on every page -- the URLs
 * underneath are unchanged, since parenthesised segments do not appear in the
 * path.
 *
 * Marketing, checkout and pricing stay outside this group deliberately: a
 * focused checkout flow and a page that also serves signed-out visitors
 * should not carry the authenticated sidebar chrome.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const ent = await getEntitlements(admin, user.id);

  return (
    <div className="min-h-screen bg-base">
      <AppSidebar
        email={user.email}
        credits={{
          // Showing a "buy more" balance for a feature that is off would be
          // confusing, so this is gated on the same flag the feature itself is.
          visible: VIDEO_ENABLED_CLIENT,
          remaining: ent.videoCreditsRemaining,
        }}
      />
      <div className={SIDEBAR_CONTENT_PADDING}>{children}</div>
    </div>
  );
}

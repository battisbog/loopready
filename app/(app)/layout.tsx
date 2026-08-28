import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/tiers";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/shadcn/sidebar";
import AppSidebar from "@/components/app-sidebar";

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
    <SidebarProvider>
      <AppSidebar
        email={user.email}
        // Google and GitHub both return a display name; email sign-ups have
        // none, so the sidebar falls back to the address in that case.
        name={
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined)
        }
        credits={{
          // Showing a "buy more" balance for a feature that is off would be
          // confusing, so this is gated on the same flag the feature itself is.
          visible: VIDEO_ENABLED_CLIENT,
          remaining: ent.videoCreditsRemaining,
        }}
      />
      <SidebarInset>
        {/* Sidebar auto-collapses into a Sheet on mobile (the primitive's own
            responsive behaviour, not hand-rolled) -- but nothing opens that
            Sheet unless something on the page renders a trigger. This bar is
            that trigger, shown only where the rail itself is hidden. */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-base/85 px-4 py-3 backdrop-blur lg:hidden">
          <SidebarTrigger />
          <Link href="/dashboard" className="text-sm font-semibold text-primary">
            LoopReady
          </Link>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

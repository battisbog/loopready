import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTier } from "@/lib/tiers";
import { Card } from "@/components/ui";
import Pricing from "../(marketing)/pricing";
import AppNav from "@/components/app-nav";
import Nav from "../(marketing)/nav";
import PageFadeIn from "./page-fade-in";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "LoopReady plans: a free practice mock, unlimited voice interviews, and video-avatar rounds on Premium.",
};

/**
 * Standalone pricing route. Signed-in users reach plans from the app without
 * being sent back to the marketing page.
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_error?: string }>;
}) {
  const { checkout_error: checkoutError } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentTier = user
    ? await getUserTier(createAdminClient(), user.id)
    : undefined;

  return (
    <PageFadeIn>
      <div className="flex min-h-screen flex-col">
        {user ? <AppNav email={user.email} /> : <Nav signedIn={false} />}

        {/* checkout/page.tsx redirects here with ?checkout_error=... when
            Dodo checkout-session creation fails or refuses to double-subscribe
            -- surface it, otherwise the failure is silent and the page looks
            like nothing happened. */}
        {checkoutError && (
          <div className="mx-auto w-full max-w-6xl px-6 pt-8">
            <Card tone="error">
              <p className="text-sm text-error">{checkoutError}</p>
            </Card>
          </div>
        )}

        {/* compact: this is the very first thing under the nav on this
            route, unlike the homepage where Pricing sits mid-scroll after a
            hero -- the section's default py-24 top padding stacked with the
            nav's own height read as a dead zone before any content. */}
        <Pricing signedIn={Boolean(user)} currentTier={currentTier} compact />

        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
            <Link
              href={user ? "/dashboard" : "/"}
              className="text-sm text-secondary transition-colors hover:text-primary"
            >
              {user ? "Back to dashboard" : "Back to home"}
            </Link>
            <span className="text-xs text-muted">
              Not affiliated with, or endorsed by, any company named on this site.
            </span>
          </div>
        </footer>
      </div>
    </PageFadeIn>
  );
}

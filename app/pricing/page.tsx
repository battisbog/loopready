import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTier } from "@/lib/tiers";
import Pricing from "../(marketing)/pricing";
import AppNav from "@/components/app-nav";
import Nav from "../(marketing)/nav";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "LoopReady plans: a free practice mock, unlimited voice interviews, and video-avatar rounds on Premium.",
};

/**
 * Standalone pricing route. Signed-in users reach plans from the app without
 * being sent back to the marketing page.
 */
export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentTier = user
    ? await getUserTier(createAdminClient(), user.id)
    : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppNav email={user.email} /> : <Nav signedIn={false} />}

      <Pricing signedIn={Boolean(user)} currentTier={currentTier} />

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
  );
}

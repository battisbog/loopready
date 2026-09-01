import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTier, isGoodStanding } from "@/lib/tiers";
import {
  createSubscriptionCheckoutSession,
  createVideoPackCheckoutSession,
} from "@/lib/dodo/checkout";
import type { PaidPlan } from "@/lib/pricing";

/**
 * No LoopReady checkout UI anymore -- this resolves the plan/product from
 * the query string, creates the Dodo checkout session server-side, and
 * redirects straight to Dodo's hosted page. Dodo owns the entire payment
 * experience (order summary, discount code entry, card/wallet form) from
 * here on; nothing renders on this route in the success path.
 *
 * `plan`/`product` aren't validated beyond "is it a known value" -- an
 * unrecognized product still falls through to the default (voice), same
 * behavior the old resolve() had.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; product?: string }>;
}) {
  const { plan: rawPlan, product } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Payment needs an account to attach to, so sign in first and come back.
  if (!user) {
    const target = encodeURIComponent(
      `/checkout?${product ? `product=${product}` : `plan=${rawPlan ?? "voice"}`}`
    );
    redirect(`/login?next=${target}`);
  }

  if (product === "video-pack") {
    const result = await createVideoPackCheckoutSession({
      userId: user.id,
      email: user.email,
      // No LoopReady page to run a quantity stepper on Dodo's hosted page
      // any more -- every video-pack purchase starts at 1 credit. Buying
      // more than one in a single checkout isn't reachable from the app
      // right now; a returning customer just checks out again.
      quantity: 1,
    });
    if (!result.ok) {
      redirect(`/pricing?checkout_error=${encodeURIComponent(result.error)}`);
    }
    redirect(result.checkoutUrl);
  }

  const plan: PaidPlan = rawPlan === "premium" ? "premium" : "voice";

  const admin = createAdminClient();
  const tier = await getUserTier(admin, user.id);
  if (tier === plan) {
    redirect("/billing");
  }

  // Guard against double-subscribing: a Voice subscriber clicking "Get
  // Premium" on /pricing (or vice versa) lands here with tier !== plan and,
  // without this check, would get a brand-new Dodo checkout session --
  // creating a SECOND live subscription on top of the one they already have,
  // rather than changing the existing one. Dodo would then bill both until
  // someone manually cancels one. There's no in-app plan-change flow yet, so
  // the safe move is to refuse and send them to /billing to cancel the old
  // plan first, not to silently double-subscribe them.
  if (tier === "voice" || tier === "premium") {
    const { data: profile } = await admin
      .from("profiles")
      .select("dodo_subscription_id, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.dodo_subscription_id && isGoodStanding(profile.subscription_status)) {
      redirect(
        `/billing?checkout_error=${encodeURIComponent(
          "You already have an active subscription. Cancel it from Billing before switching plans, or contact support to change plans without a gap in access."
        )}`
      );
    }
  }

  const result = await createSubscriptionCheckoutSession({
    userId: user.id,
    email: user.email,
    plan,
  });
  if (!result.ok) {
    redirect(`/pricing?checkout_error=${encodeURIComponent(result.error)}`);
  }
  redirect(result.checkoutUrl);
}

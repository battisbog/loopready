import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app-nav";
import { Badge, Card, PageShell } from "@/components/ui";
import { PRICING, planId } from "@/lib/pricing";
import { VIDEO_PACK_CREDITS, getUserTier } from "@/lib/tiers";
import { paypalConfigured } from "@/lib/paypal/client";
import CheckoutButtons from "./checkout-buttons";

export const metadata = { title: "Checkout" };

type Purchase =
  | { kind: "subscription"; plan: "voice" | "premium"; title: string; price: string; blurb: string; features: string[] }
  | { kind: "order"; product: "video-pack"; title: string; price: string; blurb: string; features: string[] };

function resolve(searchPlan?: string, searchProduct?: string): Purchase {
  if (searchProduct === "video-pack") {
    return {
      kind: "order",
      product: "video-pack",
      title: "Video interview credits",
      price: PRICING.videoPack.display,
      blurb: `A one-time pack of ${VIDEO_PACK_CREDITS} video interviews. Credits never expire.`,
      features: [
        `${VIDEO_PACK_CREDITS} video interviews`,
        "Added on top of any plan credits",
        "One-time payment, no subscription",
      ],
    };
  }
  if (searchPlan === "premium") {
    return {
      kind: "subscription",
      plan: "premium",
      title: "Premium",
      price: PRICING.premium.displayWithInterval,
      blurb: "Everything in Voice, plus video interviews each month.",
      features: [
        "Unlimited voice interviews",
        "All rounds: behavioral, coding, system design",
        "Video interviews included each cycle",
        "Cancel anytime",
      ],
    };
  }
  return {
    kind: "subscription",
    plan: "voice",
    title: "Voice",
    price: PRICING.voice.displayWithInterval,
    blurb: "Unlimited practice across the whole loop, in a natural voice.",
    features: [
      "Unlimited voice interviews",
      "All rounds: behavioral, coding, system design",
      "Company and level calibration",
      "Cancel anytime",
    ],
  };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; product?: string; cancelled?: string }>;
}) {
  const { plan, product, cancelled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Payment needs an account to attach to, so sign in first and come back.
  if (!user) {
    const target = encodeURIComponent(
      `/checkout?${product ? `product=${product}` : `plan=${plan ?? "voice"}`}`
    );
    redirect(`/login?next=${target}`);
  }

  const purchase = resolve(plan, product);
  const admin = createAdminClient();
  const tier = await getUserTier(admin, user.id);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const configured =
    paypalConfigured() &&
    Boolean(clientId) &&
    (purchase.kind === "order" || Boolean(planId(purchase.plan)));

  const alreadyOnPlan =
    purchase.kind === "subscription" && tier === purchase.plan;

  return (
    <>
      <AppNav email={user.email} />
      <PageShell width="sm" title="Checkout">
        {cancelled && (
          <Card className="mb-4 border-warn/30 bg-warn-muted">
            <p className="text-sm text-warn">
              Payment cancelled. Nothing was charged.
            </p>
          </Card>
        )}

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-primary">
                {purchase.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                {purchase.blurb}
              </p>
            </div>
            <Badge tone="accent">{purchase.price}</Badge>
          </div>

          <ul className="mt-5 space-y-2">
            {purchase.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                <span className="mt-0.5 text-accent">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-line pt-6">
            {alreadyOnPlan ? (
              <div className="text-center">
                <p className="text-sm text-primary">
                  You&rsquo;re already on {purchase.title}.
                </p>
                <Link
                  href="/billing"
                  className="mt-2 inline-block text-sm text-accent hover:underline"
                >
                  Manage your plan
                </Link>
              </div>
            ) : !configured ? (
              <div className="text-center">
                <p className="text-sm text-warn">
                  Payments are not configured on this environment yet.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-2 inline-block text-sm text-accent hover:underline"
                >
                  Back to dashboard
                </Link>
              </div>
            ) : (
              <CheckoutButtons
                clientId={clientId!}
                purchase={
                  purchase.kind === "subscription"
                    ? { kind: "subscription", plan: purchase.plan }
                    : { kind: "order", product: purchase.product }
                }
              />
            )}
          </div>
        </Card>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          Payments are processed by PayPal. You can pay with a PayPal balance or
          a debit/credit card. By continuing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-secondary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-secondary">
            Privacy Policy
          </Link>
          .
        </p>
      </PageShell>
    </>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app-nav";
import { Badge, Card, PageShell } from "@/components/ui";
import { PRICING, planId } from "@/lib/pricing";
import { VIDEO_PACK_CREDITS, getUserTier } from "@/lib/tiers";
import { paypalConfigured } from "@/lib/paypal/client";
import SubscriptionCheckout from "./subscription-checkout";
import VideoPackCheckout from "./video-pack-checkout";

export const metadata = { title: "Checkout" };

interface PurchaseBase {
  title: string;
  /** Headline price, with cadence where there is one. */
  price: string;
  /** Charged now. Same number, without "/mo", so the total reads honestly. */
  dueToday: string;
  /** What happens after this payment. */
  terms: string;
  blurb: string;
  features: string[];
}

type Purchase =
  | ({ kind: "subscription"; plan: "voice" | "premium" } & PurchaseBase)
  | ({ kind: "order"; product: "video-pack" } & PurchaseBase);

function resolve(searchPlan?: string, searchProduct?: string): Purchase {
  if (searchProduct === "video-pack") {
    return {
      kind: "order",
      product: "video-pack",
      title: "Video interview credits",
      price: PRICING.videoPack.display,
      dueToday: PRICING.videoPack.display,
      terms: "One-time payment. Credits never expire and do not renew.",
      blurb: `A one-time video interview credit, priced at cost. Credits never expire.`,
      features: [
        "1 video interview",
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
      dueToday: PRICING.premium.display,
      terms: `Then ${PRICING.premium.displayWithInterval}, billed monthly. Cancel anytime.`,
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
    dueToday: PRICING.voice.display,
    terms: `Then ${PRICING.voice.displayWithInterval}, billed monthly. Cancel anytime.`,
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

  const isSubscription = purchase.kind === "subscription";

  return (
    <>
      <AppNav email={user.email} />
      <PageShell width="md">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-secondary"
        >
          <span aria-hidden>&larr;</span> Back to plans
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
          Complete your purchase
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary">
          {isSubscription
            ? `You're subscribing to ${purchase.title}. You can cancel at any time from Billing.`
            : `You're buying ${purchase.title}.`}
        </p>

        {cancelled && (
          <Card tone="warn" className="mt-6">
            <p className="text-sm font-medium text-warn">
              Payment cancelled — nothing was charged.
            </p>
            <p className="mt-1 text-sm text-secondary">
              Your card was never billed. You can try again below.
            </p>
          </Card>
        )}

        {/* Summary left, payment right: the thing being bought stays visible
            while the payment panel does its work. Video pack is its own
            client component -- it has a quantity stepper, so its price,
            credit count, and PayPal order all need to react to a client-side
            state that a single fixed purchase.dueToday can't express. */}
        {purchase.kind === "order" ? (
          <VideoPackCheckout
            clientId={clientId ?? ""}
            configured={configured}
            unitPrice={PRICING.videoPack.amount}
            creditsPerPack={VIDEO_PACK_CREDITS}
          />
        ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Order summary
            </p>

            <div className="mt-4 flex items-start justify-between gap-4">
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

            <ul className="mt-5 space-y-2.5">
              {purchase.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-secondary"
                >
                  <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                    &#10003;
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* The number actually being charged today, stated plainly. */}
            <div className="mt-6 space-y-2 border-t border-line pt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-secondary">{purchase.title}</span>
                <span className="font-mono text-secondary">
                  {purchase.dueToday}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm font-medium text-primary">
                  Due today
                </span>
                <span className="font-mono text-xl font-semibold text-primary">
                  {purchase.dueToday}
                </span>
              </div>
              <p className="pt-1 text-xs leading-relaxed text-muted">
                {purchase.terms}
              </p>
            </div>
          </Card>

          <div className="lg:sticky lg:top-8">
            <Card>
              {alreadyOnPlan ? (
                <div className="py-2 text-center">
                  <p className="text-sm font-medium text-primary">
                    You&rsquo;re already on {purchase.title}.
                  </p>
                  <p className="mt-1.5 text-sm text-secondary">
                    There&rsquo;s nothing to pay.
                  </p>
                  <Link
                    href="/billing"
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    Manage your plan
                  </Link>
                </div>
              ) : !configured ? (
                <div className="py-2 text-center">
                  <p className="text-sm font-medium text-warn">
                    Payments aren&rsquo;t configured on this environment yet.
                  </p>
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-block text-sm text-accent hover:underline"
                  >
                    Back to dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-primary">
                    Pay with PayPal
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Use a PayPal balance or any debit or credit card.
                  </p>
                  <div className="mt-4">
                    {/* This branch only ever renders for a subscription now --
                        video-pack has its own component (VideoPackCheckout)
                        with a quantity stepper, rendered above instead of
                        this shared grid. */}
                    <SubscriptionCheckout
                      plan={purchase.plan}
                      clientId={clientId!}
                      regularPrice={PRICING[purchase.plan].amount}
                    />
                  </div>
                </>
              )}
            </Card>

            <ul className="mt-4 space-y-2.5 px-1">
              {[
                "Card details go to PayPal, never to LoopReady",
                isSubscription
                  ? "Cancel anytime. Access runs to the end of the period you paid for"
                  : "Credits are added to your account immediately",
                "Access unlocks the moment payment clears",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2.5 text-xs leading-relaxed text-muted"
                >
                  <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
                    &#10003;
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-muted">
          By continuing you agree to our{" "}
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

import Link from "next/link";

const PLAN_COPY: Record<string, { name: string; price: string; blurb: string }> = {
  voice: {
    name: "Voice",
    price: "$19/mo",
    blurb:
      "Unlimited voice mocks across behavioral, coding, and system design, with the studio interviewer voice.",
  },
  premium: {
    name: "Premium",
    price: "$69/mo",
    blurb:
      "Everything in Voice, plus video-avatar interviews the moment they ship.",
  },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const chosen = plan ? PLAN_COPY[plan] : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]"
      />
      <div className="relative w-full max-w-md text-center">
        <Link
          href="/pricing"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Back to pricing
        </Link>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            Checkout not open yet
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {chosen ? `${chosen.name} · ${chosen.price}` : "Paid plans"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {chosen?.blurb ??
              "Paid plans are not open for purchase yet."}
          </p>

          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            LoopReady is in early access, so every round is free while the
            interview quality is being tuned with real candidates. Create an
            account and use it now. You&rsquo;ll be first to hear when this plan
            opens.
          </p>

          <Link
            href="/login"
            className="mt-7 block rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            Start practising free
          </Link>

          <Link
            href="/"
            className="mt-3 block text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Back to home
          </Link>

          <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">
            Purchases are subject to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-400">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-zinc-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

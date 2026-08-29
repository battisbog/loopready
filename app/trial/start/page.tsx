import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startSession } from "@/lib/interview/start";
import { videoAvailable } from "@/lib/video/config";
import { hasUsedTrial } from "@/lib/rate-limit";
import { consumeTrialSlot, TRIAL_CAPACITY_MESSAGE } from "@/lib/trial";
import { Button, PageShell } from "@/components/ui";
import DemoVideoModal from "@/app/(marketing)/demo-video-modal";

export const metadata = { title: "Starting your trial" };

/**
 * Landing spot for the homepage "Try it free" CTA, both before and after
 * auth: the button always points here (`/login?next=/trial/start` when
 * signed out, straight here when already signed in), so this one route
 * handles "not authenticated yet" (redirect into login, which returns here
 * via `next`) and "just authenticated, create the trial" without the caller
 * needing to know which case applies.
 *
 * No UI of its own on the success path -- it creates the session and
 * redirects straight into it, skipping the dashboard and the start-interview
 * config screen entirely, per the brief. The two failure paths (video not
 * configured, platform at capacity) render a real degraded screen instead of
 * a broken session.
 */
export default async function TrialStartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trial/start");

  const admin = createAdminClient();

  if (!videoAvailable()) {
    return (
      <CapacityScreen message="Live video trials aren't available on this environment right now." />
    );
  }

  // Once ever per account -- see hasUsedTrial's own comment on why this is
  // scoped to trial_capped sessions specifically, not "any session ever".
  if (await hasUsedTrial(admin, user.id)) {
    redirect("/pricing");
  }

  const slot = await consumeTrialSlot(admin);
  if (!slot.allowed) {
    return <CapacityScreen message={TRIAL_CAPACITY_MESSAGE} />;
  }

  // Sensible default: company-agnostic, mid-level, one behavioral round.
  // Deliberately not configurable here -- the whole point is skipping the
  // start-interview config screen for this specific flow.
  const started = await startSession({
    admin,
    userId: user.id,
    roundType: "behavioral",
    company: "generic",
    level: "mid",
    trialCapped: true,
  });

  redirect(`/session/${started.sessionId}?mode=video`);
}

function CapacityScreen({ message }: { message: string }) {
  return (
    <PageShell width="sm" className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        We&rsquo;re at capacity for live trials right now
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
        {message}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <DemoVideoModal ctaHref="/pricing" ctaLabel="Explore plans" />
        <Button href="/pricing" size="lg">
          Explore plans
        </Button>
      </div>
    </PageShell>
  );
}

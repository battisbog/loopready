import { PREMIUM_VIDEO_ALLOWANCE } from "@/lib/tiers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app-nav";
import {
  Badge,
  Button,
  Card,
  CardLabel,
  CardStat,
  PageShell,
  Section,
  SIGNAL_TONE,
} from "@/components/ui";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { FREE_DAILY_SESSIONS } from "@/lib/rate-limit";

const PLAN_COPY: Record<string, { label: string; blurb: string }> = {
  free: {
    label: "Free",
    blurb: `${FREE_DAILY_SESSIONS} behavioral mocks a day, with the full written debrief.`,
  },
  voice: {
    label: "Voice",
    blurb: "Unlimited interviews across behavioral, coding and system design.",
  },
  premium: {
    label: "Premium",
    blurb: `Everything in Voice, plus ${PREMIUM_VIDEO_ALLOWANCE} video-avatar interviews a month.`,
  },
  unlimited: {
    label: "Unlimited",
    blurb: "No daily cap on this account.",
  },
};

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, started_at, status, round_type, loops(company, level), feedback(overall_signal)"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const { data: loops } = await admin
    .from("loops")
    .select("id, company, level, rounds, status, overall_signal, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Single-round loops have nothing extra to say; their round debrief is it.
  const fullLoops = (loops ?? []).filter((l) => (l.rounds?.length ?? 0) > 1);

  const rows = sessions ?? [];
  const plan = profile?.plan ?? "free";
  const planCopy = PLAN_COPY[plan] ?? PLAN_COPY.free;

  const signalOf = (s: (typeof rows)[number]) => {
    const fb = Array.isArray(s.feedback) ? s.feedback[0] : s.feedback;
    return fb?.overall_signal as string | undefined;
  };

  const byRound = rows.reduce<Record<string, number>>((acc, s) => {
    acc[s.round_type] = (acc[s.round_type] ?? 0) + 1;
    return acc;
  }, {});

  const latestSignal = rows.map(signalOf).find(Boolean);
  const completed = rows.filter((s) => s.status === "completed").length;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <>
      <AppNav email={user.email} />
      <PageShell
        width="lg"
        title={`Welcome back, ${firstName}`}
        description="Run a mock, then read the debrief like a real interviewer would write it."
        actions={
          <Button href="/start" size="lg">
            Start new interview
          </Button>
        }
      >
        {/* Stats */}
        <Section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardLabel>Interviews</CardLabel>
              <CardStat
                value={rows.length}
                hint={`${completed} completed`}
              />
            </Card>

            <Card>
              <CardLabel>By round</CardLabel>
              <div className="mt-3 space-y-1.5">
                {(["coding", "system_design", "behavioral"] as RoundType[]).map(
                  (r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-secondary">{ROUND_LABEL[r]}</span>
                      <span className="font-medium text-primary">
                        {byRound[r] ?? 0}
                      </span>
                    </div>
                  )
                )}
              </div>
            </Card>

            <Card>
              <CardLabel>Latest signal</CardLabel>
              <div className="mt-3">
                {latestSignal ? (
                  <Badge tone={SIGNAL_TONE[latestSignal] ?? "neutral"} dot>
                    {latestSignal}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted">No feedback yet</p>
                )}
              </div>
            </Card>

            <Card accent={plan !== "free"}>
              <CardLabel>Plan</CardLabel>
              <div className="mt-3">
                <Badge tone={plan === "free" ? "neutral" : "accent"}>
                  {planCopy.label}
                </Badge>
              </div>
            </Card>
          </div>
        </Section>

        {/* Full loops */}
        {fullLoops.length > 0 && (
          <Section title="Full loops">
            <div className="space-y-2">
              {fullLoops.map((l) => {
                const profileFor = COMPANY_PROFILES[l.company];
                const levelLabel =
                  profileFor?.levels[l.level]?.label ?? l.level;
                return (
                  <Card
                    key={l.id}
                    href={`/loop/${l.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {profileFor?.displayName ?? l.company} · {levelLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {l.rounds.length} rounds ·{" "}
                        {new Date(l.created_at).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    {l.overall_signal ? (
                      <Badge tone={SIGNAL_TONE[l.overall_signal] ?? "neutral"}>
                        {l.overall_signal}
                      </Badge>
                    ) : (
                      <Badge tone={l.status === "active" ? "accent" : "outline"}>
                        {l.status === "active" ? "In progress" : "View verdict"}
                      </Badge>
                    )}
                  </Card>
                );
              })}
            </div>
          </Section>
        )}

        {/* Recent sessions */}
        <Section
          title="Recent sessions"
          actions={
            rows.length > 0 && (
              <span className="text-xs text-muted">
                {rows.length} shown
              </span>
            )
          }
        >
          {rows.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm font-medium text-primary">
                No interviews yet
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-secondary">
                Pick a company and level, answer three questions out loud, and
                get a debrief that tells you where you&rsquo;d get dinged.
              </p>
              <div className="mt-5 flex justify-center">
                <Button href="/start">Start your first interview</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {rows.map((s) => {
                const signal = signalOf(s);
                const loop = Array.isArray(s.loops) ? s.loops[0] : s.loops;
                const company = loop ? COMPANY_PROFILES[loop.company] : null;
                const level = company?.levels[loop!.level]?.label ?? loop?.level;

                return (
                  <Card
                    key={s.id}
                    href={
                      signal
                        ? `/session/${s.id}/feedback`
                        : `/session/${s.id}`
                    }
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {company
                          ? `${company.displayName} · ${level}`
                          : "Practice interview"}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>
                          {ROUND_LABEL[s.round_type as RoundType] ??
                            s.round_type}
                        </span>
                        <span aria-hidden>·</span>
                        <time dateTime={s.started_at}>
                          {new Date(s.started_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </time>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {signal ? (
                        <Badge tone={SIGNAL_TONE[signal] ?? "neutral"}>
                          {signal}
                        </Badge>
                      ) : (
                        <Badge tone={s.status === "active" ? "accent" : "outline"}>
                          {s.status === "active" ? "In progress" : s.status}
                        </Badge>
                      )}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="h-4 w-4 text-muted"
                        aria-hidden
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        {/* Plan */}
        <Section title="Your plan">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone={plan === "free" ? "neutral" : "accent"}>
                  {planCopy.label}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {planCopy.blurb}
              </p>
            </div>
            <Button
              href={plan === "free" ? "/pricing" : "/billing"}
              variant="secondary"
            >
              {plan === "free" ? "Upgrade" : "Manage plan"}
            </Button>
          </Card>
        </Section>
      </PageShell>
    </>
  );
}

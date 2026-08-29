import Link from "next/link";
import { cn } from "@/lib/cn";
import { PREMIUM_VIDEO_ALLOWANCE } from "@/lib/tiers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Button, PageShell, Section, SIGNAL_TONE } from "@/components/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { FREE_SESSION_LIMIT, FREE_SESSION_WINDOW_DAYS } from "@/lib/rate-limit";
import { getEntitlements } from "@/lib/tiers";
import {
  ListChecks,
  Layers,
  Target,
  Crown,
  Trophy,
  History,
  ChevronRight,
} from "lucide-react";

const PLAN_COPY: Record<string, { label: string; blurb: string }> = {
  free: {
    label: "Free",
    blurb: `${FREE_SESSION_LIMIT} mock every ${FREE_SESSION_WINDOW_DAYS} days, any round, voice only, with the full written debrief.`,
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

/** Small bordered header shared by every stat card: icon + label, like the
 *  reference block's CardHeader (icon, CardTitle, border-b) construction. */
function StatHeader({
  icon: Icon,
  label,
}: {
  icon: typeof ListChecks;
  label: string;
}) {
  return (
    <CardHeader className="border-b border-border">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-muted-foreground" />
        <CardTitle className="text-sm font-medium text-foreground">
          {label}
        </CardTitle>
      </div>
    </CardHeader>
  );
}

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

  // subscription_tier is the canonical entitlement column; profiles.plan is
  // dead (see lib/rate-limit.ts). Reading it here would show every paying
  // subscriber as "Free".
  const ent = await getEntitlements(admin, user.id);

  const { data: loops } = await admin
    .from("loops")
    .select("id, company, level, rounds, status, overall_signal, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Single-round loops have nothing extra to say; their round debrief is it.
  const fullLoops = (loops ?? []).filter((l) => (l.rounds?.length ?? 0) > 1);

  const rows = sessions ?? [];
  const plan = ent.tier;
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
          <Card className="gap-0 py-0">
            <StatHeader icon={ListChecks} label="Interviews" />
            <CardContent className="py-5">
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                <AnimatedNumber value={rows.length} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {completed} completed
              </p>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <StatHeader icon={Layers} label="By round" />
            <CardContent className="space-y-1.5 py-5">
              {(["coding", "system_design", "behavioral"] as RoundType[]).map(
                (r) => (
                  <div
                    key={r}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {ROUND_LABEL[r]}
                    </span>
                    <span className="font-medium text-foreground">
                      <AnimatedNumber value={byRound[r] ?? 0} />
                    </span>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <StatHeader icon={Target} label="Latest signal" />
            <CardContent className="py-5">
              {latestSignal ? (
                <Badge tone={SIGNAL_TONE[latestSignal] ?? "neutral"} dot>
                  {latestSignal}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No feedback yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "gap-0 py-0",
              plan !== "free" && "border-accent-border bg-accent-muted"
            )}
          >
            <StatHeader icon={Crown} label="Plan" />
            <CardContent className="py-5">
              <Badge tone={plan === "free" ? "neutral" : "accent"}>
                {planCopy.label}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Full loops */}
      {fullLoops.length > 0 && (
        <Section title="Full loops">
          <div className="space-y-2">
            {fullLoops.map((l) => {
              const profileFor = COMPANY_PROFILES[l.company];
              const levelLabel = profileFor?.levels[l.level]?.label ?? l.level;
              return (
                <Link key={l.id} href={`/loop/${l.id}`} className="block">
                  <Card className="flex-row flex-wrap items-center justify-between gap-3 px-5 py-4 shadow-sm transition-colors hover:bg-accent/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {profileFor?.displayName ?? l.company} · {levelLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
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
                </Link>
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
            <span className="text-xs text-muted-foreground">
              {rows.length} shown
            </span>
          )
        }
      >
        {rows.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <p className="text-sm font-medium text-foreground">
                No interviews yet
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Pick a company and level, answer three questions out loud, and
                get a debrief that tells you where you&rsquo;d get dinged.
              </p>
              <div className="mt-5 flex justify-center">
                <Button href="/start">Start your first interview</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-4">
              <History size={16} className="text-foreground" />
              <CardTitle className="text-sm font-medium text-foreground">
                Session history
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4">Company &amp; level</TableHead>
                    <TableHead className="px-4">Round</TableHead>
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead className="px-4 text-right">Verdict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => {
                    const signal = signalOf(s);
                    const loop = Array.isArray(s.loops) ? s.loops[0] : s.loops;
                    const company = loop ? COMPANY_PROFILES[loop.company] : null;
                    const level =
                      company?.levels[loop!.level]?.label ?? loop?.level;
                    const href = signal
                      ? `/session/${s.id}/feedback`
                      : `/session/${s.id}`;

                    return (
                      <TableRow key={s.id}>
                        <TableCell className="px-4">
                          <span className="font-medium text-foreground">
                            {company
                              ? `${company.displayName} · ${level}`
                              : "Practice interview"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          {ROUND_LABEL[s.round_type as RoundType] ??
                            s.round_type}
                        </TableCell>
                        <TableCell className="px-4 text-muted-foreground">
                          <time dateTime={s.started_at}>
                            {new Date(s.started_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </time>
                        </TableCell>
                        <TableCell className="px-4">
                          <Link
                            href={href}
                            className="flex items-center justify-end gap-1.5 whitespace-nowrap"
                          >
                            {signal ? (
                              <Badge tone={SIGNAL_TONE[signal] ?? "neutral"}>
                                {signal}
                              </Badge>
                            ) : (
                              <Badge
                                tone={s.status === "active" ? "accent" : "outline"}
                              >
                                {s.status === "active" ? "In progress" : s.status}
                              </Badge>
                            )}
                            <ChevronRight
                              size={14}
                              className="text-muted-foreground"
                            />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* Plan */}
      <Section title="Your plan">
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-4">
            <Trophy size={16} className="text-foreground" />
            <CardTitle className="text-sm font-medium text-foreground">
              Your plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="min-w-0">
              <Badge tone={plan === "free" ? "neutral" : "accent"}>
                {planCopy.label}
              </Badge>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {planCopy.blurb}
              </p>
            </div>
            <Button
              href={plan === "free" ? "/pricing" : "/billing"}
              variant="secondary"
            >
              {plan === "free" ? "Upgrade" : "Manage plan"}
            </Button>
          </CardContent>
        </Card>
      </Section>
    </PageShell>
  );
}

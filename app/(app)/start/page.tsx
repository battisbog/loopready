"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
import Link from "next/link";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import LoopBuilder from "./loop-builder";
import { planCost, type PlannedRound } from "@/lib/interview/loop-plan";
import { Button } from "@/components/ui";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/shadcn/toggle-group";

// "generic" leads and is the default: most people practising are not targeting
// one named company, and burying the company-agnostic option last implied you
// had to pick a FAANG to get started.
const DEFAULT_COMPANY = "generic";

const COMPANY_KEYS = [
  "generic",
  "amazon",
  "google",
  "meta",
  "microsoft",
  "apple",
  "netflix",
];

export default function StartPage() {
  const router = useRouter();
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  // Derived from the default company, never hardcoded. Pinning a literal level
  // key here is how changing the default company to "generic" started
  // prerendering /start against a level that company does not have.
  const [level, setLevel] = useState(
    () => Object.keys(COMPANY_PROFILES[DEFAULT_COMPANY].levels)[0]
  );
  // Deliberately empty: nothing is preselected, so the rounds a candidate
  // runs are always ones they chose. A prefilled "1 behavioral, voice" is easy
  // to start without noticing, which is how someone ends up practising a round
  // they did not mean to. The Start button stays disabled until something is
  // picked, and the submit handler guards it too.
  const [plan, setPlan] = useState<PlannedRound[]>([]);
  const [credits, setCredits] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = COMPANY_PROFILES[company];
  const levelKeys = useMemo(() => Object.keys(profile.levels), [profile]);

  function pickCompany(key: string) {
    setCompany(key);
    setLevel(Object.keys(COMPANY_PROFILES[key].levels)[0]);
  }



  // Credits drive the "you have M" line and the block; the server re-checks.
  useEffect(() => {
    if (!VIDEO_ENABLED_CLIENT) return;
    fetch("/api/account/entitlements")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCredits(Number(d.videoCreditsRemaining ?? 0)))
      .catch(() => {});
  }, []);

  const cost = planCost(plan);

  async function start() {
    if (plan.length === 0) return setError("Pick at least one round.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          level,
          rounds: plan, // order and per-round mode as configured
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      router.push(
        `/session/${data.sessionId}${data.mode === "video" ? "?mode=video" : ""}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-xs text-muted transition-colors hover:text-secondary"
        >
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          Configure your interview
        </h1>
      </div>

      <Section title="Target company">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={company}
          onValueChange={(v) => v && pickCompany(v)}
          className="grid w-full grid-cols-2 sm:grid-cols-4"
        >
          {COMPANY_KEYS.map((key) => (
            <ToggleGroupItem
              key={key}
              value={key}
              className="h-auto w-full rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              {COMPANY_PROFILES[key].displayName}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {/* Company blurbs vary a lot in length (Amazon's first sentence runs
            ~110 chars, "generic"'s is ~30) -- at this container width some
            wrapped to a second line and some didn't, so switching company
            shifted every section below this one. truncate pins it to one
            line always, so the page height never moves on company change. */}
        <p className="mt-3 truncate text-xs leading-relaxed text-muted">
          {profile.behavioralStyle.split(".")[0]}.
        </p>
      </Section>

      <Section title="Target level">
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={2}
          value={level}
          onValueChange={(v) => v && setLevel(v)}
          className="grid w-full grid-cols-1 sm:grid-cols-3"
        >
          {levelKeys.map((key) => (
            <ToggleGroupItem
              key={key}
              value={key}
              className="h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5"
            >
              <span className="text-sm font-medium">
                {profile.levels[key].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {profile.levels[key].tier} bar
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Section>

      <Section title="Rounds">
        <LoopBuilder
          plan={plan}
          setPlan={setPlan}
          videoEnabled={VIDEO_ENABLED_CLIENT}
          credits={credits}
        />
      </Section>

      <div className="mt-10">
        {error && <p className="mb-3 text-sm text-error">{error}</p>}
        <Button
          onClick={start}
          disabled={busy || plan.length === 0 || cost.creditsNeeded > credits}
          size="lg"
          fullWidth
        >
          {busy
            ? "Starting…"
            : `Start ${profile.displayName} ${profile.levels[level]?.label ?? ""} interview`.replace(/\s+/g, " ")}
        </Button>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}

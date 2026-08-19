"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VIDEO_ENABLED_CLIENT } from "@/lib/video/config";
import Link from "next/link";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { ROUND_IMPLEMENTED, ROUND_LABEL, ROUND_TYPES, type RoundType } from "@/lib/interview/rounds";

const COMPANY_KEYS = [
  "amazon",
  "google",
  "meta",
  "microsoft",
  "apple",
  "netflix",
  "generic",
];

export default function StartPage() {
  const router = useRouter();
  const [company, setCompany] = useState("amazon");
  const [level, setLevel] = useState("sde2");
  const [rounds, setRounds] = useState<RoundType[]>(["behavioral"]);
  // Voice unless the candidate opts into video, and only when video is on.
  const [mode, setMode] = useState<"voice" | "video">("voice");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = COMPANY_PROFILES[company];
  const levelKeys = useMemo(() => Object.keys(profile.levels), [profile]);

  function pickCompany(key: string) {
    setCompany(key);
    setLevel(Object.keys(COMPANY_PROFILES[key].levels)[0]);
  }

  function toggleRound(r: RoundType) {
    setRounds((cur) =>
      cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]
    );
  }

  function selectFullLoop() {
    setRounds(ROUND_TYPES.filter((r) => ROUND_IMPLEMENTED[r]));
  }

  async function start() {
    if (rounds.length === 0) return setError("Pick at least one round.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          level,
          rounds: ROUND_TYPES.filter((r) => rounds.includes(r)), // canonical order
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
      router.push(
        `/session/${data.sessionId}${mode === "video" ? "?mode=video" : ""}`
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPANY_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => pickCompany(key)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                company === key
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-line text-secondary hover:border-line-strong"
              }`}
            >
              {COMPANY_PROFILES[key].displayName}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {profile.behavioralStyle.split(".")[0]}.
        </p>
      </Section>

      <Section title="Target level">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {levelKeys.map((key) => (
            <button
              key={key}
              onClick={() => setLevel(key)}
              className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                level === key
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-line text-secondary hover:border-line-strong"
              }`}
            >
              <span className="font-medium">{profile.levels[key].label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {profile.levels[key].tier} bar
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Rounds">
        <div className="space-y-2">
          {ROUND_TYPES.map((r) => {
            const available = ROUND_IMPLEMENTED[r];
            const selected = rounds.includes(r);
            return (
              <button
                key={r}
                disabled={!available}
                onClick={() => toggleRound(r)}
                className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-line text-secondary hover:border-line-strong"
                }`}
              >
                <span className="font-medium">{ROUND_LABEL[r]}</span>
                <span className="text-xs text-muted">
                  {available ? (selected ? "Selected" : "Add") : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={selectFullLoop}
          className="mt-3 text-xs text-muted underline-offset-2 hover:text-secondary hover:underline"
        >
          Select full loop (all available rounds)
        </button>
      </Section>

      {VIDEO_ENABLED_CLIENT && (
        <Section title="Interviewer">
          <div className="grid grid-cols-2 gap-2">
            {(["voice", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                  mode === m
                    ? "border-accent-border bg-accent-muted text-accent"
                    : "border-line text-secondary hover:border-line-strong"
                }`}
              >
                {m === "voice" ? "Voice" : "Video avatar"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {mode === "video"
              ? "Uses one video credit, charged only after five minutes."
              : "Unlimited on your plan."}
          </p>
        </Section>
      )}

      <div className="mt-10">
        {error && <p className="mb-3 text-sm text-error">{error}</p>}
        <button
          onClick={start}
          disabled={busy}
          className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {busy
            ? "Starting…"
            : `Start ${profile.displayName} ${profile.levels[level].label} interview`}
        </button>
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

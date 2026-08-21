"use client";

import { Card } from "@/components/ui";
import {
  MAX_PER_ROUND_TYPE,
  MAX_ROUNDS_PER_LOOP,
  planCost,
  type PlannedRound,
  type RoundMode,
} from "@/lib/interview/loop-plan";
import {
  ROUND_IMPLEMENTED,
  ROUND_TYPES,
  type RoundType,
} from "@/lib/interview/rounds";

const LABEL: Record<string, string> = {
  behavioral: "Behavioral",
  coding: "Coding",
  system_design: "System design",
};

const BLURB: Record<string, string> = {
  behavioral: "Past situations, your specific actions and impact.",
  coding: "One problem, live, with the interviewer probing as you work.",
  system_design: "An open-ended design, whiteboarded on the canvas.",
};

/**
 * Loop builder.
 *
 * One row per round type: choose how many, and how each type is delivered.
 * There is no preset step, because "how many of each" IS the question a
 * candidate is actually asking, and routing that through named bundles only
 * adds a layer to click past.
 *
 * Mode is per round TYPE rather than per individual round. Wanting a video
 * behavioral and a voice coding round is a real preference; wanting your second
 * coding round to differ from your first is not.
 */
export default function LoopBuilder({
  plan,
  setPlan,
  videoEnabled,
  credits,
}: {
  plan: PlannedRound[];
  setPlan: (p: PlannedRound[]) => void;
  videoEnabled: boolean;
  credits: number;
}) {
  const cost = planCost(plan);
  const overBudget = cost.creditsNeeded > credits;
  const types = ROUND_TYPES.filter((t) => ROUND_IMPLEMENTED[t]);

  const countOf = (t: RoundType) => plan.filter((r) => r.roundType === t).length;
  const modeOf = (t: RoundType): RoundMode =>
    plan.find((r) => r.roundType === t)?.mode ?? "voice";

  /** Rebuilds in a stable type order so rows never jump as counts change. */
  function rebuild(counts: Map<RoundType, number>, modes: Map<RoundType, RoundMode>) {
    const next: PlannedRound[] = [];
    for (const t of types) {
      const n = counts.get(t) ?? 0;
      for (let i = 0; i < n; i++) {
        next.push({ roundType: t, mode: modes.get(t) ?? "voice" });
      }
    }
    setPlan(next.slice(0, MAX_ROUNDS_PER_LOOP));
  }

  function snapshot() {
    const counts = new Map<RoundType, number>();
    const modes = new Map<RoundType, RoundMode>();
    for (const t of types) {
      counts.set(t, countOf(t));
      modes.set(t, modeOf(t));
    }
    return { counts, modes };
  }

  function setCount(t: RoundType, next: number) {
    const { counts, modes } = snapshot();
    const others = types
      .filter((x) => x !== t)
      .reduce((sum, x) => sum + (counts.get(x) ?? 0), 0);
    // Clamped against the loop cap, so the total can never exceed it.
    counts.set(t, Math.max(0, Math.min(next, MAX_PER_ROUND_TYPE, MAX_ROUNDS_PER_LOOP - others)));
    rebuild(counts, modes);
  }

  function setMode(t: RoundType, mode: RoundMode) {
    const { counts, modes } = snapshot();
    modes.set(t, mode);
    // Choosing video for a type nobody selected is meaningless, so it also
    // adds a round rather than silently doing nothing.
    if ((counts.get(t) ?? 0) === 0) counts.set(t, 1);
    rebuild(counts, modes);
  }

  return (
    <div className="space-y-3">
      {types.map((t) => {
        const n = countOf(t);
        const mode = modeOf(t);
        const atCap =
          plan.length >= MAX_ROUNDS_PER_LOOP || n >= MAX_PER_ROUND_TYPE;

        return (
          <Card key={t} compact tone={n > 0 ? "accent" : "default"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">{LABEL[t] ?? t}</p>
                <p className="mt-0.5 text-xs text-muted">{BLURB[t]}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`One fewer ${LABEL[t]} round`}
                  onClick={() => setCount(t, n - 1)}
                  disabled={n === 0}
                  className="h-8 w-8 rounded-md border border-line text-secondary transition-colors hover:border-line-strong hover:text-primary disabled:opacity-30"
                >
                  &minus;
                </button>
                <span
                  className={`w-6 text-center font-mono text-sm ${
                    n > 0 ? "text-primary" : "text-muted"
                  }`}
                >
                  {n}
                </span>
                <button
                  type="button"
                  aria-label={`One more ${LABEL[t]} round`}
                  onClick={() => setCount(t, n + 1)}
                  disabled={atCap}
                  className="h-8 w-8 rounded-md border border-line text-secondary transition-colors hover:border-line-strong hover:text-primary disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            {videoEnabled && n > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-xs text-muted">
                  {mode === "video"
                    ? `${n} credit${n === 1 ? "" : "s"}`
                    : "No credits used"}
                </span>
                <div className="flex gap-1">
                  {(["voice", "video"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(t, m)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                        mode === m
                          ? "border-accent-border bg-accent-muted text-accent"
                          : "border-line text-secondary hover:border-line-strong"
                      }`}
                    >
                      {m === "voice" ? "Voice" : "Video"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted">
          {plan.length === 0
            ? "Add at least one round."
            : `${plan.length} round${plan.length === 1 ? "" : "s"}, up to ${MAX_ROUNDS_PER_LOOP}.`}
        </p>
        <button
          type="button"
          onClick={() =>
            setPlan(types.map((t) => ({ roundType: t, mode: "voice" as RoundMode })))
          }
          className="text-xs text-muted underline-offset-2 hover:text-secondary hover:underline"
        >
          Full loop
        </button>
      </div>

      {videoEnabled && cost.creditsNeeded > 0 && (
        <Card compact tone={overBudget ? "error" : "accent"}>
          <p className="text-sm text-secondary">
            This loop will use{" "}
            <span className="font-medium text-primary">
              {cost.creditsNeeded} video credit{cost.creditsNeeded === 1 ? "" : "s"}
            </span>{" "}
            <span className="text-muted">(you have {credits})</span>
          </p>
          {overBudget && (
            <p className="mt-2 text-sm text-error">
              Switch {cost.creditsNeeded - credits} round
              {cost.creditsNeeded - credits === 1 ? "" : "s"} to voice, or{" "}
              <a href="/checkout?product=video-pack" className="underline">
                buy more credits
              </a>
              .
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

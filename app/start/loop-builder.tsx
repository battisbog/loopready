"use client";

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

/**
 * Loop builder.
 *
 * Kept to two decisions: how many of each round, and voice or video for the
 * whole loop. An earlier version put a mode toggle on every row, which tripled
 * the controls to serve a case almost nobody wants (a video behavioral next to
 * a voice coding round). The data model still stores mode per round, so mixing
 * stays possible later without another migration.
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
  const types = ROUND_TYPES.filter((t) => ROUND_IMPLEMENTED[t]);
  const mode: RoundMode = plan[0]?.mode ?? "voice";
  const cost = planCost(plan);
  const overBudget = cost.creditsNeeded > credits;

  const countOf = (t: RoundType) => plan.filter((r) => r.roundType === t).length;

  function rebuild(counts: Map<RoundType, number>, nextMode: RoundMode) {
    const next: PlannedRound[] = [];
    for (const t of types) {
      for (let i = 0; i < (counts.get(t) ?? 0); i++) {
        next.push({ roundType: t, mode: nextMode });
      }
    }
    setPlan(next.slice(0, MAX_ROUNDS_PER_LOOP));
  }

  function setCount(t: RoundType, next: number) {
    const counts = new Map(types.map((x) => [x, countOf(x)]));
    const others = types
      .filter((x) => x !== t)
      .reduce((sum, x) => sum + (counts.get(x) ?? 0), 0);
    counts.set(
      t,
      Math.max(0, Math.min(next, MAX_PER_ROUND_TYPE, MAX_ROUNDS_PER_LOOP - others))
    );
    rebuild(counts, mode);
  }

  return (
    <div className="space-y-1">
      {types.map((t) => {
        const n = countOf(t);
        const atCap = plan.length >= MAX_ROUNDS_PER_LOOP || n >= MAX_PER_ROUND_TYPE;
        return (
          <div
            key={t}
            className="flex items-center justify-between border-b border-line py-3 last:border-b-0"
          >
            <span className={`text-sm ${n > 0 ? "text-primary" : "text-secondary"}`}>
              {LABEL[t] ?? t}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`One fewer ${LABEL[t]} round`}
                onClick={() => setCount(t, n - 1)}
                disabled={n === 0}
                className="h-7 w-7 rounded-md text-secondary transition-colors hover:bg-elevated hover:text-primary disabled:opacity-25"
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
                className="h-7 w-7 rounded-md text-secondary transition-colors hover:bg-elevated hover:text-primary disabled:opacity-25"
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      {videoEnabled && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-secondary">Interviewer</span>
          <div className="flex gap-1">
            {(["voice", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  rebuild(new Map(types.map((x) => [x, countOf(x)])), m)
                }
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

      <p
        className={`pt-3 text-xs ${overBudget ? "text-error" : "text-muted"}`}
      >
        {plan.length === 0 ? (
          "Add at least one round."
        ) : overBudget ? (
          <>
            Needs {cost.creditsNeeded} video credits, you have {credits}.{" "}
            <a href="/checkout?product=video-pack" className="underline">
              Buy more
            </a>{" "}
            or switch to voice.
          </>
        ) : cost.creditsNeeded > 0 ? (
          <>
            {plan.length} video round{plan.length === 1 ? "" : "s"} &middot; uses{" "}
            {cost.creditsNeeded} of your {credits} credits
          </>
        ) : (
          <>
            {plan.length} round{plan.length === 1 ? "" : "s"} &middot; no credits used
          </>
        )}
      </p>
    </div>
  );
}

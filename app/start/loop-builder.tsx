"use client";

import { Card } from "@/components/ui";
import {
  MAX_PER_ROUND_TYPE,
  MAX_ROUNDS_PER_LOOP,
  PRESETS,
  planCost,
  type PlannedRound,
} from "@/lib/interview/loop-plan";
import { ROUND_IMPLEMENTED, ROUND_TYPES, type RoundType } from "@/lib/interview/rounds";

const LABEL: Record<string, string> = {
  behavioral: "Behavioral",
  coding: "Coding",
  system_design: "System design",
};

/**
 * Loop builder.
 *
 * Presets carry the common case: one click and start. The per-round controls
 * only appear under "Custom", because forcing a configuration screen on someone
 * who just wants to practise is how a practice tool stops getting used.
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

  const activePreset = PRESETS.find(
    (p) =>
      p.rounds.length === plan.length &&
      p.rounds.every((r, i) => plan[i]?.roundType === r) &&
      plan.every((r) => r.mode === "voice")
  );

  function countOf(t: RoundType) {
    return plan.filter((r) => r.roundType === t).length;
  }

  function setCount(t: RoundType, next: number) {
    const others = plan.filter((r) => r.roundType !== t);
    const mine = plan.filter((r) => r.roundType === t).slice(0, next);
    while (mine.length < next) mine.push({ roundType: t, mode: "voice" });
    // Rebuild in a stable order so the list does not jump around as counts change.
    const rebuilt: PlannedRound[] = [];
    for (const rt of ROUND_TYPES) {
      rebuilt.push(...(rt === t ? mine : others.filter((o) => o.roundType === rt)));
    }
    setPlan(rebuilt.slice(0, MAX_ROUNDS_PER_LOOP));
  }

  function setMode(index: number, mode: "voice" | "video") {
    setPlan(plan.map((r, i) => (i === index ? { ...r, mode } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlan(p.rounds.map((r) => ({ roundType: r, mode: "voice" })))}
            className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
              activePreset?.id === p.id
                ? "border-accent-border bg-accent-muted"
                : "border-line hover:border-line-strong"
            }`}
          >
            <span className="block text-sm font-medium text-primary">{p.label}</span>
            <span className="mt-0.5 block text-xs text-muted">{p.description}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPlan(plan.length ? plan : [{ roundType: "behavioral", mode: "voice" }])}
          className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
            !activePreset ? "border-accent-border bg-accent-muted" : "border-line hover:border-line-strong"
          }`}
        >
          <span className="block text-sm font-medium text-primary">Custom</span>
          <span className="mt-0.5 block text-xs text-muted">
            Choose how many of each, and voice or video per round.
          </span>
        </button>
      </div>

      {!activePreset && (
        <Card compact>
          <div className="space-y-3">
            {ROUND_TYPES.filter((t) => ROUND_IMPLEMENTED[t]).map((t) => (
              <div key={t} className="flex items-center justify-between">
                <span className="text-sm text-secondary">{LABEL[t] ?? t}</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].slice(0, MAX_PER_ROUND_TYPE + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(t, n)}
                      className={`h-8 w-8 rounded-md border text-sm transition-colors ${
                        countOf(t) === n
                          ? "border-accent-border bg-accent-muted text-accent"
                          : "border-line text-secondary hover:border-line-strong"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {videoEnabled && plan.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-xs text-muted">
                Every round is voice unless you choose video.
              </p>
              <div className="space-y-2">
                {plan.map((r, i) => (
                  <div key={`${r.roundType}-${i}`} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-secondary">
                      {i + 1}. {LABEL[r.roundType] ?? r.roundType}
                    </span>
                    <div className="flex gap-1">
                      {(["voice", "video"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(i, m)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            r.mode === m
                              ? "border-accent-border bg-accent-muted text-accent"
                              : "border-line text-secondary hover:border-line-strong"
                          }`}
                        >
                          {m === "voice" ? "Voice" : "Video"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {videoEnabled && (
        <Card compact tone={overBudget ? "error" : cost.creditsNeeded > 0 ? "accent" : "default"}>
          <p className="text-sm text-secondary">
            {cost.creditsNeeded === 0 ? (
              <>
                All {cost.totalRounds || 0} round{cost.totalRounds === 1 ? "" : "s"} are voice.{" "}
                <span className="text-muted">No credits used.</span>
              </>
            ) : (
              <>
                This loop will use{" "}
                <span className="font-medium text-primary">
                  {cost.creditsNeeded} video credit{cost.creditsNeeded === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-muted">(you have {credits})</span>
              </>
            )}
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

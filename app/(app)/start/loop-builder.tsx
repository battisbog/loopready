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
import { Button } from "@/components/ui/shadcn/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/shadcn/toggle-group";
import { Minus, Plus } from "lucide-react";

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
  const modeOf = (t: RoundType): RoundMode =>
    plan.find((r) => r.roundType === t)?.mode ?? "voice";
  const cost = planCost(plan);
  const overBudget = cost.creditsNeeded > credits;

  const countOf = (t: RoundType) => plan.filter((r) => r.roundType === t).length;

  function rebuild(
    counts: Map<RoundType, number>,
    modes: Map<RoundType, RoundMode>
  ) {
    const next: PlannedRound[] = [];
    for (const t of types) {
      for (let i = 0; i < (counts.get(t) ?? 0); i++) {
        next.push({ roundType: t, mode: modes.get(t) ?? "voice" });
      }
    }
    setPlan(next.slice(0, MAX_ROUNDS_PER_LOOP));
  }

  const snapshot = () => ({
    counts: new Map(types.map((x) => [x, countOf(x)])),
    modes: new Map(types.map((x) => [x, modeOf(x)])),
  });

  function setCount(t: RoundType, next: number) {
    const { counts, modes } = snapshot();
    const others = types
      .filter((x) => x !== t)
      .reduce((sum, x) => sum + (counts.get(x) ?? 0), 0);
    counts.set(
      t,
      Math.max(0, Math.min(next, MAX_PER_ROUND_TYPE, MAX_ROUNDS_PER_LOOP - others))
    );
    rebuild(counts, modes);
  }

  function setMode(t: RoundType, m: RoundMode) {
    const { counts, modes } = snapshot();
    modes.set(t, m);
    // Picking a mode for a round you have not added is a dead click, so it
    // adds one instead of doing nothing.
    if ((counts.get(t) ?? 0) === 0) counts.set(t, 1);
    rebuild(counts, modes);
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
            <div className="flex items-center gap-3">
              {videoEnabled && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={n > 0 ? modeOf(t) : undefined}
                  onValueChange={(m) => m && setMode(t, m as RoundMode)}
                >
                  {(["voice", "video"] as const).map((m) => (
                    <ToggleGroupItem
                      key={m}
                      value={m}
                      size="sm"
                      aria-label={`${LABEL[t]} rounds use ${m}`}
                      className="px-2.5 text-xs"
                    >
                      {m === "voice" ? "Voice" : "Video"}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`One fewer ${LABEL[t]} round`}
                  onClick={() => setCount(t, n - 1)}
                  disabled={n === 0}
                >
                  <Minus size={14} />
                </Button>
                <span
                  className={`w-6 text-center font-mono text-sm ${
                    n > 0 ? "text-primary" : "text-muted"
                  }`}
                >
                  {n}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`One more ${LABEL[t]} round`}
                  onClick={() => setCount(t, n + 1)}
                  disabled={atCap}
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardLabel, Section, SIGNAL_TONE } from "@/components/ui";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";
import type { LoopSummary } from "@/lib/feedback/loop-summary";

interface Round {
  sessionId: string;
  roundType: RoundType;
  status: string;
  signal: string | null;
}

export default function LoopSummaryView({
  loopId,
  rounds,
}: {
  loopId: string;
  rounds: Round[];
}) {
  const [summary, setSummary] = useState<LoopSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/loop/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loopId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        if (!cancelled) setSummary(data);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [loopId]);

  return (
    <>
      {/* Rounds are always shown, even while the verdict is being written */}
      <Section title="Rounds">
        <div className="space-y-2">
          {rounds.map((r) => (
            <Card
              key={r.sessionId}
              href={
                r.signal
                  ? `/session/${r.sessionId}/feedback`
                  : `/session/${r.sessionId}`
              }
              className="flex items-center justify-between px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-primary">
                  {ROUND_LABEL[r.roundType] ?? r.roundType}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {r.signal ? "Debrief ready" : `Round ${r.status}`}
                </p>
              </div>
              {r.signal ? (
                <Badge tone={SIGNAL_TONE[r.signal] ?? "neutral"}>
                  {r.signal}
                </Badge>
              ) : (
                <Badge tone="outline">{r.status}</Badge>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Combined decision">
        {error ? (
          <Card>
            <p className="text-sm text-error">{error}</p>
            <p className="mt-2 text-sm text-secondary">
              Open each round&rsquo;s debrief above, then reload this page.
            </p>
          </Card>
        ) : !summary ? (
          <Card>
            <div className="flex items-center gap-3 text-sm text-secondary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Reconciling every round into one hire decision…
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card accent>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={SIGNAL_TONE[summary.overallSignal] ?? "neutral"} dot>
                  {summary.overallSignal.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted">Loop verdict</span>
              </div>
              <p className="mt-4 text-lg font-medium leading-relaxed text-primary">
                {summary.headline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {summary.summary}
              </p>
            </Card>

            <Card>
              <CardLabel>How each round landed</CardLabel>
              <div className="mt-3 space-y-3">
                {summary.perRound.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-start gap-3">
                    <Badge
                      tone={SIGNAL_TONE[r.signal] ?? "neutral"}
                      className="shrink-0"
                    >
                      {r.signal}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-primary">
                        {r.round}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-secondary">
                        {r.verdict}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardLabel>What held up</CardLabel>
                <ul className="mt-3 space-y-2">
                  {summary.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm leading-relaxed text-secondary"
                    >
                      <span className="mt-0.5 text-accent">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="border-warn/30 bg-warn-muted">
                <CardLabel className="text-warn">Fix this first</CardLabel>
                <p className="mt-3 text-sm font-medium text-primary">
                  {summary.fixFirst.issue}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  {summary.fixFirst.why}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-primary">
                  {summary.fixFirst.how}
                </p>
              </Card>
            </div>

            <Card>
              <CardLabel>Readiness</CardLabel>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {summary.readiness}
              </p>
            </Card>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button href="/start">Run another loop</Button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-2 text-sm text-secondary transition-colors hover:text-primary"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

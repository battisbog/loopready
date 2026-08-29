"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui";

interface Costs {
  date: string;
  spend: {
    usd: number;
    capUsd: number;
    percentOfCap: number;
    remainingUsd: number;
    freeTierCeilingUsd: number;
    freeTierPercentUsed: number;
    freeTierExhausted: boolean;
    hardCapReached: boolean;
  };
  byOperation: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  sessionsToday: number;
  demoAccount?: { used: number; cap: number; remaining: number; disabled: boolean };
  trial?: {
    sessionsToday: number;
    dailyCapUsed: number;
    dailyCap: number;
    dailyRemaining: number;
  };
  unitCostsUsd: Record<string, number>;
  config: {
    freeTierBudgetShare: number;
    freeDailySessions: number;
    adminConfigured: boolean;
  };
  health: {
    rateLimitingConfigured: boolean;
    redisReachable: boolean;
    redisError?: string;
    budgetTrackingActive: boolean;
  };
}

export default function CostDashboard() {
  const [data, setData] = useState<Costs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/costs", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    void load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (error) {
    return (
      <Card tone="error" className="mt-6">
        <p className="text-sm text-error">{error}</p>
      </Card>
    );
  }
  if (!data) {
    return <p className="mt-6 text-sm text-muted">Loading…</p>;
  }

  const { spend, health } = data;
  // Free traffic is refused before the hard cap, so that band is shown first.
  const freePct = Math.min(100, spend.freeTierPercentUsed);
  const capPct = Math.min(100, spend.percentOfCap);

  return (
    <div className="mt-6 space-y-6">
      {!health.rateLimitingConfigured && (
        <Card tone="error">
          <p className="text-sm font-medium text-error">
            Upstash is not configured. Every rate limit and the spend ceiling are
            failing OPEN.
          </p>
        </Card>
      )}
      {health.rateLimitingConfigured && !health.redisReachable && (
        <Card tone="error">
          <p className="text-sm font-medium text-error">
            Redis is configured but unreachable, so limits are failing open.
            {health.redisError ? ` ${health.redisError}` : ""}
          </p>
        </Card>
      )}

      <Card
        tone={
          spend.hardCapReached
            ? "error"
            : spend.freeTierExhausted
              ? "warn"
              : "default"
        }
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <span className="font-mono text-3xl font-semibold text-primary">
              ${spend.usd.toFixed(2)}
            </span>
            <span className="ml-2 text-sm text-secondary">
              of ${spend.capUsd.toFixed(2)} today
            </span>
          </div>
          {spend.hardCapReached ? (
            <Badge tone="error">Hard cap reached</Badge>
          ) : spend.freeTierExhausted ? (
            <Badge tone="warn">Free tier paused, paid still running</Badge>
          ) : (
            <Badge tone="accent" dot>
              Healthy
            </Badge>
          )}
        </div>

        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-elevated">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${capPct}%` }}
          />
          {/* Where free users stop and the paid-only reserve begins. */}
          <div
            className="absolute inset-y-0 w-px bg-warn"
            style={{ left: `${data.config.freeTierBudgetShare * 100}%` }}
            title="Free-tier ceiling"
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>
            Free tier: {freePct.toFixed(0)}% of its $
            {spend.freeTierCeilingUsd.toFixed(2)} share
          </span>
          <span>${spend.remainingUsd.toFixed(2)} left before the hard cap</span>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-primary">Spend by operation</h2>
          {Object.keys(data.byOperation).length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing spent yet today.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {Object.entries(data.byOperation).map(([op, usd]) => (
                <li key={op} className="flex justify-between text-sm">
                  <span className="text-secondary">{op}</span>
                  <span className="font-mono text-primary">
                    ${usd.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-primary">Requests today</h2>
          <p className="mt-3 flex justify-between text-sm">
            <span className="text-secondary">Sessions started</span>
            <span className="font-mono text-primary">{data.sessionsToday}</span>
          </p>
          {data.demoAccount && (
            <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-sm">
              <span className="text-secondary">
                Demo account{data.demoAccount.disabled ? " (disabled)" : ""}
              </span>
              <span
                className={`font-mono ${
                  data.demoAccount.remaining === 0 ? "text-error" : "text-primary"
                }`}
              >
                {data.demoAccount.used}/{data.demoAccount.cap}
              </span>
            </p>
          )}
          {data.trial && (
            <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-sm">
              <span className="text-secondary">
                Trial videos today ({data.trial.sessionsToday} started)
              </span>
              <span
                className={`font-mono ${
                  data.trial.dailyRemaining === 0 ? "text-error" : "text-primary"
                }`}
              >
                {data.trial.dailyCapUsed}/{data.trial.dailyCap}
              </span>
            </p>
          )}
          {Object.entries(data.requestsByEndpoint).map(([ep, n]) => (
            <p key={ep} className="mt-1.5 flex justify-between text-sm">
              <span className="text-secondary">{ep}</span>
              <span className="font-mono text-primary">{n}</span>
            </p>
          ))}
        </Card>
      </div>

      <Card compact>
        <h2 className="text-sm font-medium text-primary">
          Assumed unit costs
        </h2>
        <p className="mt-1 text-xs text-muted">
          Estimates used for the ceiling, from measured token usage and list
          prices. Edit in lib/cost.ts.
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {Object.entries(data.unitCostsUsd).map(([op, usd]) => (
            <li key={op} className="flex justify-between text-sm">
              <span className="text-secondary">{op}</span>
              <span className="font-mono text-muted">${usd.toFixed(4)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

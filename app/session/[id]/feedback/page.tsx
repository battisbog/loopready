"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { FeedbackReport } from "@/lib/feedback/schema";

const SIGNAL_STYLES: Record<string, string> = {
  hire: "bg-accent-muted text-accent border-accent-border",
  borderline: "bg-warn-muted text-warn border-warn/30",
  "no-hire": "bg-error-muted text-error border-error/30",
};

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        if (!cancelled) setReport(data);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <Shell id={id}>
        <p className="text-sm text-error">{error}</p>
      </Shell>
    );
  }

  if (!report) {
    return (
      <Shell id={id}>
        <div className="flex items-center gap-3 text-sm text-secondary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Writing your debrief. We&rsquo;re evaluating each answer the way a real loop
          would…
        </div>
      </Shell>
    );
  }

  return (
    <Shell id={id}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${
          SIGNAL_STYLES[report.overallSignal] ?? ""
        }`}
      >
        {report.overallSignal.toUpperCase()}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-secondary">
        {report.overallSummary}
      </p>

      <Section title="Per-answer breakdown">
        <div className="space-y-4">
          {report.perAnswer.map((a, i) => (
            <div key={i} className="rounded-lg border border-line p-4">
              <p className="text-sm font-medium text-primary">{a.question}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Structure" value={a.structure} />
                <Row label="Impact" value={a.impact} />
                <Row label="Ownership" value={a.ownership} />
                <Row label="Missing" value={a.missing} accent />
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Top issues">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-secondary">
          {report.topIssues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ol>
      </Section>

      <Section title="Rewrites">
        <div className="space-y-4">
          {report.rewrites.map((r, i) => (
            <div key={i} className="rounded-lg border border-line p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                What you said
              </p>
              <p className="mt-1 text-sm text-secondary">{r.original}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-accent">
                Stronger version
              </p>
              <p className="mt-1 text-sm text-primary">{r.better}</p>
            </div>
          ))}
        </div>
      </Section>
    </Shell>
  );
}

function Shell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Interview debrief
        </h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/session/${id}`} className="text-muted hover:text-secondary">
            Transcript
          </Link>
          <Link href="/dashboard" className="text-muted hover:text-secondary">
            Home
          </Link>
        </div>
      </div>
      {children}
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

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className={accent ? "text-warn" : "text-secondary"}>{value}</dd>
    </div>
  );
}

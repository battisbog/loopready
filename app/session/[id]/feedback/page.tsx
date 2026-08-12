"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { FeedbackReport } from "@/lib/feedback/schema";

const SIGNAL_STYLES: Record<string, string> = {
  hire: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  borderline: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "no-hire": "bg-red-500/15 text-red-400 border-red-500/30",
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
        <p className="text-sm text-red-400">{error}</p>
      </Shell>
    );
  }

  if (!report) {
    return (
      <Shell id={id}>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Writing your debrief — evaluating each answer the way a real loop
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

      <p className="mt-4 text-sm leading-relaxed text-zinc-300">
        {report.overallSummary}
      </p>

      <Section title="Per-answer breakdown">
        <div className="space-y-4">
          {report.perAnswer.map((a, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 p-4">
              <p className="text-sm font-medium text-zinc-200">{a.question}</p>
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
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-300">
          {report.topIssues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ol>
      </Section>

      <Section title="Rewrites">
        <div className="space-y-4">
          {report.rewrites.map((r, i) => (
            <div key={i} className="rounded-lg border border-zinc-800 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                What you said
              </p>
              <p className="mt-1 text-sm text-zinc-400">{r.original}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-500">
                Stronger version
              </p>
              <p className="mt-1 text-sm text-zinc-200">{r.better}</p>
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
          <Link href={`/session/${id}`} className="text-zinc-500 hover:text-zinc-300">
            Transcript
          </Link>
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
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
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
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
      <dt className="w-24 shrink-0 text-zinc-500">{label}</dt>
      <dd className={accent ? "text-amber-300/90" : "text-zinc-300"}>{value}</dd>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { useVoiceTurn, type Turn } from "./use-voice-turn";
import AudioSourceBadge from "./audio-source-badge";

interface TestResult {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

interface RunResult {
  results: TestResult[];
  passed: number;
  total: number;
  stdout: string;
  compileError?: string;
}

const LANGUAGES = [
  { key: "python", label: "Python 3" },
  { key: "javascript", label: "JavaScript" },
] as const;

export default function CodingInterview({
  sessionId,
  initialTurns,
  header,
  problem,
  initialCode,
  initialLanguage,
  signatures,
}: {
  sessionId: string;
  initialTurns: Turn[];
  header?: string;
  problem: { title: string; statement: string; example: string; fn: string };
  initialCode: string;
  initialLanguage: string;
  signatures: Record<string, string>;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [tab, setTab] = useState<"problem" | "console">("problem");
  const codeRef = useRef(code);
  codeRef.current = code;

  const {
    turns,
    status,
    error,
    elapsed,
    statusLabel,
    toggleRecording,
    endEarly,
    busy,
    recording,
    serverAudio,
  } = useVoiceTurn({
    sessionId,
    initialTurns,
    getArtifactPatch: () => ({ language, code: codeRef.current }),
    onDone: (next) =>
      router.push(
        next ? `/session/${next}` : `/session/${sessionId}/feedback`
      ),
  });

  // Persist code without a run so the interviewer sees work in progress.
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, patch: { language, code } }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [code, language, sessionId]);

  function switchLanguage(next: string) {
    const untouched =
      code.trim() === (signatures[language] ?? "").trim() || code.trim() === "";
    setLanguage(next);
    if (untouched) setCode(signatures[next] ?? "");
  }

  const runCode = useCallback(async () => {
    setRunning(true);
    setTab("console");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, code: codeRef.current, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      setRun(data);
    } catch (e) {
      setRun({
        results: [],
        passed: 0,
        total: 0,
        stdout: "",
        compileError: e instanceof Error ? e.message : "Run failed",
      });
    } finally {
      setRunning(false);
    }
  }, [sessionId, language]);

  return (
    <main className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="flex items-center gap-3 text-sm font-medium text-zinc-300">
          {header && <span className="text-emerald-400">{header}</span>}
          <span className="font-mono text-xs text-zinc-600">
            {Math.floor(elapsed / 60000)}:
            {String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}
          </span>
          <AudioSourceBadge serverAudio={serverAudio} />
        </span>
        <button
          onClick={endEarly}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        >
          End interview
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* Left: interviewer */}
        <aside className="flex min-h-0 flex-col border-b border-zinc-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-800 px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Interviewer
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.map((t, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === "interviewer"
                    ? "bg-zinc-900 text-zinc-200"
                    : "ml-auto bg-emerald-500/15 text-emerald-100"
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-zinc-800 p-4">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={toggleRecording}
              disabled={busy || status === "done"}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                recording
                  ? "animate-pulse bg-red-500"
                  : "bg-emerald-500 hover:bg-emerald-400"
              }`}
            >
              {recording ? (
                <span className="h-4 w-4 rounded-sm bg-zinc-950" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6 text-zinc-950"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                  <path d="M12 18v4" />
                </svg>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500">{statusLabel}</p>
          </div>
        </aside>

        {/* Right: editor + console */}
        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
            <div className="flex gap-1">
              {(["problem", "console"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
                    tab === t
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => switchLanguage(e.target.value)}
                className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-300 outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                onClick={runCode}
                disabled={running}
                className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {running ? "Running…" : "▶ Run"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: language === "python" ? 4 : 2,
                padding: { top: 12 },
              }}
            />
          </div>

          <div className="h-56 shrink-0 overflow-y-auto border-t border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
            {tab === "problem" ? (
              <div className="space-y-3 font-sans">
                <h2 className="text-sm font-semibold text-zinc-100">
                  {problem.title}
                </h2>
                <p className="leading-relaxed text-zinc-300">
                  {problem.statement}
                </p>
                <p className="text-zinc-400">
                  <span className="text-zinc-500">Example: </span>
                  {problem.example}
                </p>
                <p className="text-zinc-500">
                  Implement{" "}
                  <code className="rounded bg-zinc-900 px-1 font-mono text-emerald-400">
                    {problem.fn}
                  </code>
                </p>
              </div>
            ) : run ? (
              <ConsoleOutput run={run} />
            ) : (
              <p className="text-zinc-600">
                Run your code to see test results.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ConsoleOutput({ run }: { run: RunResult }) {
  if (run.compileError) {
    return (
      <div>
        <p className="text-red-400">Your code did not run:</p>
        <pre className="mt-2 whitespace-pre-wrap text-red-300/80">
          {run.compileError}
        </pre>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {run.stdout && (
        <pre className="whitespace-pre-wrap text-zinc-500">{run.stdout}</pre>
      )}
      <p className="text-zinc-400">
        Ran {run.total} test{run.total === 1 ? "" : "s"} —{" "}
        <span className={run.passed === run.total ? "text-emerald-400" : "text-amber-400"}>
          {run.passed} passed
        </span>
      </p>
      {run.results.map((r) => (
        <div key={r.index} className="flex flex-wrap gap-2">
          <span className={r.passed ? "text-emerald-400" : "text-red-400"}>
            Test {r.index + 1}: {r.passed ? "PASSED" : "FAILED"}
          </span>
          {!r.passed && (
            <span className="text-zinc-500">
              input ({r.input}) → expected {r.expected}, got {r.actual}
              {r.error ? ` · ${r.error}` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

interface TestResult {
  index: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

export interface RunResult {
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

/**
 * The coding round's work surface: editor, language picker, run button and
 * console. Voice is handled entirely by the shared shell around it.
 */
export default function CodeSurface({
  sessionId,
  problem,
  code,
  language,
  signatures,
  onCodeChange,
  onLanguageChange,
  /** Refreshes what the interviewer can see (and persists the artifact). */
  syncArtifact,
}: {
  sessionId: string;
  problem: { title: string; statement: string; example: string; fn: string };
  code: string;
  language: string;
  signatures: Record<string, string>;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  syncArtifact: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [tab, setTab] = useState<"problem" | "console">("problem");
  const codeRef = useRef(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Typing is silent, so push the code on a pause. Without this the
  // interviewer cannot react to work written between spoken turns.
  useEffect(() => {
    const t = setTimeout(syncArtifact, 2000);
    return () => clearTimeout(t);
  }, [code, language, syncArtifact]);

  function switchLanguage(next: string) {
    const untouched =
      code.trim() === (signatures[language] ?? "").trim() || code.trim() === "";
    onLanguageChange(next);
    if (untouched) onCodeChange(signatures[next] ?? "");
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
      // Results live on the session, so refresh the interviewer's view.
      syncArtifact();
    }
  }, [sessionId, language, syncArtifact]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="flex gap-1">
          {(["problem", "console"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                tab === t
                  ? "bg-elevated text-primary"
                  : "text-muted hover:text-secondary"
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
            className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-secondary outline-none"
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
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
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
          onChange={(v) => onCodeChange(v ?? "")}
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

      <div className="h-56 shrink-0 overflow-y-auto border-t border-line bg-base p-4 font-mono text-xs">
        {tab === "problem" ? (
          <div className="space-y-3 font-sans">
            <h2 className="text-sm font-semibold text-primary">
              {problem.title}
            </h2>
            <p className="leading-relaxed text-secondary">{problem.statement}</p>
            <p className="text-secondary">
              <span className="text-muted">Example: </span>
              {problem.example}
            </p>
            <p className="text-muted">
              Implement{" "}
              <code className="rounded-md bg-surface px-1 font-mono text-accent">
                {problem.fn}
              </code>
            </p>
          </div>
        ) : run ? (
          <ConsoleOutput run={run} />
        ) : (
          <p className="text-muted">Run your code to see test results.</p>
        )}
      </div>
    </div>
  );
}

function ConsoleOutput({ run }: { run: RunResult }) {
  if (run.compileError) {
    return (
      <div>
        <p className="text-error">Your code did not run:</p>
        <pre className="mt-2 whitespace-pre-wrap text-error">
          {run.compileError}
        </pre>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {run.stdout && (
        <pre className="whitespace-pre-wrap text-muted">{run.stdout}</pre>
      )}
      <p className="text-secondary">
        Ran {run.total} test{run.total === 1 ? "" : "s"},{" "}
        <span
          className={run.passed === run.total ? "text-accent" : "text-warn"}
        >
          {run.passed} passed
        </span>
      </p>
      {run.results.map((r) => (
        <div key={r.index} className="flex flex-wrap gap-2">
          <span className={r.passed ? "text-accent" : "text-error"}>
            Test {r.index + 1}: {r.passed ? "PASSED" : "FAILED"}
          </span>
          {!r.passed && (
            <span className="text-muted">
              input ({r.input}) → expected {r.expected}, got {r.actual}
              {r.error ? ` · ${r.error}` : ""}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

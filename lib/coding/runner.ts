import { Sandbox } from "@vercel/sandbox";
import type { Problem } from "./problems";

export type Language = "python" | "javascript";

export interface TestResult {
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

// The harness deep-compares results and, for order-insensitive problems, sorts
// both sides first. It prints one JSON line so the server can parse it.
function pythonHarness(code: string, problem: Problem): string {
  const cases = JSON.stringify(
    problem.tests.map((t) => ({
      args: t.args,
      expected: t.expected,
      unordered: Boolean(t.unordered),
    }))
  );
  return `${code}

import json, sys, traceback

def _norm(v, unordered):
    if unordered and isinstance(v, list):
        inner = [_norm(x, True) for x in v]
        try:
            return sorted(inner, key=lambda z: json.dumps(z, sort_keys=True))
        except Exception:
            return inner
    if isinstance(v, tuple):
        return [_norm(x, unordered) for x in v]
    if isinstance(v, list):
        return [_norm(x, unordered) for x in v]
    return v

_cases = json.loads(${JSON.stringify(cases)})
_out = []
_captured = []
for i, c in enumerate(_cases):
    try:
        r = ${problem.fn}(*c["args"])
        got = _norm(r, c["unordered"])
        want = _norm(c["expected"], c["unordered"])
        _out.append({
            "index": i,
            "passed": got == want,
            "input": json.dumps(c["args"])[1:-1],
            "expected": json.dumps(c["expected"]),
            "actual": json.dumps(r, default=str),
        })
    except Exception as e:
        _out.append({
            "index": i,
            "passed": False,
            "input": json.dumps(c["args"])[1:-1],
            "expected": json.dumps(c["expected"]),
            "actual": "—",
            "error": f"{type(e).__name__}: {e}",
        })

print("___RESULTS___" + json.dumps(_out))
`;
}

function jsHarness(code: string, problem: Problem): string {
  const cases = JSON.stringify(
    problem.tests.map((t) => ({
      args: t.args,
      expected: t.expected,
      unordered: Boolean(t.unordered),
    }))
  );
  return `${code}

const __norm = (v, unordered) => {
  if (Array.isArray(v)) {
    const inner = v.map((x) => __norm(x, unordered));
    if (unordered) return [...inner].sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
    return inner;
  }
  return v;
};

const __cases = ${cases};
const __out = [];
for (let i = 0; i < __cases.length; i++) {
  const c = __cases[i];
  try {
    const r = ${problem.fn}(...c.args);
    const got = JSON.stringify(__norm(r, c.unordered));
    const want = JSON.stringify(__norm(c.expected, c.unordered));
    __out.push({
      index: i,
      passed: got === want,
      input: JSON.stringify(c.args).slice(1, -1),
      expected: JSON.stringify(c.expected),
      actual: JSON.stringify(r ?? null),
    });
  } catch (e) {
    __out.push({
      index: i,
      passed: false,
      input: JSON.stringify(c.args).slice(1, -1),
      expected: JSON.stringify(c.expected),
      actual: "—",
      error: String(e && e.message ? e.constructor.name + ": " + e.message : e),
    });
  }
}
console.log("___RESULTS___" + JSON.stringify(__out));
`;
}

const MARKER = "___RESULTS___";

/** Wall-clock limit for one candidate program. */
const RUN_TIMEOUT_MS = Number(process.env.RUN_TIMEOUT_MS ?? 10_000);
/** Hard cap on captured output, so a print-loop cannot exhaust memory. */
const MAX_OUTPUT_CHARS = Number(process.env.RUN_MAX_OUTPUT ?? 64_000);

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? text.slice(0, MAX_OUTPUT_CHARS) + "\n…output truncated…"
    : text;
}

// Runs candidate code against the problem's tests inside an ephemeral Vercel
// Sandbox microVM — never in this process.
export async function runTests(
  code: string,
  language: Language,
  problem: Problem
): Promise<RunResult> {
  // Sandbox-level ceiling. The per-command timeout below fires well before it;
  // this is the backstop if the command never returns at all.
  const sandbox = await Sandbox.create({ runtime: "node24", timeout: 60_000 });
  let timedOut = false;
  try {
    const isPy = language === "python";
    const file = isPy ? "solution.py" : "solution.js";
    const source = isPy
      ? pythonHarness(code, problem)
      : jsHarness(code, problem);

    await sandbox.writeFiles([
      { path: file, content: Buffer.from(source, "utf8") },
    ]);

    // Race the program against a wall clock. An infinite loop in candidate
    // code would otherwise burn the full sandbox lifetime on every run.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, RUN_TIMEOUT_MS);
    });

    // Promise.race leaves the loser unhandled. The command keeps running until
    // sandbox.stop() kills it, and the rejection that follows arrived with no
    // catch attached -- an unhandled rejection in the server process, caused by
    // nothing worse than a candidate writing an infinite loop.
    const run = sandbox
      .runCommand(isPy ? "python3" : "node", [file])
      .catch((e: unknown) => {
        if (!timedOut) throw e;
        console.warn("[run] command failed after timeout kill:", e);
        return null;
      });

    const cmd = await Promise.race([run, deadline]);
    // Never leave the process alive for the rest of the timeout window.
    if (timer) clearTimeout(timer);

    if (!cmd || timedOut) {
      return {
        results: [],
        passed: 0,
        total: problem.tests.length,
        stdout: "",
        compileError: `Your code ran longer than ${Math.round(
          RUN_TIMEOUT_MS / 1000
        )} seconds and was stopped. Check for an infinite loop or a very slow algorithm.`,
      };
    }

    const rawOut = truncate(await cmd.stdout());
    const rawErr = truncate(await cmd.stderr());

    const markerAt = rawOut.lastIndexOf(MARKER);
    if (markerAt === -1) {
      // Syntax error, crash before the harness, or an infinite-loop timeout.
      return {
        results: [],
        passed: 0,
        total: problem.tests.length,
        stdout: rawOut.trim(),
        compileError:
          (rawErr || rawOut).trim().slice(-1500) ||
          "Your code did not run to completion.",
      };
    }

    const results = JSON.parse(
      rawOut.slice(markerAt + MARKER.length)
    ) as TestResult[];

    return {
      results,
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      stdout: rawOut.slice(0, markerAt).trim(),
    };
  } finally {
    await sandbox.stop().catch(() => {});
  }
}

/**
 * The coding problem bank.
 *
 * One file per pattern so a problem can be added or edited without touching
 * anything else. To contribute: open the file for the pattern, copy an existing
 * entry, and change the fields. `npm run verify:problems` executes every test
 * case and will refuse anything inconsistent.
 *
 * Statements are written from scratch. Test expectations are generated from
 * reference solutions in scripts/build-problems.py and cross-checked against
 * independently known answers, so they cannot drift from the problem text.
 */
import { ARRAYS_HASHING } from "./arrays-hashing";
import { TWO_POINTERS } from "./two-pointers";
import { SLIDING_WINDOW } from "./sliding-window";
import { STACK } from "./stack";
import { BINARY_SEARCH } from "./binary-search";
import { LINKED_LIST } from "./linked-list";
import { TREES } from "./trees";
import { TRIES } from "./tries";
import { HEAP } from "./heap";
import { BACKTRACKING } from "./backtracking";
import { GRAPHS } from "./graphs";
import { DYNAMIC_PROGRAMMING } from "./dynamic-programming";
import { INTERVALS } from "./intervals";
import { GREEDY } from "./greedy";
import type { Pattern, Problem, Tier } from "./types";

export type { Pattern, Problem, Tier, TestCase } from "./types";

export const PROBLEMS: Problem[] = [
  ...ARRAYS_HASHING,
  ...TWO_POINTERS,
  ...SLIDING_WINDOW,
  ...STACK,
  ...BINARY_SEARCH,
  ...LINKED_LIST,
  ...TREES,
  ...TRIES,
  ...HEAP,
  ...BACKTRACKING,
  ...GRAPHS,
  ...DYNAMIC_PROGRAMMING,
  ...INTERVALS,
  ...GREEDY,
];

/**
 * Picks a problem for a tier, optionally biased toward a company's commonly
 * reported patterns. Avoids repeating anything the candidate has already seen.
 */
export function pickProblem(
  tier: Tier,
  opts: { company?: string; exclude?: string[] } = {}
): Problem {
  const exclude = new Set(opts.exclude ?? []);
  let pool = PROBLEMS.filter(
    (p) => p.tiers.includes(tier) && !exclude.has(p.id)
  );
  if (!pool.length) pool = PROBLEMS.filter((p) => p.tiers.includes(tier));
  if (!pool.length) pool = PROBLEMS;

  if (opts.company) {
    const preferred = pool.filter((p) => p.companies.includes(opts.company!));
    if (preferred.length) pool = preferred;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getProblem(id: string): Problem | undefined {
  return PROBLEMS.find((p) => p.id === id);
}

export function problemsByPattern(): Record<Pattern, Problem[]> {
  const out = {} as Record<Pattern, Problem[]>;
  for (const p of PROBLEMS) (out[p.pattern] ??= []).push(p);
  return out;
}

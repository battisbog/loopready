export type Pattern =
  | "arrays-hashing"
  | "two-pointers"
  | "sliding-window"
  | "stack"
  | "binary-search"
  | "linked-list"
  | "trees"
  | "tries"
  | "heap"
  | "backtracking"
  | "graphs"
  | "dynamic-programming"
  | "intervals"
  | "greedy"
  | "matrix";

export type Tier = "junior" | "mid" | "senior";

export interface TestCase {
  args: unknown[];
  expected: unknown;
  /** Result order does not matter (e.g. group-anagrams). */
  unordered?: boolean;
}

export interface Problem {
  id: string;
  pattern: Pattern;
  tiers: Tier[];
  title: string;
  /** Function name the candidate must implement. */
  fn: string;
  /** Companies this pattern is commonly associated with, from public reports. */
  companies: string[];
  statement: string;
  example: string;
  signatures: { python: string; javascript: string };
  tests: TestCase[];
  /** Private rubric for the interviewer and the feedback report. */
  strongAnswerCovers: string;
}

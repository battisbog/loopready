import type { Problem } from "./types";

/** stack — add new problems to this array. */
export const STACK: Problem[] = [
  {
    id: "valid-parentheses",
    pattern: "stack",
    tiers: ["junior"],
    title: "Valid Parentheses",
    fn: "is_valid",
    companies: ["Amazon", "Meta", "Microsoft"],
    statement:
      "Given a string containing only the characters ()[]{}, determine if it is balanced. Brackets must close in the correct order and every closing bracket must match the most recent unclosed opening bracket of the same type.",
    example: "\"{[]}\" -> true,  \"(]\" -> false",
    signatures: {
      python: "def is_valid(s):\\n    # your code here\\n    pass\\n",
      javascript: "function is_valid(s) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
      { args: ["]"], expected: false },
      { args: ["((("], expected: false },
    ],
    strongAnswerCovers:
      "Uses a stack and remembers the final emptiness check. Leaving unclosed brackets open is the most common miss.",
  },
  {
    id: "evaluate-rpn",
    pattern: "stack",
    tiers: ["mid"],
    title: "Evaluate Postfix Expression",
    fn: "eval_rpn",
    companies: ["Amazon", "LinkedIn"],
    statement:
      "Evaluate an arithmetic expression given in postfix order, where each token is either an integer or one of + - * /. Division truncates toward zero.",
    example: "[\"2\",\"1\",\"+\",\"3\",\"*\"] -> 9",
    signatures: {
      python: "def eval_rpn(tokens):\\n    # your code here\\n    pass\\n",
      javascript: "function eval_rpn(tokens) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [["2", "1", "+", "3", "*"]], expected: 9 },
      { args: [["4", "13", "5", "/", "+"]], expected: 6 },
      { args: [["3", "-4", "+"]], expected: -1 },
      { args: [["5"]], expected: 5 },
      { args: [["7", "-3", "/"]], expected: -2 },
    ],
    strongAnswerCovers:
      "Gets operand order right for subtraction and division, and handles truncation toward zero for negatives, which Python's // does not do.",
  },
  {
    id: "daily-temperatures",
    pattern: "stack",
    tiers: ["mid"],
    title: "Days Until a Warmer Day",
    fn: "daily_temperatures",
    companies: ["Amazon", "Google"],
    statement:
      "Given daily temperatures, return an array where each position holds how many days you must wait for a warmer temperature. Use 0 where no warmer day follows.",
    example: "[73,74,75,71,69,72,76,73] -> [1,1,4,2,1,1,0,0]",
    signatures: {
      python: "def daily_temperatures(temps):\\n    # your code here\\n    pass\\n",
      javascript: "function daily_temperatures(temps) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { args: [[30, 60, 90]], expected: [1, 1, 0] },
      { args: [[50]], expected: [0] },
      { args: [[50, 50, 50]], expected: [0, 0, 0] },
    ],
    strongAnswerCovers:
      "Reaches the monotonic decreasing stack of indices. The brute force is O(n^2); the stack gives O(n) because each index is pushed and popped once.",
  },
  {
    id: "largest-rectangle-histogram",
    pattern: "stack",
    tiers: ["senior"],
    title: "Largest Rectangle in a Histogram",
    fn: "largest_rectangle",
    companies: ["Google", "Amazon"],
    statement:
      "Given bar heights of a histogram where every bar has width 1, return the area of the largest rectangle that fits entirely inside the bars.",
    example: "[2,1,5,6,2,3] -> 10",
    signatures: {
      python: "def largest_rectangle(heights):\\n    # your code here\\n    pass\\n",
      javascript: "function largest_rectangle(heights) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[2, 1, 5, 6, 2, 3]], expected: 10 },
      { args: [[2, 4]], expected: 4 },
      { args: [[]], expected: 0 },
      { args: [[5]], expected: 5 },
      { args: [[1, 1, 1, 1]], expected: 4 },
      { args: [[6, 5, 4, 3, 2, 1]], expected: 12 },
    ],
    strongAnswerCovers:
      "A genuinely hard monotonic stack problem. Look for the insight that a bar's rectangle extends back to where it could have started. Many candidates only reach O(n^2).",
  },
  {
    id: "min-stack-ops",
    pattern: "stack",
    tiers: ["mid"],
    title: "Stack With Constant-Time Minimum",
    fn: "min_stack_results",
    companies: ["Amazon", "Google", "Bloomberg"],
    statement:
      "You are given a list of operations, each one of [\"push\", value], [\"pop\"], [\"top\"] or [\"min\"]. Apply them to a stack and return the results of the top and min operations in order. Every operation must run in constant time.",
    example: "[[\"push\",-2],[\"push\",0],[\"push\",-3],[\"min\"],[\"pop\"],[\"top\"],[\"min\"]] -> [-3,0,-2]",
    signatures: {
      python: "def min_stack_results(ops):\\n    # your code here\\n    pass\\n",
      javascript: "function min_stack_results(ops) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[["push", -2], ["push", 0], ["push", -3], ["min"], ["pop"], ["top"], ["min"]]], expected: [-3, 0, -2] },
      { args: [[["push", 1], ["min"], ["push", 2], ["min"], ["pop"], ["min"]]], expected: [1, 1, 1] },
      { args: [[["push", 5], ["top"]]], expected: [5] },
    ],
    strongAnswerCovers:
      "Keeping a parallel stack of running minimums is the standard answer. Scanning for the min on each query is O(n) and fails the constant-time requirement. Ask what happens with duplicate minimums on pop.",
  },
];

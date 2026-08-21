import type { Problem } from "./types";

/** dynamic-programming — add new problems to this array. */
export const DYNAMIC_PROGRAMMING: Problem[] = [
  {
    id: "climbing-stairs",
    pattern: "dynamic-programming",
    tiers: ["junior"],
    title: "Climbing Stairs",
    fn: "climb_stairs",
    companies: ["Amazon", "Apple"],
    statement:
      "You are climbing a staircase of n steps and may take one or two steps at a time. Return how many distinct ways you can reach the top.",
    example: "n = 4 -> 5",
    signatures: {
      python: "def climb_stairs(n):\n    # your code here\n    pass\n",
      javascript: "function climb_stairs(n) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [2], expected: 2 },
      { args: [3], expected: 3 },
      { args: [4], expected: 5 },
      { args: [1], expected: 1 },
      { args: [10], expected: 89 },
    ],
    strongAnswerCovers:
      "Recognises the Fibonacci recurrence and reduces memory to two variables. Ask for the recursion's complexity before memoisation (exponential) and after (linear).",
  },
  {
    id: "house-robber",
    pattern: "dynamic-programming",
    tiers: ["mid"],
    title: "Non-Adjacent Maximum Sum",
    fn: "rob",
    companies: ["Amazon", "Google"],
    statement:
      "Given an array of non-negative numbers, choose a subset with the largest possible sum such that no two chosen entries are adjacent. Return that sum.",
    example: "[2,7,9,3,1] -> 12",
    signatures: {
      python: "def rob(nums):\n    # your code here\n    pass\n",
      javascript: "function rob(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 1]], expected: 4 },
      { args: [[2, 7, 9, 3, 1]], expected: 12 },
      { args: [[]], expected: 0 },
      { args: [[5]], expected: 5 },
      { args: [[2, 1, 1, 2]], expected: 4 },
    ],
    strongAnswerCovers:
      "States the recurrence take-or-skip clearly, then collapses the table to two variables. [2,1,1,2] catches greedy answers.",
  },
  {
    id: "coin-change",
    pattern: "dynamic-programming",
    tiers: ["mid", "senior"],
    title: "Fewest Coins",
    fn: "coin_change",
    companies: ["Amazon", "Meta", "Google"],
    statement:
      "Given coin denominations available in unlimited quantity and a target amount, return the fewest coins that sum exactly to the amount, or -1 if it cannot be made.",
    example: "coins [1,2,5], amount 11 -> 3",
    signatures: {
      python: "def coin_change(coins, amount):\n    # your code here\n    pass\n",
      javascript: "function coin_change(coins, amount) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 5], 11], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[2, 5], 3], expected: -1 },
      { args: [[1, 3, 4], 6], expected: 2 },
    ],
    strongAnswerCovers:
      "Must see that greedy fails: [1,3,4] for 6 is 3+3, not 4+1+1. Bottom-up table or memoised recursion, and the unreachable case returning -1.",
  },
  {
    id: "longest-increasing-subsequence",
    pattern: "dynamic-programming",
    tiers: ["senior"],
    title: "Longest Increasing Subsequence",
    fn: "length_of_lis",
    companies: ["Google", "Amazon", "Microsoft"],
    statement:
      "Given an array of integers, return the length of the longest strictly increasing subsequence. The chosen elements need not be adjacent.",
    example: "[10,9,2,5,3,7,101,18] -> 4",
    signatures: {
      python: "def length_of_lis(nums):\n    # your code here\n    pass\n",
      javascript: "function length_of_lis(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
      { args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
      { args: [[7, 7, 7]], expected: 1 },
      { args: [[]], expected: 0 },
      { args: [[1]], expected: 1 },
    ],
    strongAnswerCovers:
      "O(n^2) DP is a solid answer. The O(n log n) patience-sorting version is a strong-hire signal, but only if they can explain what the tails array holds.",
  },
  {
    id: "word-break",
    pattern: "dynamic-programming",
    tiers: ["senior"],
    title: "Word Break",
    fn: "word_break",
    companies: ["Amazon", "Meta", "Google"],
    statement:
      "Given a string and a dictionary of words, return true if the string can be split into a sequence of dictionary words. Words may be reused.",
    example: "\"applepen\", [\"apple\",\"pen\"] -> true",
    signatures: {
      python: "def word_break(s, words):\n    # your code here\n    pass\n",
      javascript: "function word_break(s, words) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["applepen", ["apple", "pen"]], expected: true },
      { args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], expected: false },
      { args: ["", ["a"]], expected: true },
      { args: ["aaa", ["a", "aa"]], expected: true },
      { args: ["ab", ["a"]], expected: false },
    ],
    strongAnswerCovers:
      "Naive recursion blows up on \"aaaa...b\" style inputs; memoisation or the DP table is the point. Ask what changes if they must return the actual split.",
  },
  {
    id: "unique-paths",
    pattern: "dynamic-programming",
    tiers: ["junior", "mid"],
    title: "Unique Grid Paths",
    fn: "unique_paths",
    companies: ["Amazon", "Google"],
    statement:
      "A robot starts at the top-left of an m by n grid and may move only right or down. Return how many distinct paths reach the bottom-right corner.",
    example: "3 by 7 -> 28",
    signatures: {
      python: "def unique_paths(m, n):\n    # your code here\n    pass\n",
      javascript: "function unique_paths(m, n) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [3, 7], expected: 28 },
      { args: [3, 2], expected: 3 },
      { args: [1, 1], expected: 1 },
      { args: [1, 10], expected: 1 },
      { args: [4, 4], expected: 20 },
    ],
    strongAnswerCovers:
      "The grid DP is immediate; the combinatorial closed form is a nice bonus. Ask how obstacles would change the recurrence.",
  },
  {
    id: "edit-distance",
    pattern: "dynamic-programming",
    tiers: ["senior"],
    title: "Edit Distance",
    fn: "min_distance",
    companies: ["Google", "Amazon", "Microsoft"],
    statement:
      "Given two strings, return the fewest single-character insertions, deletions or substitutions needed to turn the first into the second.",
    example: "\"horse\" -> \"ros\" is 3",
    signatures: {
      python: "def min_distance(a, b):\n    # your code here\n    pass\n",
      javascript: "function min_distance(a, b) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["horse", "ros"], expected: 3 },
      { args: ["intention", "execution"], expected: 5 },
      { args: ["", ""], expected: 0 },
      { args: ["", "abc"], expected: 3 },
      { args: ["abc", "abc"], expected: 0 },
    ],
    strongAnswerCovers:
      "A genuinely hard two-dimensional DP. Look for a clear table definition and correct base cases before any code. The rolling-array space optimisation is a bonus.",
  },
];

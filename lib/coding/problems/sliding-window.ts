import type { Problem } from "./types";

/** sliding-window — add new problems to this array. */
export const SLIDING_WINDOW: Problem[] = [
  {
    id: "best-time-stock",
    pattern: "sliding-window",
    tiers: ["junior"],
    title: "Best Time to Buy and Sell",
    fn: "max_profit",
    companies: ["Amazon", "Meta", "Microsoft"],
    statement:
      "You are given daily prices for one stock. Choose one day to buy and a later day to sell to make the largest profit. If no profit is possible, return 0.",
    example: "[7,1,5,3,6,4] -> 5  (buy at 1, sell at 6)",
    signatures: {
      python: "def max_profit(prices):\n    # your code here\n    pass\n",
      javascript: "function max_profit(prices) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[2]], expected: 0 },
      { args: [[1, 2]], expected: 1 },
    ],
    strongAnswerCovers:
      "Tracks the running minimum in one pass instead of comparing all pairs. Must handle a strictly falling series returning 0, and the empty input.",
  },
  {
    id: "longest-substring-unique",
    pattern: "sliding-window",
    tiers: ["mid"],
    title: "Longest Substring Without Repeats",
    fn: "length_of_longest",
    companies: ["Amazon", "Google", "Meta"],
    statement:
      "Given a string, return the length of the longest stretch of consecutive characters that contains no repeats.",
    example: "\"abcabcbb\" -> 3  (\"abc\")",
    signatures: {
      python: "def length_of_longest(s):\n    # your code here\n    pass\n",
      javascript: "function length_of_longest(s) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["dvdf"], expected: 3 },
      { args: ["abba"], expected: 2 },
    ],
    strongAnswerCovers:
      "Uses a window with a last-seen map and never moves the left edge backwards. \"abba\" and \"dvdf\" are the cases that break naive versions.",
  },
  {
    id: "longest-repeating-replacement",
    pattern: "sliding-window",
    tiers: ["senior"],
    title: "Longest Run After K Replacements",
    fn: "character_replacement",
    companies: ["Google", "Amazon"],
    statement:
      "Given a string of uppercase letters and a budget k, you may change up to k characters to any other letter. Return the length of the longest run of one repeated letter you can produce.",
    example: "\"AABABBA\", k = 1 -> 4",
    signatures: {
      python: "def character_replacement(s, k):\n    # your code here\n    pass\n",
      javascript: "function character_replacement(s, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["AABABBA", 1], expected: 4 },
      { args: ["ABAB", 2], expected: 4 },
      { args: ["AAAA", 0], expected: 4 },
      { args: ["", 2], expected: 0 },
      { args: ["ABCDE", 1], expected: 2 },
    ],
    strongAnswerCovers:
      "Sees that the window is valid while (length - most frequent count) <= k. Strong candidates note the max count never needs recomputing, giving O(n).",
  },
  {
    id: "min-window-substring",
    pattern: "sliding-window",
    tiers: ["senior"],
    title: "Minimum Window Containing All Characters",
    fn: "min_window",
    companies: ["Meta", "Google", "Uber"],
    statement:
      "Given a string and a set of required characters given as a string, return the shortest stretch of the first string that contains every required character including repeats. Return an empty string if none exists.",
    example: "\"ADOBECODEBANC\", \"ABC\" -> \"BANC\"",
    signatures: {
      python: "def min_window(s, need):\n    # your code here\n    pass\n",
      javascript: "function min_window(s, need) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["ADOBECODEBANC", "ABC"], expected: "BANC" },
      { args: ["a", "a"], expected: "a" },
      { args: ["a", "aa"], expected: "" },
      { args: ["", ""], expected: "" },
      { args: ["ab", "b"], expected: "b" },
    ],
    strongAnswerCovers:
      "Expands then contracts with a counts map and a satisfied counter. The hard part is shrinking correctly; watch whether they recheck the whole map each step (O(n*k)) or keep a counter (O(n)).",
  },
];

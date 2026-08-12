export type Pattern =
  | "arrays-hashing"
  | "two-pointers"
  | "sliding-window"
  | "stack"
  | "binary-search"
  | "trees"
  | "graphs"
  | "dynamic-programming"
  | "heap";

export type Tier = "junior" | "mid" | "senior";

export interface TestCase {
  args: unknown[];
  expected: unknown;
  // Result order doesn't matter (e.g. group-anagrams)
  unordered?: boolean;
}

export interface Problem {
  id: string;
  pattern: Pattern;
  tiers: Tier[];
  title: string;
  fn: string; // function name the candidate must implement
  statement: string;
  example: string;
  signatures: { python: string; javascript: string };
  tests: TestCase[];
  // Written from real loop experience — feeds the interviewer's probing.
  strongAnswerCovers: string;
}

export const PROBLEMS: Problem[] = [
  {
    id: "two-sum",
    pattern: "arrays-hashing",
    tiers: ["junior"],
    title: "Two Sum",
    fn: "two_sum",
    statement:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Each input has exactly one solution, and you may not use the same element twice.",
    example: "nums = [2, 7, 11, 15], target = 9 → [0, 1]",
    signatures: {
      python: "def two_sum(nums, target):\n    # your code here\n    pass\n",
      javascript: "function two_sum(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    ],
    strongAnswerCovers:
      "States the brute-force O(n²) first, then reaches the hash-map O(n) single-pass unprompted. Handles negatives and duplicates. Explains the space/time trade-off.",
  },
  {
    id: "valid-parentheses",
    pattern: "stack",
    tiers: ["junior"],
    title: "Valid Parentheses",
    fn: "is_valid",
    statement:
      "Given a string containing only the characters ()[]{}, determine if the input string is valid. Brackets must close in the correct order and every closing bracket must have a matching opening bracket of the same type.",
    example: '"{[]}" → true,  "(]" → false',
    signatures: {
      python: "def is_valid(s):\n    # your code here\n    pass\n",
      javascript: "function is_valid(s) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
      { args: ["]"], expected: false },
    ],
    strongAnswerCovers:
      "Reaches for a stack immediately. Remembers the empty-string and leading-closer edge cases, and the final 'stack must be empty' check — the most commonly missed line.",
  },
  {
    id: "best-time-stock",
    pattern: "sliding-window",
    tiers: ["junior", "mid"],
    title: "Best Time to Buy and Sell Stock",
    fn: "max_profit",
    statement:
      "You are given an array where the i-th element is the price of a stock on day i. Choose one day to buy and a later day to sell to maximize profit. Return the maximum profit, or 0 if no profit is possible.",
    example: "prices = [7, 1, 5, 3, 6, 4] → 5 (buy at 1, sell at 6)",
    signatures: {
      python: "def max_profit(prices):\n    # your code here\n    pass\n",
      javascript: "function max_profit(prices) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[1]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[2, 4, 1]], expected: 2 },
    ],
    strongAnswerCovers:
      "Recognizes the single-pass running-minimum solution. Handles the strictly-decreasing case returning 0 rather than a negative, and the empty/single-element input.",
  },
  {
    id: "group-anagrams",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Group Anagrams",
    fn: "group_anagrams",
    statement:
      "Given an array of strings, group the anagrams together. Return a list of groups; the order of the groups and the order within each group does not matter.",
    example: '["eat","tea","tan","ate","nat","bat"] → [["eat","tea","ate"],["tan","nat"],["bat"]]',
    signatures: {
      python: "def group_anagrams(strs):\n    # your code here\n    pass\n",
      javascript: "function group_anagrams(strs) {\n  // your code here\n}\n",
    },
    tests: [
      {
        args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
        expected: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
        unordered: true,
      },
      { args: [[""]], expected: [[""]], unordered: true },
      { args: [["a"]], expected: [["a"]], unordered: true },
    ],
    strongAnswerCovers:
      "Discusses sorted-key O(n·k log k) vs character-count-key O(n·k) and picks deliberately. Notes that the key must be hashable/immutable.",
  },
  {
    id: "product-except-self",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Product of Array Except Self",
    fn: "product_except_self",
    statement:
      "Given an integer array, return an array where each element is the product of all the other elements. Solve it without using division, in O(n) time.",
    example: "[1, 2, 3, 4] → [24, 12, 8, 6]",
    signatures: {
      python: "def product_except_self(nums):\n    # your code here\n    pass\n",
      javascript: "function product_except_self(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expected: [3, 2] },
    ],
    strongAnswerCovers:
      "Gets the prefix/suffix pass without division, then discusses reusing the output array to hit O(1) extra space. Handles zeros correctly — the case that breaks the naive division approach.",
  },
  {
    id: "longest-substring",
    pattern: "sliding-window",
    tiers: ["mid", "senior"],
    title: "Longest Substring Without Repeating Characters",
    fn: "length_of_longest_substring",
    statement:
      "Given a string, find the length of the longest substring without repeating characters.",
    example: '"abcabcbb" → 3 ("abc"),  "bbbbb" → 1',
    signatures: {
      python:
        "def length_of_longest_substring(s):\n    # your code here\n    pass\n",
      javascript:
        "function length_of_longest_substring(s) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["abcabcbb"], expected: 3 },
      { args: ["bbbbb"], expected: 1 },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["dvdf"], expected: 3 },
    ],
    strongAnswerCovers:
      'Uses a sliding window with a last-seen map rather than rebuilding a set. The "dvdf" case catches the common bug of moving the left pointer backwards.',
  },
  {
    id: "binary-search-rotated",
    pattern: "binary-search",
    tiers: ["mid", "senior"],
    title: "Search in Rotated Sorted Array",
    fn: "search",
    statement:
      "Given a sorted array that has been rotated at an unknown pivot, and a target value, return the index of the target or -1 if it is not present. Your solution must run in O(log n).",
    example: "nums = [4,5,6,7,0,1,2], target = 0 → 4",
    signatures: {
      python: "def search(nums, target):\n    # your code here\n    pass\n",
      javascript: "function search(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
      { args: [[1], 1], expected: 0 },
      { args: [[3, 1], 1], expected: 1 },
    ],
    strongAnswerCovers:
      "Identifies which half is sorted on each iteration rather than searching for the pivot first. Gets the boundary conditions right — this problem is mostly about off-by-one discipline.",
  },
  {
    id: "level-order",
    pattern: "trees",
    tiers: ["mid"],
    title: "Binary Tree Level Order Traversal",
    fn: "level_order",
    statement:
      "Given a binary tree represented as a flat array in level order (null for missing nodes), return its level-order traversal as a list of lists — one list per depth level.",
    example: "[3, 9, 20, null, null, 15, 7] → [[3], [9, 20], [15, 7]]",
    signatures: {
      python: "def level_order(tree):\n    # tree is a flat level-order array, null = None\n    # your code here\n    pass\n",
      javascript:
        "function level_order(tree) {\n  // tree is a flat level-order array, null = null\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[]], expected: [] },
    ],
    strongAnswerCovers:
      "Uses a queue and tracks level size per iteration rather than storing depth on each node. Handles the empty tree.",
  },
  {
    id: "num-islands",
    pattern: "graphs",
    tiers: ["mid", "senior"],
    title: "Number of Islands",
    fn: "num_islands",
    statement:
      "Given a 2D grid of '1' (land) and '0' (water), count the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.",
    example: '[["1","1","0"],["0","1","0"],["0","0","1"]] → 2',
    signatures: {
      python: "def num_islands(grid):\n    # your code here\n    pass\n",
      javascript: "function num_islands(grid) {\n  // your code here\n}\n",
    },
    tests: [
      {
        args: [
          [
            ["1", "1", "0"],
            ["0", "1", "0"],
            ["0", "0", "1"],
          ],
        ],
        expected: 2,
      },
      { args: [[["0"]]], expected: 0 },
      { args: [[]], expected: 0 },
      {
        args: [
          [
            ["1", "0", "1"],
            ["0", "0", "0"],
            ["1", "0", "1"],
          ],
        ],
        expected: 4,
      },
    ],
    strongAnswerCovers:
      "Chooses BFS or DFS deliberately and mentions the recursion-depth risk of DFS on a large grid. Marks visited in place or with a set, and states the O(m·n) complexity.",
  },
  {
    id: "coin-change",
    pattern: "dynamic-programming",
    tiers: ["senior"],
    title: "Coin Change",
    fn: "coin_change",
    statement:
      "Given coin denominations and a target amount, return the fewest number of coins needed to make up that amount. Return -1 if the amount cannot be made.",
    example: "coins = [1, 5, 11], amount = 15 → 3 (5 + 5 + 5, not 11 + 1×4)",
    signatures: {
      python: "def coin_change(coins, amount):\n    # your code here\n    pass\n",
      javascript: "function coin_change(coins, amount) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 5, 11], 15], expected: 3 },
      { args: [[2], 3], expected: -1 },
      { args: [[1], 0], expected: 0 },
      { args: [[1, 2, 5], 11], expected: 3 },
    ],
    strongAnswerCovers:
      "Explains why greedy fails (the [1,5,11] target 15 case) before writing DP. Defines the state and base case out loud, and gives O(amount × coins) complexity.",
  },
  {
    id: "merge-intervals",
    pattern: "two-pointers",
    tiers: ["mid", "senior"],
    title: "Merge Intervals",
    fn: "merge",
    statement:
      "Given a collection of intervals, merge all overlapping intervals and return the result sorted by start.",
    example: "[[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]]",
    signatures: {
      python: "def merge(intervals):\n    # your code here\n    pass\n",
      javascript: "function merge(intervals) {\n  // your code here\n}\n",
    },
    tests: [
      {
        args: [
          [
            [1, 3],
            [2, 6],
            [8, 10],
            [15, 18],
          ],
        ],
        expected: [
          [1, 6],
          [8, 10],
          [15, 18],
        ],
      },
      {
        args: [
          [
            [1, 4],
            [4, 5],
          ],
        ],
        expected: [[1, 5]],
      },
      { args: [[]], expected: [] },
      { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
    ],
    strongAnswerCovers:
      "Sorts by start first and says why. Treats touching intervals [1,4],[4,5] as overlapping and asks the interviewer if that is intended — clarifying that is real signal.",
  },
  {
    id: "top-k-frequent",
    pattern: "heap",
    tiers: ["mid", "senior"],
    title: "Top K Frequent Elements",
    fn: "top_k_frequent",
    statement:
      "Given an integer array and an integer k, return the k most frequent elements. The order of the output does not matter.",
    example: "nums = [1,1,1,2,2,3], k = 2 → [1, 2]",
    signatures: {
      python: "def top_k_frequent(nums, k):\n    # your code here\n    pass\n",
      javascript: "function top_k_frequent(nums, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2], unordered: true },
      { args: [[1], 1], expected: [1], unordered: true },
      { args: [[4, 4, 4, 5, 5, 6], 2], expected: [4, 5], unordered: true },
    ],
    strongAnswerCovers:
      "Compares sorting O(n log n), heap O(n log k), and bucket sort O(n), then justifies the pick. Mentioning bucket sort unprompted is a strong signal.",
  },
];

export function pickProblem(tier: Tier): Problem {
  const eligible = PROBLEMS.filter((p) => p.tiers.includes(tier));
  const pool = eligible.length ? eligible : PROBLEMS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getProblem(id: string): Problem | undefined {
  return PROBLEMS.find((p) => p.id === id);
}

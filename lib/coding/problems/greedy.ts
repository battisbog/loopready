import type { Problem } from "./types";

/** greedy — add new problems to this array. */
export const GREEDY: Problem[] = [
  {
    id: "maximum-subarray",
    pattern: "greedy",
    tiers: ["junior", "mid"],
    title: "Maximum Subarray Sum",
    fn: "max_subarray",
    companies: ["Amazon", "Meta", "Microsoft", "LinkedIn", "Google", "Apple"],
    statement:
      "Given an array of integers, return the largest sum obtainable from any contiguous non-empty run of elements.",
    example: "[-2,1,-3,4,-1,2,1,-5,4] -> 6",
    signatures: {
      python: "def max_subarray(nums):\n    # your code here\n    pass\n",
      javascript: "function max_subarray(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-3, -2, -5]], expected: -2 },
      { args: [[-1]], expected: -1 },
    ],
    strongAnswerCovers:
      "Kadane's algorithm. The all-negative case is what separates a correct answer from one initialised to zero. Ask them to also return the indices.",
  },
  {
    id: "jump-game",
    pattern: "greedy",
    tiers: ["mid"],
    title: "Jump Game",
    fn: "can_jump",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "Given an array where each value is the maximum number of positions you may advance from that index, starting at index 0, return true if you can reach the final index.",
    example: "[2,3,1,1,4] -> true;  [3,2,1,0,4] -> false",
    signatures: {
      python: "def can_jump(nums):\n    # your code here\n    pass\n",
      javascript: "function can_jump(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 3, 1, 1, 4]], expected: true },
      { args: [[3, 2, 1, 0, 4]], expected: false },
      { args: [[0]], expected: true },
      { args: [[2, 0, 0]], expected: true },
      { args: [[1, 0, 1, 0]], expected: false },
    ],
    strongAnswerCovers:
      "The greedy furthest-reach scan is O(n) and beats the DP. Ask why tracking a single reachability frontier is sufficient.",
  },
  {
    id: "gas-station",
    pattern: "greedy",
    tiers: ["senior"],
    title: "Circular Route Start",
    fn: "can_complete_circuit",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Stations are arranged in a circle. Each has an amount of fuel available and a cost to travel to the next one. Starting empty, return the index you must begin at to complete one full loop, or -1 if no start works. A solution is unique when it exists.",
    example: "gas [1,2,3,4,5], cost [3,4,5,1,2] -> 3",
    signatures: {
      python: "def can_complete_circuit(gas, cost):\n    # your code here\n    pass\n",
      javascript: "function can_complete_circuit(gas, cost) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], expected: 3 },
      { args: [[2, 3, 4], [3, 4, 3]], expected: -1 },
      { args: [[5], [4]], expected: 0 },
      { args: [[3, 1, 1], [1, 2, 2]], expected: 0 },
    ],
    strongAnswerCovers:
      "Two insights: the loop is possible only if total gas covers total cost, and any prefix that runs dry rules out every start inside it. Together they give one pass.",
  },
  {
    id: "partition-labels",
    pattern: "greedy",
    tiers: ["mid"],
    title: "Partition a String Into Distinct Blocks",
    fn: "partition_labels",
    companies: ["Amazon", "Meta", "Microsoft"],
    statement:
      "Given a string, split it into the largest possible number of contiguous pieces so that no letter appears in more than one piece. Return the length of each piece in order.",
    example: "\"ababcbacadefegde\" -> [9, 7]",
    signatures: {
      python: "def partition_labels(s):\n    # your code here\n    pass\n",
      javascript: "function partition_labels(s) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["ababcbacadefegdehijhklij"], expected: [9, 7, 8] },
      { args: ["ababcbacadefegde"], expected: [9, 7] },
      { args: ["a"], expected: [1] },
      { args: [""], expected: [] },
      { args: ["abc"], expected: [1, 1, 1] },
    ],
    strongAnswerCovers:
      "Precomputing each letter's last index, then extending the current window to the furthest last-index seen. The greedy cut when the scan index reaches the window end is the insight.",
  },
  {
    id: "best-time-stock-ii",
    pattern: "greedy",
    tiers: ["junior"],
    title: "Best Time to Buy and Sell, Unlimited Trades",
    fn: "max_profit_multi",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given an array of daily stock prices, return the maximum profit achievable by buying and selling any number of times, holding at most one share at a time.",
    example: "[7,1,5,3,6,4] -> 7, buying at 1 and selling at 5 (profit 4), then buying at 3 and selling at 6 (profit 3)",
    signatures: {
      python: "def max_profit_multi(prices):\n    # your code here\n    pass\n",
      javascript: "function max_profit_multi(prices) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[7, 1, 5, 3, 6, 4]], expected: 7 },
      { args: [[1, 2, 3, 4, 5]], expected: 4 },
      { args: [[7, 6, 4, 3, 1]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[5]], expected: 0 },
    ],
    strongAnswerCovers:
      "Recognizes that summing every positive day-over-day gain is equivalent to buying at every local minimum and selling at every local maximum, without tracking explicit buy/sell state.",
  },
];

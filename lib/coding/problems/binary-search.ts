import type { Problem } from "./types";

/** binary-search — add new problems to this array. */
export const BINARY_SEARCH: Problem[] = [
  {
    id: "binary-search",
    pattern: "binary-search",
    tiers: ["junior"],
    title: "Binary Search",
    fn: "search",
    companies: ["Amazon", "Microsoft", "Google", "Meta"],
    statement:
      "Given a sorted array of distinct integers and a target, return the index of the target or -1 if it is absent. Run in logarithmic time.",
    example: "[-1,0,3,5,9,12], target 9 -> 4",
    signatures: {
      python: "def search(nums, target):\n    # your code here\n    pass\n",
      javascript: "function search(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[], 1], expected: -1 },
      { args: [[5], 5], expected: 0 },
      { args: [[5], -5], expected: -1 },
      { args: [[1, 2], 2], expected: 1 },
    ],
    strongAnswerCovers:
      "Writes it without an off-by-one and can state the loop invariant. Ask them to justify the <= and the mid+1 rather than accepting a memorised template.",
  },
  {
    id: "search-rotated",
    pattern: "binary-search",
    tiers: ["mid"],
    title: "Search a Rotated Sorted Array",
    fn: "search_rotated",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "A sorted array of distinct integers has been rotated at an unknown pivot. Given the rotated array and a target, return the target's index or -1. Run in logarithmic time.",
    example: "[4,5,6,7,0,1,2], target 0 -> 4",
    signatures: {
      python: "def search_rotated(nums, target):\n    # your code here\n    pass\n",
      javascript: "function search_rotated(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { args: [[1], 0], expected: -1 },
      { args: [[1, 3], 3], expected: 1 },
      { args: [[5, 1, 3], 3], expected: 2 },
    ],
    strongAnswerCovers:
      "Identifies which half is sorted on each step and decides from that. The signal is careful boundary reasoning, not the trick itself.",
  },
  {
    id: "find-min-rotated",
    pattern: "binary-search",
    tiers: ["mid"],
    title: "Minimum in a Rotated Sorted Array",
    fn: "find_min",
    companies: ["Amazon", "Microsoft", "Google", "Meta"],
    statement:
      "A sorted array of distinct integers has been rotated at an unknown pivot. Return its smallest value in logarithmic time.",
    example: "[4,5,6,7,0,1,2] -> 0",
    signatures: {
      python: "def find_min(nums):\n    # your code here\n    pass\n",
      javascript: "function find_min(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 4, 5, 1, 2]], expected: 1 },
      { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
      { args: [[11, 13, 15, 17]], expected: 11 },
      { args: [[1]], expected: 1 },
      { args: [[2, 1]], expected: 1 },
    ],
    strongAnswerCovers:
      "Compares against the right edge rather than the left, and uses lo < hi with hi = mid. Comparing to nums[lo] is the classic wrong turn.",
  },
  {
    id: "koko-bananas",
    pattern: "binary-search",
    tiers: ["senior"],
    title: "Minimum Rate to Finish in Time",
    fn: "min_rate",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    statement:
      "You are given pile sizes and a number of hours. Each hour you may consume up to a fixed rate from a single pile, and a partly eaten pile still uses the whole hour. Return the smallest rate that clears every pile within the given hours.",
    example: "piles = [3,6,7,11], hours = 8 -> 4",
    signatures: {
      python: "def min_rate(piles, hours):\n    # your code here\n    pass\n",
      javascript: "function min_rate(piles, hours) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 6, 7, 11], 8], expected: 4 },
      { args: [[30, 11, 23, 4, 20], 5], expected: 30 },
      { args: [[30, 11, 23, 4, 20], 6], expected: 23 },
      { args: [[1], 1], expected: 1 },
      { args: [[1, 1, 1, 1], 4], expected: 1 },
    ],
    strongAnswerCovers:
      "Recognises this is binary search over the ANSWER, not the array, and that feasibility is monotonic. That reframing is the whole interview.",
  },
];

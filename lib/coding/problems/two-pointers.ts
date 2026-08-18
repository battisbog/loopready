import type { Problem } from "./types";

/** two-pointers — add new problems to this array. */
export const TWO_POINTERS: Problem[] = [
  {
    id: "valid-palindrome",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Valid Palindrome",
    fn: "is_palindrome",
    companies: ["Meta", "Amazon"],
    statement:
      "Given a string, return true if it reads the same forwards and backwards once you ignore punctuation and spacing and treat upper and lower case as equal.",
    example: "\"A man, a plan, a canal: Panama\" -> true",
    signatures: {
      python: "def is_palindrome(s):\\n    # your code here\\n    pass\\n",
      javascript: "function is_palindrome(s) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: ["A man, a plan, a canal: Panama"], expected: true },
      { args: ["race a car"], expected: false },
      { args: [""], expected: true },
      { args: ["  "], expected: true },
      { args: ["0P"], expected: false },
      { args: ["ab_a"], expected: true },
    ],
    strongAnswerCovers:
      "Uses two pointers in place rather than building a cleaned copy. Asks what counts as a character before assuming. Handles the empty string.",
  },
  {
    id: "two-sum-sorted",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Two Sum on a Sorted Array",
    fn: "two_sum_sorted",
    companies: ["Amazon", "Microsoft"],
    statement:
      "Given an array sorted in ascending order and a target, return the 1-based positions of the two values that sum to the target. Exactly one pair exists. Use constant extra space.",
    example: "[2,7,11,15], target 9 -> [1,2]",
    signatures: {
      python: "def two_sum_sorted(nums, target):\\n    # your code here\\n    pass\\n",
      javascript: "function two_sum_sorted(nums, target) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [1, 2] },
      { args: [[2, 3, 4], 6], expected: [1, 3] },
      { args: [[-1, 0], -1], expected: [1, 2] },
      { args: [[1, 2, 3, 4, 4, 9, 56, 90], 8], expected: [4, 5] },
    ],
    strongAnswerCovers:
      "Exploits the sortedness for O(1) space instead of reaching for a hash map. Can argue why moving the pointer inward never skips the answer.",
  },
  {
    id: "three-sum",
    pattern: "two-pointers",
    tiers: ["mid", "senior"],
    title: "Three Sum",
    fn: "three_sum",
    companies: ["Meta", "Amazon", "Google"],
    statement:
      "Given an array of integers, find every unique triple of values that sums to zero. Each triple should appear once regardless of the order its members were found in.",
    example: "[-1,0,1,2,-1,-4] -> [[-1,-1,2],[-1,0,1]]",
    signatures: {
      python: "def three_sum(nums):\\n    # your code here\\n    pass\\n",
      javascript: "function three_sum(nums) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]], unordered: true },
      { args: [[0, 1, 1]], expected: [], unordered: true },
      { args: [[0, 0, 0]], expected: [[0, 0, 0]], unordered: true },
      { args: [[]], expected: [], unordered: true },
      { args: [[-2, 0, 1, 1, 2]], expected: [[-2, 0, 2], [-2, 1, 1]], unordered: true },
    ],
    strongAnswerCovers:
      "Sorts, then fixes one element and runs two pointers, giving O(n^2). The real signal is handling duplicates without a set. Should state why the brute force is O(n^3).",
  },
  {
    id: "container-most-water",
    pattern: "two-pointers",
    tiers: ["mid"],
    title: "Container With Most Water",
    fn: "max_area",
    companies: ["Amazon", "Google", "Bloomberg"],
    statement:
      "You are given an array where each value is the height of a vertical line at that index. Pick two lines so that the rectangle they form with the horizontal axis holds the most water, and return that area.",
    example: "[1,8,6,2,5,4,8,3,7] -> 49",
    signatures: {
      python: "def max_area(heights):\\n    # your code here\\n    pass\\n",
      javascript: "function max_area(heights) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
      { args: [[1, 1]], expected: 1 },
      { args: [[4, 3, 2, 1, 4]], expected: 16 },
      { args: [[1, 2, 1]], expected: 2 },
    ],
    strongAnswerCovers:
      "Argues why moving the shorter side is safe: the area is bounded by the shorter line, so keeping it can only lose. Recognises the brute force is O(n^2).",
  },
];

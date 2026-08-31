import type { Problem } from "./types";

/** two-pointers — add new problems to this array. */
export const TWO_POINTERS: Problem[] = [
  {
    id: "valid-palindrome",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Valid Palindrome",
    fn: "is_palindrome",
    companies: ["Meta", "Amazon", "Google", "Microsoft", "Apple"],
    statement:
      "Given a string, return true if it reads the same forwards and backwards once you ignore punctuation and spacing and treat upper and lower case as equal.",
    example: "\"A man, a plan, a canal: Panama\" -> true",
    signatures: {
      python: "def is_palindrome(s):\n    # your code here\n    pass\n",
      javascript: "function is_palindrome(s) {\n  // your code here\n}\n",
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
    companies: ["Amazon", "Microsoft", "Google", "Meta"],
    statement:
      "Given an array sorted in ascending order and a target, return the 1-based positions of the two values that sum to the target. Exactly one pair exists. Use constant extra space.",
    example: "[2,7,11,15], target 9 -> [1,2]",
    signatures: {
      python: "def two_sum_sorted(nums, target):\n    # your code here\n    pass\n",
      javascript: "function two_sum_sorted(nums, target) {\n  // your code here\n}\n",
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
    companies: ["Meta", "Amazon", "Google", "Microsoft", "Apple"],
    statement:
      "Given an array of integers, find every unique triple of values that sums to zero. Each triple should appear once regardless of the order its members were found in.",
    example: "[-1,0,1,2,-1,-4] -> [[-1,-1,2],[-1,0,1]]",
    signatures: {
      python: "def three_sum(nums):\n    # your code here\n    pass\n",
      javascript: "function three_sum(nums) {\n  // your code here\n}\n",
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
    companies: ["Amazon", "Google", "Bloomberg", "Meta", "Microsoft", "Apple"],
    statement:
      "You are given an array where each value is the height of a vertical line at that index. Pick two lines so that the rectangle they form with the horizontal axis holds the most water, and return that area.",
    example: "[1,8,6,2,5,4,8,3,7] -> 49",
    signatures: {
      python: "def max_area(heights):\n    # your code here\n    pass\n",
      javascript: "function max_area(heights) {\n  // your code here\n}\n",
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
  {
    id: "trapping-rain-water",
    pattern: "two-pointers",
    tiers: ["mid"],
    title: "Trapping Rain Water",
    fn: "trap",
    companies: ["Google", "Amazon", "Apple", "Microsoft", "Netflix", "Meta"],
    statement:
      "Given a list of non-negative integers representing an elevation map where each bar has width 1, return how much water it can trap after raining.",
    example: "[0,1,0,2,1,0,1,3,2,1,2,1] -> 6",
    signatures: {
      python: "def trap(heights):\n    # your code here\n    pass\n",
      javascript: "function trap(heights) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[]], expected: 0 },
      { args: [[1, 1]], expected: 0 },
      { args: [[5, 4, 1, 2]], expected: 1 },
    ],
    strongAnswerCovers:
      "Two pointers closing from both ends, each tracking the max seen on its own side, is the O(1)-space answer. The insight to press for: water above any bar is bounded by the SMALLER of the two side maxima, which is exactly why the pointer on the smaller-max side is the one that's safe to advance.",
  },
  {
    id: "merge-sorted-array",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Merge Two Sorted Arrays",
    fn: "merge_sorted",
    companies: ["Microsoft", "Amazon", "Google", "Meta"],
    statement:
      "Given two arrays already sorted in ascending order, return one merged array in ascending order.",
    example: "[1,2,3], [2,5,6] -> [1,2,2,3,5,6]",
    signatures: {
      python: "def merge_sorted(nums1, nums2):\n    # your code here\n    pass\n",
      javascript: "function merge_sorted(nums1, nums2) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3], [2, 5, 6]], expected: [1, 2, 2, 3, 5, 6] },
      { args: [[], [1]], expected: [1] },
      { args: [[1], []], expected: [1] },
      { args: [[4, 5, 6], [1, 2, 3]], expected: [1, 2, 3, 4, 5, 6] },
    ],
    strongAnswerCovers:
      "The linear two-pointer merge is the O(m+n) answer and the actual building block of merge sort. Ask what changes if this had to merge in place into the first array with only its own trailing capacity to work with -- that's the version this is adapted from.",
  },
  {
    id: "sort-colors",
    pattern: "two-pointers",
    tiers: ["mid"],
    title: "Sort an Array of Three Values",
    fn: "sort_colors",
    companies: ["Microsoft", "Amazon", "Google", "Meta", "Apple"],
    statement:
      "Given an array containing only the values 0, 1 and 2, return it sorted in a single pass without using a separate counting or sorting step.",
    example: "[2,0,2,1,1,0] -> [0,0,1,1,2,2]",
    signatures: {
      python: "def sort_colors(nums):\n    # your code here\n    pass\n",
      javascript: "function sort_colors(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { args: [[2, 0, 1]], expected: [0, 1, 2] },
      { args: [[0]], expected: [0] },
      { args: [[1, 2, 0]], expected: [0, 1, 2] },
    ],
    strongAnswerCovers:
      "The Dutch national flag three-way partition, in one pass with three pointers. The trap is advancing mid after a swap with high -- that swap can bring in an unexamined 0, so mid must NOT advance in that branch, unlike the swap-with-low branch where it's safe to.",
  },
  {
    id: "rotate-array",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Rotate an Array",
    fn: "rotate_array",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given an array and a number k, rotate the array to the right by k steps and return the resulting array.",
    example: "nums = [1,2,3,4,5,6,7], k = 3 -> [5,6,7,1,2,3,4]",
    signatures: {
      python: "def rotate_array(nums, k):\n    # your code here\n    pass\n",
      javascript: "function rotate_array(nums, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 4, 5, 6, 7], 3], expected: [5, 6, 7, 1, 2, 3, 4] },
      { args: [[1, 2], 3], expected: [2, 1] },
      { args: [[1], 0], expected: [1] },
      { args: [[], 5], expected: [] },
      { args: [[1, 2, 3, 4], 4], expected: [1, 2, 3, 4] },
    ],
    strongAnswerCovers:
      "Reaches for the reverse-three-times in-place trick (or explicitly discusses the space/time trade-off of a fresh array) rather than rotating one step at a time, and correctly reduces k modulo the array length.",
  },
  {
    id: "remove-duplicates-sorted",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Deduplicate a Sorted Array",
    fn: "remove_duplicates",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Given a sorted array of integers, return a new array with duplicate values removed, keeping only the first occurrence of each value in order.",
    example: "[1,1,2,2,3] -> [1,2,3]",
    signatures: {
      python: "def remove_duplicates(nums):\n    # your code here\n    pass\n",
      javascript: "function remove_duplicates(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 1, 2, 2, 3]], expected: [1, 2, 3] },
      { args: [[]], expected: [] },
      { args: [[1]], expected: [1] },
      { args: [[1, 1, 1, 1]], expected: [1] },
      { args: [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], expected: [0, 1, 2, 3, 4] },
    ],
    strongAnswerCovers:
      "Uses a single forward pass comparing against the last kept value rather than a set or nested loop, and explains why sortedness is what makes this solvable in one linear pass.",
  },
  {
    id: "move-zeroes",
    pattern: "two-pointers",
    tiers: ["junior"],
    title: "Move Zeroes to the End",
    fn: "move_zeroes",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Given an array of integers, move all zeroes to the end while keeping the relative order of the non-zero elements, and return the resulting array.",
    example: "[0,1,0,3,12] -> [1,3,12,0,0]",
    signatures: {
      python: "def move_zeroes(nums):\n    # your code here\n    pass\n",
      javascript: "function move_zeroes(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0] },
      { args: [[0]], expected: [0] },
      { args: [[1, 2, 3]], expected: [1, 2, 3] },
      { args: [[0, 0, 0]], expected: [0, 0, 0] },
      { args: [[]], expected: [] },
    ],
    strongAnswerCovers:
      "Prefers a stable in-place two-pointer swap over building a new array when pushed on space, and explains why relative order of the non-zero elements must be preserved.",
  },
  {
    id: "four-sum",
    pattern: "two-pointers",
    tiers: ["mid"],
    title: "Four Sum",
    fn: "four_sum",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Given an array of integers and a target, return all unique quadruples [a, b, c, d] from the array whose values sum to the target. Each quadruple's values should be sorted ascending, and no duplicate quadruples should appear.",
    example: "nums = [1,0,-1,0,-2,2], target = 0 -> [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]",
    signatures: {
      python: "def four_sum(nums, target):\n    # your code here\n    pass\n",
      javascript: "function four_sum(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 0, -1, 0, -2, 2], 0], expected: [[-2, -1, 1, 2], [-2, 0, 0, 2], [-1, 0, 0, 1]], unordered: true },
      { args: [[2, 2, 2, 2, 2], 8], expected: [[2, 2, 2, 2]], unordered: true },
      { args: [[], 0], expected: [], unordered: true },
      { args: [[0, 0, 0, 0], 0], expected: [[0, 0, 0, 0]], unordered: true },
    ],
    strongAnswerCovers:
      "Sorts first, then reduces to two nested loops plus a two-pointer sweep, and explicitly skips duplicates at all three levels to avoid repeated quadruples rather than deduplicating the result afterward.",
  },
];

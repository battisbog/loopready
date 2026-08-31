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
  {
    id: "median-two-sorted-arrays",
    pattern: "binary-search",
    tiers: ["senior"],
    title: "Median of Two Sorted Arrays",
    fn: "find_median_sorted_arrays",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given two sorted arrays, return the median of the combined set of numbers as a single number, averaging the two middle values when the total count is even.",
    example: "nums1 = [1, 3], nums2 = [2] -> 2",
    signatures: {
      python: "def find_median_sorted_arrays(nums1, nums2):\n    # your code here\n    pass\n",
      javascript: "function find_median_sorted_arrays(nums1, nums2) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 3], [2]], expected: 2 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
      { args: [[], [1]], expected: 1 },
      { args: [[0, 0], [0, 0]], expected: 0.0 },
      { args: [[1, 2, 3], [4, 5, 6, 7]], expected: 4 },
    ],
    strongAnswerCovers:
      "States the brute-force merge-and-index approach first, then discusses the O(log(min(m,n))) binary-search partition approach when pushed to do better. Handles empty-array and even/odd-length edge cases explicitly.",
  },
  {
    id: "search-range",
    pattern: "binary-search",
    tiers: ["junior"],
    title: "Find First and Last Position of a Target",
    fn: "search_range",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given a sorted array and a target value, return the first and last index at which the target appears, as [first, last]. Return [-1, -1] if it does not appear.",
    example: "nums = [5, 7, 7, 8, 8, 10], target = 8 -> [3, 4]",
    signatures: {
      python: "def search_range(nums, target):\n    # your code here\n    pass\n",
      javascript: "function search_range(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[5, 7, 7, 8, 8, 10], 8], expected: [3, 4] },
      { args: [[5, 7, 7, 8, 8, 10], 6], expected: [-1, -1] },
      { args: [[], 0], expected: [-1, -1] },
      { args: [[1], 1], expected: [0, 0] },
      { args: [[2, 2], 2], expected: [0, 1] },
    ],
    strongAnswerCovers:
      "Reaches for two separate binary searches (one for the left boundary, one for the right) to hit O(log n) rather than a linear scan, and can explain why a single binary search cannot find both ends.",
  },
  {
    id: "search-2d-matrix",
    pattern: "binary-search",
    tiers: ["junior"],
    title: "Search a Sorted 2D Grid",
    fn: "search_matrix",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Given a grid of integers where each row is sorted left to right and the first value of each row is greater than the last value of the previous row, return true if a target value exists anywhere in the grid.",
    example: "matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3 -> true",
    signatures: {
      python: "def search_matrix(matrix, target):\n    # your code here\n    pass\n",
      javascript: "function search_matrix(matrix, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], expected: true },
      { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], expected: false },
      { args: [[[1]], 1], expected: true },
      { args: [[[1]], 2], expected: false },
      { args: [[[], []], 1], expected: false },
    ],
    strongAnswerCovers:
      "Treats the grid as a single sorted sequence and binary searches the virtual flattened index rather than scanning row by row, and can convert a flat index back to row/column coordinates.",
  },
  {
    id: "find-peak-element",
    pattern: "binary-search",
    tiers: ["mid"],
    title: "Find the Peak Element",
    fn: "find_peak",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    statement:
      "Given an array of integers with no two adjacent elements equal and exactly one peak (an element strictly greater than both neighbors, treating positions outside the array as negative infinity), return the index of that peak.",
    example: "[1,3,5,4,2] -> 2, the index of value 5",
    signatures: {
      python: "def find_peak(nums):\n    # your code here\n    pass\n",
      javascript: "function find_peak(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 3, 5, 4, 2]], expected: 2 },
      { args: [[1]], expected: 0 },
      { args: [[1, 2]], expected: 1 },
      { args: [[2, 1]], expected: 0 },
      { args: [[1, 2, 3, 4, 5]], expected: 4 },
    ],
    strongAnswerCovers:
      "Reaches for binary search using the slope between adjacent elements to discard half the array each step, once pushed to beat the O(n) linear scan.",
  },
];

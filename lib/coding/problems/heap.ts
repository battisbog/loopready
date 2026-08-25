import type { Problem } from "./types";

/** heap — add new problems to this array. */
export const HEAP: Problem[] = [
  {
    id: "kth-largest",
    pattern: "heap",
    tiers: ["mid"],
    title: "Kth Largest Element",
    fn: "find_kth_largest",
    companies: ["Amazon", "Meta", "Netflix"],
    statement:
      "Given an unsorted array of integers and a number k, return the kth largest value counting duplicates as separate entries.",
    example: "[3,2,1,5,6,4], k = 2 -> 5",
    signatures: {
      python: "def find_kth_largest(nums, k):\n    # your code here\n    pass\n",
      javascript: "function find_kth_largest(nums, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { args: [[1], 1], expected: 1 },
      { args: [[2, 1], 2], expected: 1 },
    ],
    strongAnswerCovers:
      "Sorting is O(n log n); a size-k min heap is O(n log k). Quickselect gets average O(n). Ask which they would ship and why.",
  },
  {
    id: "k-closest-points",
    pattern: "heap",
    tiers: ["mid"],
    title: "K Closest Points to the Origin",
    fn: "k_closest",
    companies: ["Amazon", "Meta", "Uber"],
    statement:
      "Given a list of [x, y] points and a number k, return the k points nearest to the origin. The order of the returned points does not matter.",
    example: "[[1,3],[-2,2]], k = 1 -> [[-2,2]]",
    signatures: {
      python: "def k_closest(points, k):\n    # your code here\n    pass\n",
      javascript: "function k_closest(points, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 3], [-2, 2]], 1], expected: [[-2, 2]], unordered: true },
      { args: [[[3, 3], [5, -1], [-2, 4]], 2], expected: [[3, 3], [-2, 4]], unordered: true },
      { args: [[[0, 0]], 1], expected: [[0, 0]], unordered: true },
    ],
    strongAnswerCovers:
      "Should skip the square root since it does not change the ordering. Then the same heap-versus-quickselect trade-off as any top-k problem.",
  },
  {
    id: "task-scheduler",
    pattern: "heap",
    tiers: ["senior"],
    title: "Task Scheduler With Cooldown",
    fn: "least_interval",
    companies: ["Meta", "Amazon"],
    statement:
      "Given a list of task labels and a cooldown n, each unit of time runs one task or idles. The same label cannot run again until n units have passed. Return the fewest units of time needed to run every task.",
    example: "[\"A\",\"A\",\"A\",\"B\",\"B\",\"B\"], n = 2 -> 8",
    signatures: {
      python: "def least_interval(tasks, n):\n    # your code here\n    pass\n",
      javascript: "function least_interval(tasks, n) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["A", "A", "A", "B", "B", "B"], 2], expected: 8 },
      { args: [["A", "A", "A", "B", "B", "B"], 0], expected: 6 },
      { args: [["A", "B", "C"], 2], expected: 3 },
      { args: [[], 2], expected: 0 },
      { args: [["A"], 5], expected: 1 },
    ],
    strongAnswerCovers:
      "The counting formula is the elegant answer; a greedy heap simulation also works. Ask them to justify the max against len(tasks), which is the case where no idling is needed.",
  },
  {
    id: "kth-smallest-matrix",
    pattern: "heap",
    tiers: ["mid"],
    title: "Kth Smallest in a Sorted Matrix",
    fn: "kth_smallest_matrix",
    companies: ["Google", "Amazon", "Bloomberg"],
    statement:
      "Given an n x n matrix where every row and every column is sorted in ascending order, return the kth smallest element in the matrix.",
    example: "[[1,5,9],[10,11,13],[12,13,15]], k = 8 -> 13",
    signatures: {
      python: "def kth_smallest_matrix(matrix, k):\n    # your code here\n    pass\n",
      javascript: "function kth_smallest_matrix(matrix, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 5, 9], [10, 11, 13], [12, 13, 15]], 8], expected: 13 },
      { args: [[[-5]], 1], expected: -5 },
      { args: [[[1, 2], [1, 3]], 2], expected: 1 },
    ],
    strongAnswerCovers:
      "Binary search on value range is the O(n log(max-min)) answer; a min-heap seeded with the first row is the more common O(k log n) one. They should name the row/column sortedness as what lets the heap only ever consider n candidates instead of all n^2 cells.",
  },
  {
    id: "top-k-frequent-words",
    pattern: "heap",
    tiers: ["mid"],
    title: "Top K Frequent Words",
    fn: "top_k_frequent_words",
    companies: ["Amazon", "Bloomberg"],
    statement:
      "Given a list of words and a number k, return the k most frequent words, ordered by frequency (highest first). Break ties alphabetically.",
    example: "[\"i\",\"love\",\"leetcode\",\"i\",\"love\",\"coding\"], k = 2 -> [\"i\",\"love\"]",
    signatures: {
      python: "def top_k_frequent_words(words, k):\n    # your code here\n    pass\n",
      javascript: "function top_k_frequent_words(words, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["i", "love", "leetcode", "i", "love", "coding"], 2], expected: ["i", "love"] },
      { args: [["the", "day", "is", "sunny", "the", "the", "the", "sunny", "is", "is"], 4], expected: ["the", "is", "sunny", "day"] },
      { args: [["a", "b", "a"], 1], expected: ["a"] },
    ],
    strongAnswerCovers:
      "The tie-break is the part people skip: sorting or heap comparisons must order by (-count, word) together, not count alone. Bucket sort by frequency avoids a heap entirely and is worth asking about as the O(n) alternative.",
  },
  {
    id: "find-median-stream",
    pattern: "heap",
    tiers: ["senior"],
    title: "Running Median of a Number Stream",
    fn: "find_medians",
    companies: ["Amazon", "Google", "Meta"],
    statement:
      "Numbers arrive one at a time. After each one is added, return the median of every number seen so far. Return the list of running medians, in the order the numbers arrived.",
    example: "[5, 15, 1] -> [5.0, 10.0, 5.0]",
    signatures: {
      python: "def find_medians(nums):\n    # your code here\n    pass\n",
      javascript: "function find_medians(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[5]], expected: [5.0] },
      { args: [[5, 15]], expected: [5.0, 10.0] },
      { args: [[1, 2, 3]], expected: [1.0, 1.5, 2.0] },
      { args: [[]], expected: [] },
      { args: [[6, 10, 2, 6, 5, 0]], expected: [6.0, 8.0, 6.0, 6.0, 6.0, 5.5] },
    ],
    strongAnswerCovers:
      "Two heaps -- a max-heap for the lower half, a min-heap for the upper half, rebalanced after every insert -- is the expected shape. The median is the top of the larger half, or the average of both tops when equal in size. Sorting on every insert is the naive answer worth naming and rejecting first.",
  },
];

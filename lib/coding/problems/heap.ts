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
      python: "def find_kth_largest(nums, k):\\n    # your code here\\n    pass\\n",
      javascript: "function find_kth_largest(nums, k) {\\n  // your code here\\n}\\n",
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
      python: "def k_closest(points, k):\\n    # your code here\\n    pass\\n",
      javascript: "function k_closest(points, k) {\\n  // your code here\\n}\\n",
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
      python: "def least_interval(tasks, n):\\n    # your code here\\n    pass\\n",
      javascript: "function least_interval(tasks, n) {\\n  // your code here\\n}\\n",
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
];

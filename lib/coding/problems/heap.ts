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
      "Binary search on value range is the O(n log(max-min)) answer; a min-heap seeded with the first row, popping and pushing the cell below, is the more common O(k log n) one. Either is fine, but they should name the row/column sortedness as what makes the heap approach only need to look at n candidates at a time instead of all n^2 cells.",
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
    example: '["i","love","leetcode","i","love","coding"], k = 2 -> ["i","love"]',
    signatures: {
      python: "def top_k_frequent_words(words, k):\n    # your code here\n    pass\n",
      javascript: "function top_k_frequent_words(words, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["i", "love", "leetcode", "i", "love", "coding"], 2], expected: ["i", "love"] },
      {
        args: [["the", "day", "is", "sunny", "the", "the", "the", "sunny", "is", "is"], 4],
        expected: ["the", "is", "sunny", "day"],
      },
      { args: [["a", "b", "a"], 1], expected: ["a"] },
    ],
    strongAnswerCovers:
      "The tie-break is the part people skip: sorting or heap comparisons must order by (-count, word) together, not count alone, or ties come out in whatever order the language's sort happens to preserve. Bucket sort by frequency avoids a heap entirely and is worth asking about as the O(n) alternative.",
  },
  {
    id: "meeting-rooms-ii",
    pattern: "heap",
    tiers: ["mid"],
    title: "Minimum Meeting Rooms",
    fn: "min_meeting_rooms",
    companies: ["Google", "Meta", "Amazon"],
    statement:
      "Given a list of [start, end] meeting intervals, return the minimum number of rooms required so that no two meetings needing the same room overlap.",
    example: "[[0,30],[5,10],[15,20]] -> 2",
    signatures: {
      python: "def min_meeting_rooms(intervals):\n    # your code here\n    pass\n",
      javascript: "function min_meeting_rooms(intervals) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
      { args: [[[7, 10], [2, 4]]], expected: 1 },
      { args: [[]], expected: 0 },
      { args: [[[1, 5], [1, 5], [1, 5]]], expected: 3 },
    ],
    strongAnswerCovers:
      "Sorting start times and end times separately and sweeping both with two pointers is the clean answer; a min-heap of active end times is the more commonly cited one and works the same way. The touching case [[7,10],[2,4]] not needing a second room (10 does not overlap a meeting starting at, say, 10) is the boundary worth probing.",
  },
];

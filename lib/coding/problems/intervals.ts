import type { Problem } from "./types";

/** intervals — add new problems to this array. */
export const INTERVALS: Problem[] = [
  {
    id: "merge-intervals",
    pattern: "intervals",
    tiers: ["mid"],
    title: "Merge Overlapping Intervals",
    fn: "merge_intervals",
    companies: ["Amazon", "Meta", "Google", "Bloomberg", "Microsoft", "Apple"],
    statement:
      "Given a list of [start, end] intervals, merge every set that overlaps and return the resulting list sorted by start. Intervals that merely touch at an endpoint count as overlapping.",
    example: "[[1,3],[2,6],[8,10]] -> [[1,6],[8,10]]",
    signatures: {
      python: "def merge_intervals(intervals):\n    # your code here\n    pass\n",
      javascript: "function merge_intervals(intervals) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[]], expected: [] },
      { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
    ],
    strongAnswerCovers:
      "Sorting by start is the unlock. [[1,4],[2,3]] catches people who assume the later interval always extends the range.",
  },
  {
    id: "insert-interval",
    pattern: "intervals",
    tiers: ["mid"],
    title: "Insert an Interval",
    fn: "insert_interval",
    companies: ["Google", "Amazon", "LinkedIn", "Meta", "Microsoft"],
    statement:
      "Given a list of non-overlapping [start, end] intervals sorted by start, insert one new interval and merge where needed. Return the resulting list.",
    example: "[[1,3],[6,9]], insert [2,5] -> [[1,5],[6,9]]",
    signatures: {
      python: "def insert_interval(intervals, new_interval):\n    # your code here\n    pass\n",
      javascript: "function insert_interval(intervals, new_interval) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] },
      { args: [[[1, 2], [3, 5], [6, 7], [8, 10]], [4, 8]], expected: [[1, 2], [3, 10]] },
      { args: [[], [5, 7]], expected: [[5, 7]] },
      { args: [[[1, 5]], [2, 3]], expected: [[1, 5]] },
      { args: [[[3, 5]], [1, 2]], expected: [[1, 2], [3, 5]] },
    ],
    strongAnswerCovers:
      "Should exploit the existing sort for O(n) rather than appending and re-sorting. The three phases (before, overlapping, after) are the clean framing.",
  },
  {
    id: "meeting-rooms",
    pattern: "intervals",
    tiers: ["mid", "senior"],
    title: "Minimum Meeting Rooms",
    fn: "min_rooms",
    companies: ["Amazon", "Meta", "Google", "Uber", "Microsoft", "Apple"],
    statement:
      "Given meeting times as [start, end] intervals, return the smallest number of rooms needed so that no two meetings share a room at the same time. A meeting ending exactly when another begins can reuse the room.",
    example: "[[0,30],[5,10],[15,20]] -> 2",
    signatures: {
      python: "def min_rooms(intervals):\n    # your code here\n    pass\n",
      javascript: "function min_rooms(intervals) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
      { args: [[[7, 10], [2, 4]]], expected: 1 },
      { args: [[]], expected: 0 },
      { args: [[[1, 5], [5, 10]]], expected: 1 },
      { args: [[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]], expected: 4 },
    ],
    strongAnswerCovers:
      "Either a min heap of end times or the sorted start/end sweep. The touching case [[1,5],[5,10]] returning 1 is the boundary worth asking about.",
  },
  {
    id: "non-overlapping-intervals",
    pattern: "intervals",
    tiers: ["senior"],
    title: "Fewest Removals to Remove Overlap",
    fn: "erase_overlap",
    companies: ["Google", "Amazon", "Microsoft"],
    statement:
      "Given a list of [start, end] intervals, return the minimum number you must remove so that none of the remainder overlap. Touching endpoints do not count as overlap.",
    example: "[[1,2],[2,3],[3,4],[1,3]] -> 1",
    signatures: {
      python: "def erase_overlap(intervals):\n    # your code here\n    pass\n",
      javascript: "function erase_overlap(intervals) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 2], [2, 3], [3, 4], [1, 3]]], expected: 1 },
      { args: [[[1, 2], [1, 2], [1, 2]]], expected: 2 },
      { args: [[[1, 2], [2, 3]]], expected: 0 },
      { args: [[]], expected: 0 },
    ],
    strongAnswerCovers:
      "Greedy by EARLIEST END is correct; sorting by start is the intuitive wrong answer. Ask them to argue why keeping the earliest finisher is always safe.",
  },
];

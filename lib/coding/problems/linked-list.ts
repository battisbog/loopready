import type { Problem } from "./types";

/** linked-list — add new problems to this array. */
export const LINKED_LIST: Problem[] = [
  {
    id: "reverse-linked-list",
    pattern: "linked-list",
    tiers: ["junior"],
    title: "Reverse a Linked List",
    fn: "reverse_list",
    companies: ["Amazon", "Meta", "Microsoft", "Apple"],
    statement:
      "A singly linked list is given to you as an array of its values in order. Return an array of the values in reversed order. Discuss the pointer manipulation you would use on real nodes.",
    example: "[1,2,3,4,5] -> [5,4,3,2,1]",
    signatures: {
      python: "def reverse_list(values):\\n    # your code here\\n    pass\\n",
      javascript: "function reverse_list(values) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { args: [[]], expected: [] },
      { args: [[1]], expected: [1] },
      { args: [[1, 2]], expected: [2, 1] },
    ],
    strongAnswerCovers:
      "The array form is trivial; the interview is the pointer version. Ask them to walk through prev/curr/next on real nodes and to handle the empty and single-node cases.",
  },
  {
    id: "merge-two-sorted-lists",
    pattern: "linked-list",
    tiers: ["junior"],
    title: "Merge Two Sorted Lists",
    fn: "merge_sorted",
    companies: ["Amazon", "Microsoft", "Apple"],
    statement:
      "Two sorted linked lists are given as arrays of their values. Return one sorted array containing every value from both.",
    example: "[1,2,4], [1,3,4] -> [1,1,2,3,4,4]",
    signatures: {
      python: "def merge_sorted(a, b):\\n    # your code here\\n    pass\\n",
      javascript: "function merge_sorted(a, b) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { args: [[], []], expected: [] },
      { args: [[], [0]], expected: [0] },
      { args: [[5], [1, 2, 3]], expected: [1, 2, 3, 5] },
    ],
    strongAnswerCovers:
      "Merges in one pass without concatenating and sorting. Should mention the dummy-head trick for the real pointer version and handle one list running out.",
  },
  {
    id: "linked-list-cycle",
    pattern: "linked-list",
    tiers: ["mid"],
    title: "Detect a Cycle",
    fn: "has_cycle",
    companies: ["Amazon", "Meta", "Bloomberg"],
    statement:
      "A linked list is described by an array of values plus an index that the last node points back to, or -1 for no cycle. Return true if the list contains a cycle. Explain how you would do it with constant extra space.",
    example: "values = [3,2,0,-4], tail connects to index 1 -> true",
    signatures: {
      python: "def has_cycle(values, tail_index):\\n    # your code here\\n    pass\\n",
      javascript: "function has_cycle(values, tail_index) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[3, 2, 0, -4], 1], expected: true },
      { args: [[1, 2], 0], expected: true },
      { args: [[1], -1], expected: false },
      { args: [[], -1], expected: false },
      { args: [[1, 2, 3], -1], expected: false },
    ],
    strongAnswerCovers:
      "The data form makes the answer easy, so spend the time on Floyd's fast/slow pointers: why the pointers must meet inside a cycle, and why it is O(1) space versus a visited set.",
  },
  {
    id: "remove-nth-from-end",
    pattern: "linked-list",
    tiers: ["mid"],
    title: "Remove the Nth Node From the End",
    fn: "remove_nth",
    companies: ["Amazon", "Meta"],
    statement:
      "Given a linked list as an array of values and a number n, remove the nth node counting from the end and return the remaining values. Aim to do it in a single pass.",
    example: "[1,2,3,4,5], n = 2 -> [1,2,3,5]",
    signatures: {
      python: "def remove_nth(values, n):\\n    # your code here\\n    pass\\n",
      javascript: "function remove_nth(values, n) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[1, 2, 3, 4, 5], 2], expected: [1, 2, 3, 5] },
      { args: [[1], 1], expected: [] },
      { args: [[1, 2], 1], expected: [1] },
      { args: [[1, 2], 2], expected: [2] },
      { args: [[1, 2, 3], 3], expected: [2, 3] },
    ],
    strongAnswerCovers:
      "The one-pass answer is two pointers held n apart. Removing the head is the edge case that breaks most attempts; a dummy head fixes it.",
  },
];

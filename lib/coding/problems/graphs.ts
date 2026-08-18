import type { Problem } from "./types";

/** graphs — add new problems to this array. */
export const GRAPHS: Problem[] = [
  {
    id: "number-of-islands",
    pattern: "graphs",
    tiers: ["mid"],
    title: "Number of Islands",
    fn: "num_islands",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "Given a grid of \"1\" for land and \"0\" for water, count the separate land masses. Cells join only horizontally or vertically.",
    example: "[[\"1\",\"1\",\"0\"],[\"0\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]] -> 2",
    signatures: {
      python: "def num_islands(grid):\\n    # your code here\\n    pass\\n",
      javascript: "function num_islands(grid) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[["1", "1", "0"], ["0", "1", "0"], ["0", "0", "1"]]], expected: 2 },
      { args: [[["0"]]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[["1", "1"], ["1", "1"]]], expected: 1 },
    ],
    strongAnswerCovers:
      "Flood fill with BFS or DFS and a visited set. Ask about recursion depth on a large grid, and whether mutating the input is acceptable.",
  },
  {
    id: "max-area-island",
    pattern: "graphs",
    tiers: ["mid"],
    title: "Largest Island",
    fn: "max_area_island",
    companies: ["Amazon", "Google"],
    statement:
      "Given a grid of 1 for land and 0 for water, return the number of cells in the largest connected land mass. Cells join only horizontally or vertically. Return 0 if there is no land.",
    example: "[[1,1,0],[0,1,0],[0,0,1]] -> 3",
    signatures: {
      python: "def max_area_island(grid):\\n    # your code here\\n    pass\\n",
      javascript: "function max_area_island(grid) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[[1, 1, 0], [0, 1, 0], [0, 0, 1]]], expected: 3 },
      { args: [[[0, 0], [0, 0]]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[[1]]], expected: 1 },
    ],
    strongAnswerCovers:
      "Same traversal as counting islands but accumulating a size. Look for one shared visited set rather than one per component.",
  },
  {
    id: "course-schedule",
    pattern: "graphs",
    tiers: ["senior"],
    title: "Course Prerequisites",
    fn: "can_finish",
    companies: ["Amazon", "Meta", "Google"],
    statement:
      "Given a number of courses labelled from zero and a list of [course, prerequisite] pairs, return true if there is an order that lets you take every course.",
    example: "2 courses, [[1,0]] -> true;  [[1,0],[0,1]] -> false",
    signatures: {
      python: "def can_finish(n, prereqs):\\n    # your code here\\n    pass\\n",
      javascript: "function can_finish(n, prereqs) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false },
      { args: [1, []], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
      { args: [4, [[1, 0], [2, 1], [3, 2]]], expected: true },
    ],
    strongAnswerCovers:
      "Recognises this as cycle detection on a directed graph. Kahn's topological sort or DFS with three colours. A plain visited set without recursion state is the classic wrong answer.",
  },
  {
    id: "rotting-oranges",
    pattern: "graphs",
    tiers: ["mid"],
    title: "Spreading Rot",
    fn: "oranges_rotting",
    companies: ["Amazon", "Google"],
    statement:
      "In a grid, 0 is empty, 1 is a fresh orange and 2 is a rotten one. Each minute, every fresh orange horizontally or vertically adjacent to a rotten one also rots. Return the minutes until none are fresh, or -1 if some can never rot.",
    example: "[[2,1,1],[1,1,0],[0,1,1]] -> 4",
    signatures: {
      python: "def oranges_rotting(grid):\\n    # your code here\\n    pass\\n",
      javascript: "function oranges_rotting(grid) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], expected: 4 },
      { args: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], expected: -1 },
      { args: [[[0, 2]]], expected: 0 },
      { args: [[[0]]], expected: 0 },
      { args: [[[1]]], expected: -1 },
    ],
    strongAnswerCovers:
      "Multi-source BFS starting from every rotten cell at once. Running BFS per source is the slow path. The unreachable case must return -1.",
  },
  {
    id: "pacific-atlantic",
    pattern: "graphs",
    tiers: ["senior"],
    title: "Water Flowing to Both Coasts",
    fn: "pacific_atlantic",
    companies: ["Google", "Amazon"],
    statement:
      "Given a grid of heights, water flows from a cell to a neighbour of equal or lower height. The top and left edges touch one ocean, the bottom and right edges touch another. Return the coordinates of every cell from which water can reach both oceans.",
    example: "a 5x5 height map -> the ridge cells",
    signatures: {
      python: "def pacific_atlantic(heights):\\n    # your code here\\n    pass\\n",
      javascript: "function pacific_atlantic(heights) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[[1, 2, 3], [8, 9, 4], [7, 6, 5]]], expected: [[0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], unordered: true },
      { args: [[[1]]], expected: [[0, 0]], unordered: true },
      { args: [[[2, 1], [1, 2]]], expected: [[0, 0], [0, 1], [1, 0], [1, 1]], unordered: true },
    ],
    strongAnswerCovers:
      "The inversion is the interview: search UPHILL from each coast instead of downhill from every cell, turning O((mn)^2) into O(mn).",
  },
];

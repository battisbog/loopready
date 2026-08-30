import type { Problem } from "./types";

/** matrix — add new problems to this array. */
export const MATRIX: Problem[] = [
  {
    id: "rotate-image",
    pattern: "matrix",
    tiers: ["mid"],
    title: "Rotate Image 90 Degrees",
    fn: "rotate_image",
    companies: ["Amazon", "Microsoft", "Apple", "Google", "Meta"],
    statement:
      "Given an n x n matrix, return a new matrix rotated 90 degrees clockwise.",
    example: "[[1,2,3],[4,5,6],[7,8,9]] -> [[7,4,1],[8,5,2],[9,6,3]]",
    signatures: {
      python: "def rotate_image(matrix):\n    # your code here\n    pass\n",
      javascript: "function rotate_image(matrix) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]] },
      { args: [[[1]]], expected: [[1]] },
      { args: [[[1, 2], [3, 4]]], expected: [[3, 1], [4, 2]] },
    ],
    strongAnswerCovers:
      "The in-place version (transpose then reverse each row, or four-way swap by layer) is what a strong candidate reaches for when told to do it without extra memory. Ask them to derive the index formula rather than recite it.",
  },
  {
    id: "spiral-matrix",
    pattern: "matrix",
    tiers: ["mid"],
    title: "Spiral Matrix Traversal",
    fn: "spiral_order",
    companies: ["Google", "Microsoft", "Amazon", "Meta", "Apple"],
    statement:
      "Given an m x n matrix, return all elements in spiral order, starting from the top-left and moving right.",
    example: "[[1,2,3],[4,5,6],[7,8,9]] -> [1,2,3,6,9,8,7,4,5]",
    signatures: {
      python: "def spiral_order(matrix):\n    # your code here\n    pass\n",
      javascript: "function spiral_order(matrix) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
      { args: [[[1]]], expected: [1] },
      { args: [[[1, 2], [3, 4]]], expected: [1, 2, 4, 3] },
    ],
    strongAnswerCovers:
      "Four shrinking boundaries (top/bottom/left/right) walked in order is the clean answer. The two guard checks before the bottom row and left column are the part people forget, and a non-square input is the case that catches a version without them.",
  },
  {
    id: "set-matrix-zeroes",
    pattern: "matrix",
    tiers: ["mid"],
    title: "Set Matrix Zeroes",
    fn: "set_zeroes",
    companies: ["Microsoft", "Amazon", "Google", "Meta"],
    statement:
      "Given an m x n matrix, return a new matrix where any row or column that contained a 0 in the original is entirely zeroed out.",
    example: "[[1,1,1],[1,0,1],[1,1,1]] -> [[1,0,1],[0,0,0],[1,0,1]]",
    signatures: {
      python: "def set_zeroes(matrix):\n    # your code here\n    pass\n",
      javascript: "function set_zeroes(matrix) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], expected: [[1, 0, 1], [0, 0, 0], [1, 0, 1]] },
      { args: [[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], expected: [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]] },
      { args: [[[1]]], expected: [[1]] },
      { args: [[[1, 0]]], expected: [[0, 0]] },
    ],
    strongAnswerCovers:
      "A first pass to record which rows/columns contain a zero, then a second pass to zero them, avoids the bug of zeroing a cell and then reading that zero as a NEW trigger later in the same pass. The O(1)-extra-space version stores the flags in the matrix's own first row and column instead of two sets.",
  },
];

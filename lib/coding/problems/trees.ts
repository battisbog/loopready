import type { Problem } from "./types";

/** trees — add new problems to this array. */
export const TREES: Problem[] = [
  {
    id: "max-depth-tree",
    pattern: "trees",
    tiers: ["junior"],
    title: "Maximum Depth of a Binary Tree",
    fn: "max_depth",
    companies: ["Amazon", "Meta", "Microsoft"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. Return the number of nodes on the longest path from the root down to a leaf.",
    example: "[3,9,20,null,null,15,7] -> 3",
    signatures: {
      python: "def max_depth(tree):\n    # your code here\n    pass\n",
      javascript: "function max_depth(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
      { args: [[1, null, 2]], expected: 2 },
      { args: [[]], expected: 0 },
      { args: [[0]], expected: 1 },
      { args: [[1, 2, 3, 4, null, null, 5]], expected: 3 },
    ],
    strongAnswerCovers:
      "Recursion is natural here. Ask for the iterative BFS version and the space cost of each, plus what happens on a degenerate tree.",
  },
  {
    id: "invert-tree",
    pattern: "trees",
    tiers: ["junior"],
    title: "Invert a Binary Tree",
    fn: "invert_tree",
    companies: ["Google", "Amazon"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. Mirror the tree left-to-right and return the result as a level-order array with trailing nulls removed.",
    example: "[4,2,7,1,3,6,9] -> [4,7,2,9,6,3,1]",
    signatures: {
      python: "def invert_tree(tree):\n    # your code here\n    pass\n",
      javascript: "function invert_tree(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
      { args: [[2, 1, 3]], expected: [2, 3, 1] },
      { args: [[]], expected: [] },
      { args: [[1]], expected: [1] },
    ],
    strongAnswerCovers:
      "A short recursion, so push on the traversal choice and the iterative version with an explicit queue or stack.",
  },
  {
    id: "same-tree",
    pattern: "trees",
    tiers: ["junior"],
    title: "Identical Trees",
    fn: "is_same_tree",
    companies: ["Amazon", "Apple"],
    statement:
      "Two binary trees are given as level-order arrays where null marks a missing child. Return true if they have the same shape and the same values in the same positions.",
    example: "[1,2,3] and [1,2,3] -> true",
    signatures: {
      python: "def is_same_tree(a, b):\n    # your code here\n    pass\n",
      javascript: "function is_same_tree(a, b) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3], [1, 2, 3]], expected: true },
      { args: [[1, 2], [1, null, 2]], expected: false },
      { args: [[], []], expected: true },
      { args: [[1, 2, 1], [1, 1, 2]], expected: false },
    ],
    strongAnswerCovers:
      "Watch that structure is compared, not just values: [1,2] and [1,null,2] must differ. Both-null and one-null base cases must be separate.",
  },
  {
    id: "level-order-traversal",
    pattern: "trees",
    tiers: ["mid"],
    title: "Level Order Traversal",
    fn: "level_order",
    companies: ["Amazon", "Meta", "LinkedIn"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. Return a list of lists holding the values at each depth, from the root down.",
    example: "[3,9,20,null,null,15,7] -> [[3],[9,20],[15,7]]",
    signatures: {
      python: "def level_order(tree):\n    # your code here\n    pass\n",
      javascript: "function level_order(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
      { args: [[1]], expected: [[1]] },
      { args: [[]], expected: [] },
      { args: [[1, 2, null, 3]], expected: [[1], [2], [3]] },
    ],
    strongAnswerCovers:
      "Needs a level boundary, either by snapshotting the queue length or swapping lists. Losing the boundary and flattening everything is the common bug.",
  },
  {
    id: "validate-bst",
    pattern: "trees",
    tiers: ["senior"],
    title: "Validate a Binary Search Tree",
    fn: "is_valid_bst",
    companies: ["Amazon", "Meta", "Google"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. Return true if it is a valid binary search tree: every value in a node's left subtree is smaller than the node, and every value in its right subtree is larger.",
    example: "[5,1,4,null,null,3,6] -> false",
    signatures: {
      python: "def is_valid_bst(tree):\n    # your code here\n    pass\n",
      javascript: "function is_valid_bst(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 1, 3]], expected: true },
      { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
      { args: [[]], expected: true },
      { args: [[1]], expected: true },
      { args: [[5, 4, 6, null, null, 3, 7]], expected: false },
      { args: [[10, 5, 15, null, null, 6, 20]], expected: false },
    ],
    strongAnswerCovers:
      "The trap is checking only parent against child. A correct answer carries min/max bounds down, or does an in-order walk checking it is strictly increasing. [10,5,15,null,null,6,20] catches the shallow version.",
  },
  {
    id: "lowest-common-ancestor-bst",
    pattern: "trees",
    tiers: ["mid"],
    title: "Lowest Common Ancestor in a BST",
    fn: "lca_bst",
    companies: ["Amazon", "Meta"],
    statement:
      "A binary search tree is given as a level-order array where null marks a missing child, along with two values present in it. Return the value of the deepest node that has both of them as descendants, where a node may be its own descendant.",
    example: "[6,2,8,0,4,7,9], p = 2, q = 8 -> 6",
    signatures: {
      python: "def lca_bst(tree, p, q):\n    # your code here\n    pass\n",
      javascript: "function lca_bst(tree, p, q) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[6, 2, 8, 0, 4, 7, 9], 2, 8], expected: 6 },
      { args: [[6, 2, 8, 0, 4, 7, 9], 2, 4], expected: 2 },
      { args: [[2, 1], 2, 1], expected: 2 },
      { args: [[5, 3, 8], 3, 8], expected: 5 },
    ],
    strongAnswerCovers:
      "Should exploit the BST ordering to walk down in O(h) rather than searching the whole tree. Ask how the answer changes for a general binary tree.",
  },
];

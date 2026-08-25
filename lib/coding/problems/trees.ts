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
  {
    id: "symmetric-tree",
    pattern: "trees",
    tiers: ["junior"],
    title: "Symmetric Binary Tree",
    fn: "is_symmetric",
    companies: ["Microsoft"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. Return true if it is a mirror of itself around its center.",
    example: "[1,2,2,3,4,4,3] -> true",
    signatures: {
      python: "def is_symmetric(tree):\n    # your code here\n    pass\n",
      javascript: "function is_symmetric(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 2, 3, 4, 4, 3]], expected: true },
      { args: [[1, 2, 2, null, 3, null, 3]], expected: false },
      { args: [[]], expected: true },
      { args: [[1]], expected: true },
    ],
    strongAnswerCovers:
      "A recursive mirror check comparing the outer pair and inner pair of grandchildren at each level. Ask for the iterative version with an explicit queue holding pairs of nodes to compare.",
  },
  {
    id: "lowest-common-ancestor-tree",
    pattern: "trees",
    tiers: ["mid"],
    title: "Lowest Common Ancestor in a Binary Tree",
    fn: "lca_general",
    companies: ["Meta", "Apple"],
    statement:
      "A binary tree (not necessarily a search tree) is given as a level-order array where null marks a missing child, along with two values present in it, assumed unique. Return the value of the deepest node that has both as descendants, where a node may be its own descendant.",
    example: "[3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1 -> 3",
    signatures: {
      python: "def lca_general(tree, p, q):\n    # your code here\n    pass\n",
      javascript: "function lca_general(tree, p, q) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1], expected: 3 },
      { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 4], expected: 5 },
      { args: [[1, 2], 1, 2], expected: 1 },
    ],
    strongAnswerCovers:
      "Without the BST ordering to exploit, this is a postorder search: return the node itself if found, otherwise whichever side returned something, or both if this node is the split point. The sibling problem lowest-common-ancestor-bst is the special case worth contrasting -- ask what shortcut the ordering enabled there that doesn't exist here.",
  },
  {
    id: "binary-tree-max-path-sum",
    pattern: "trees",
    tiers: ["senior"],
    title: "Maximum Path Sum in a Binary Tree",
    fn: "max_path_sum",
    companies: ["Google"],
    statement:
      "A binary tree is given as a level-order array where null marks a missing child. A path is any sequence of nodes connected by edges, not necessarily passing through the root, and does not need to include the whole tree. Return the largest sum of node values along any path.",
    example: "[-10,9,20,null,null,15,7] -> 42",
    signatures: {
      python: "def max_path_sum(tree):\n    # your code here\n    pass\n",
      javascript: "function max_path_sum(tree) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3]], expected: 6 },
      { args: [[-10, 9, 20, null, null, 15, 7]], expected: 42 },
      { args: [[2, -1]], expected: 2 },
      { args: [[-3]], expected: -3 },
    ],
    strongAnswerCovers:
      "Two different things are computed at each node: the best path THROUGH it (which can use both children, updates the global answer, but can never be returned upward) and the best path EXTENDING from it upward (which can only use one child, since a path can't branch). Negative subtree contributions get clamped to zero rather than subtracted.",
  },
  {
    id: "construct-tree-preorder-inorder",
    pattern: "trees",
    tiers: ["senior"],
    title: "Build a Tree From Preorder and Inorder Traversals",
    fn: "build_tree",
    companies: ["Microsoft"],
    statement:
      "Given the preorder and inorder traversals of a binary tree with unique values, reconstruct the tree. Return it as a level-order array with trailing nulls removed.",
    example: "preorder [3,9,20,15,7], inorder [9,3,15,20,7] -> [3,9,20,null,null,15,7]",
    signatures: {
      python: "def build_tree(preorder, inorder):\n    # your code here\n    pass\n",
      javascript: "function build_tree(preorder, inorder) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], expected: [3, 9, 20, null, null, 15, 7] },
      { args: [[-1], [-1]], expected: [-1] },
      { args: [[1, 2], [2, 1]], expected: [1, 2] },
    ],
    strongAnswerCovers:
      "Preorder gives roots in the order to build them; inorder gives, for a known root, exactly which values fall in its left versus right subtree. A hash map from value to inorder index turns the naive O(n) subtree search into O(1), which is the difference between an O(n^2) and an O(n) solution.",
  },
];

import type { Problem } from "./types";

/** backtracking — add new problems to this array. */
export const BACKTRACKING: Problem[] = [
  {
    id: "subsets",
    pattern: "backtracking",
    tiers: ["mid"],
    title: "All Subsets",
    fn: "subsets",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "Given an array of distinct integers, return every possible subset including the empty one. The order of the subsets does not matter.",
    example: "[1,2] -> [[],[1],[2],[1,2]]",
    signatures: {
      python: "def subsets(nums):\n    # your code here\n    pass\n",
      javascript: "function subsets(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2]], expected: [[], [1], [2], [1, 2]], unordered: true },
      { args: [[1, 2, 3]], expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]], unordered: true },
      { args: [[]], expected: [[]], unordered: true },
      { args: [[0]], expected: [[], [0]], unordered: true },
    ],
    strongAnswerCovers:
      "Either the include/exclude recursion or the iterative doubling. Should state the output is 2^n, so that is the floor on complexity.",
  },
  {
    id: "permutations",
    pattern: "backtracking",
    tiers: ["mid"],
    title: "All Permutations",
    fn: "permutations",
    companies: ["Amazon", "Microsoft", "Google", "Meta"],
    statement:
      "Given an array of distinct integers, return every ordering of them. The order of the results does not matter.",
    example: "[1,2,3] -> six orderings",
    signatures: {
      python: "def permutations(nums):\n    # your code here\n    pass\n",
      javascript: "function permutations(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3]], expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], unordered: true },
      { args: [[0, 1]], expected: [[0, 1], [1, 0]], unordered: true },
      { args: [[1]], expected: [[1]], unordered: true },
      { args: [[]], expected: [[]], unordered: true },
    ],
    strongAnswerCovers:
      "Watch the undo step in the backtracking, or whether they avoid it by copying. n! outputs, so ask what they would do if n were 12.",
  },
  {
    id: "combination-sum",
    pattern: "backtracking",
    tiers: ["mid", "senior"],
    title: "Combination Sum",
    fn: "combination_sum",
    companies: ["Amazon", "Meta", "Airbnb", "Google", "Microsoft"],
    statement:
      "Given distinct positive integers and a target, return every unique combination that sums to the target. A number may be reused any number of times. Combinations differing only in order count as the same.",
    example: "[2,3,6,7], target 7 -> [[2,2,3],[7]]",
    signatures: {
      python: "def combination_sum(nums, target):\n    # your code here\n    pass\n",
      javascript: "function combination_sum(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 3, 6, 7], 7], expected: [[2, 2, 3], [7]], unordered: true },
      { args: [[2, 3, 5], 8], expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]], unordered: true },
      { args: [[2], 1], expected: [], unordered: true },
      { args: [[3], 3], expected: [[3]], unordered: true },
    ],
    strongAnswerCovers:
      "Passing the start index is what prevents permuted duplicates; a visited set instead is a red flag. Pruning once the value exceeds the remainder is the natural optimisation.",
  },
  {
    id: "generate-parentheses",
    pattern: "backtracking",
    tiers: ["mid"],
    title: "Generate Balanced Parentheses",
    fn: "generate_parens",
    companies: ["Amazon", "Google", "Uber", "Meta", "Microsoft"],
    statement:
      "Given a count n, return every string of n opening and n closing brackets that is balanced. The order of the results does not matter.",
    example: "n = 2 -> [\"(())\",\"()()\"]",
    signatures: {
      python: "def generate_parens(n):\n    # your code here\n    pass\n",
      javascript: "function generate_parens(n) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [2], expected: ["(())", "()()"], unordered: true },
      { args: [3], expected: ["((()))", "(()())", "(())()", "()(())", "()()()"], unordered: true },
      { args: [1], expected: ["()"], unordered: true },
      { args: [0], expected: [""], unordered: true },
    ],
    strongAnswerCovers:
      "Building only valid strings beats generating all and filtering. The two invariants (open <= n, close < open) are the whole insight.",
  },
  {
    id: "letter-combinations-phone",
    pattern: "backtracking",
    tiers: ["mid"],
    title: "Letter Combinations of a Phone Number",
    fn: "letter_combinations",
    companies: ["Meta", "Microsoft", "Amazon", "Google", "Apple"],
    statement:
      "Given a string of digits 2-9, return every possible letter combination the digits could represent on a phone keypad, in any order.",
    example: "\"23\" -> [\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]",
    signatures: {
      python: "def letter_combinations(digits):\n    # your code here\n    pass\n",
      javascript: "function letter_combinations(digits) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["23"], expected: ["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"], unordered: true },
      { args: [""], expected: [], unordered: true },
      { args: ["2"], expected: ["a", "b", "c"], unordered: true },
    ],
    strongAnswerCovers:
      "Standard backtracking: one recursive call per digit, branching over that digit's letters. The empty-string edge case (return [], not ['']) is the one people get backwards.",
  },
  {
    id: "word-search",
    pattern: "backtracking",
    tiers: ["mid"],
    title: "Find a Single Word in a Letter Grid",
    fn: "word_exists",
    companies: ["Amazon", "Microsoft", "Netflix", "Google", "Meta"],
    statement:
      "Given a grid of letters and a single target word, return whether the word can be spelled by walking between horizontally or vertically adjacent cells without reusing a cell.",
    example: "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], \"ABCCED\" -> true",
    signatures: {
      python: "def word_exists(grid, word):\n    # your code here\n    pass\n",
      javascript: "function word_exists(grid, word) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCCED"], expected: true },
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "SEE"], expected: true },
      { args: [[["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]], "ABCB"], expected: false },
      { args: [[["A"]], "A"], expected: true },
    ],
    strongAnswerCovers:
      "Backtracking DFS with a visited-marker swapped in and restored on the cell itself (rather than a separate visited set) is the space-efficient version. This is the single-word sibling of Word Search II -- ask when a trie-based multi-word search would be worth the setup cost over running this once per word.",
  },
];

import type { Problem } from "./types";

/** arrays-hashing — add new problems to this array. */
export const ARRAYS_HASHING: Problem[] = [
  {
    id: "two-sum",
    pattern: "arrays-hashing",
    tiers: ["junior"],
    title: "Two Sum",
    fn: "two_sum",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Each input has exactly one solution, and you may not use the same element twice.",
    example: "nums = [2, 7, 11, 15], target = 9 -> [0, 1]",
    signatures: {
      python: "def two_sum(nums, target):\n    # your code here\n    pass\n",
      javascript: "function two_sum(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { args: [[0, 4, 3, 0], 0], expected: [0, 3] },
    ],
    strongAnswerCovers:
      "States the brute-force O(n^2) first, then reaches the hash-map O(n) single pass unprompted. Handles negatives and duplicates. Explains the space/time trade-off.",
  },
  {
    id: "contains-duplicate",
    pattern: "arrays-hashing",
    tiers: ["junior"],
    title: "Contains Duplicate",
    fn: "has_duplicate",
    companies: ["Amazon", "Apple", "Google", "Meta", "Microsoft"],
    statement:
      "Given an array of integers, return true if any value appears more than once, and false if every element is distinct.",
    example: "[1, 2, 3, 1] -> true",
    signatures: {
      python: "def has_duplicate(nums):\n    # your code here\n    pass\n",
      javascript: "function has_duplicate(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 1]], expected: true },
      { args: [[1, 2, 3, 4]], expected: false },
      { args: [[]], expected: false },
      { args: [[7]], expected: false },
      { args: [[2, 2]], expected: true },
    ],
    strongAnswerCovers:
      "Recognises the set solution immediately and can state why it beats sorting. Should mention the O(n) space cost and when sorting in place would be preferable.",
  },
  {
    id: "valid-anagram",
    pattern: "arrays-hashing",
    tiers: ["junior"],
    title: "Valid Anagram",
    fn: "is_anagram",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "Given two strings, return true if the second is a rearrangement of the first using exactly the same letters with the same counts.",
    example: "\"listen\", \"silent\" -> true",
    signatures: {
      python: "def is_anagram(s, t):\n    # your code here\n    pass\n",
      javascript: "function is_anagram(s, t) {\n  // your code here\n}\n",
    },
    tests: [
      { args: ["listen", "silent"], expected: true },
      { args: ["rat", "car"], expected: false },
      { args: ["", ""], expected: true },
      { args: ["aab", "aba"], expected: true },
      { args: ["a", "aa"], expected: false },
    ],
    strongAnswerCovers:
      "Compares counts rather than sorting, and knows sorting is O(n log n) versus O(n). Asks about unicode or case sensitivity before assuming ASCII.",
  },
  {
    id: "group-anagrams",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Group Anagrams",
    fn: "group_anagrams",
    companies: ["Amazon", "Uber", "Meta", "Google", "Microsoft", "Apple"],
    statement:
      "Given a list of words, group together the words that are rearrangements of one another. Return the groups in any order.",
    example: "[\"eat\",\"tea\",\"tan\",\"ate\"] -> [[\"eat\",\"tea\",\"ate\"],[\"tan\"]]",
    signatures: {
      python: "def group_anagrams(words):\n    # your code here\n    pass\n",
      javascript: "function group_anagrams(words) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]], unordered: true },
      { args: [[""]], expected: [[""]], unordered: true },
      { args: [["a"]], expected: [["a"]], unordered: true },
      { args: [["abc", "cba", "bca", "xyz"]], expected: [["abc", "cba", "bca"], ["xyz"]], unordered: true },
    ],
    strongAnswerCovers:
      "Picks a canonical key (sorted letters or a count tuple) and can justify it. Strong candidates note the count-tuple key is O(n*k) versus O(n*k log k) for sorting.",
  },
  {
    id: "top-k-frequent",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Top K Frequent Elements",
    fn: "top_k_frequent",
    companies: ["Amazon", "Meta", "Netflix", "Google", "Microsoft", "Apple"],
    statement:
      "Given an array of integers and a number k, return the k values that occur most often. The order of the returned values does not matter.",
    example: "nums = [1,1,1,2,2,3], k = 2 -> [1, 2]",
    signatures: {
      python: "def top_k_frequent(nums, k):\n    # your code here\n    pass\n",
      javascript: "function top_k_frequent(nums, k) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2], unordered: true },
      { args: [[1], 1], expected: [1], unordered: true },
      { args: [[4, 4, 4, 5, 5, 6], 2], expected: [4, 5], unordered: true },
      { args: [[1, 2, 3, 4], 4], expected: [1, 2, 3, 4], unordered: true },
    ],
    strongAnswerCovers:
      "Counts first, then chooses between a heap (O(n log k)) and bucket sort (O(n)). Should explain why a full sort is wasteful when k is small.",
  },
  {
    id: "product-except-self",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Product of Array Except Self",
    fn: "product_except_self",
    companies: ["Amazon", "Meta", "Apple", "Google", "Microsoft"],
    statement:
      "Given an array of integers, return an array where each position holds the product of every other element. Solve it without using division.",
    example: "[1,2,3,4] -> [24,12,8,6]",
    signatures: {
      python: "def product_except_self(nums):\n    # your code here\n    pass\n",
      javascript: "function product_except_self(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { args: [[2, 3]], expected: [3, 2] },
      { args: [[0, 0]], expected: [0, 0] },
    ],
    strongAnswerCovers:
      "Reaches the prefix/suffix product idea without division. Handles zeros correctly. Strong candidates do it with O(1) extra space beyond the output array.",
  },
  {
    id: "longest-consecutive",
    pattern: "arrays-hashing",
    tiers: ["senior"],
    title: "Longest Consecutive Run",
    fn: "longest_consecutive",
    companies: ["Google", "Meta", "Amazon", "Microsoft", "Apple"],
    statement:
      "Given an unsorted array of integers, find the length of the longest run of consecutive whole numbers present in the array. Aim for linear time.",
    example: "[100, 4, 200, 1, 3, 2] -> 4  (the run 1,2,3,4)",
    signatures: {
      python: "def longest_consecutive(nums):\n    # your code here\n    pass\n",
      javascript: "function longest_consecutive(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[100, 4, 200, 1, 3, 2]], expected: 4 },
      { args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], expected: 9 },
      { args: [[]], expected: 0 },
      { args: [[5]], expected: 1 },
      { args: [[1, 2, 0, 1]], expected: 3 },
    ],
    strongAnswerCovers:
      "Sees that only run-starts need expanding, which is what makes it O(n) rather than O(n^2). Sorting is an acceptable first answer but should be improved on.",
  },
  {
    id: "next-permutation",
    pattern: "arrays-hashing",
    tiers: ["mid"],
    title: "Next Lexicographic Permutation",
    fn: "next_permutation",
    companies: ["Meta", "Microsoft", "Amazon", "Google"],
    statement:
      "Given a list of numbers representing a permutation, return the next permutation in lexicographic order. If it is already the highest possible, return the lowest (sorted ascending).",
    example: "[1,2,3] -> [1,3,2]",
    signatures: {
      python: "def next_permutation(nums):\n    # your code here\n    pass\n",
      javascript: "function next_permutation(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 3]], expected: [1, 3, 2] },
      { args: [[3, 2, 1]], expected: [1, 2, 3] },
      { args: [[1, 1, 5]], expected: [1, 5, 1] },
      { args: [[1]], expected: [1] },
    ],
    strongAnswerCovers:
      "Find the rightmost ascent, swap it with the smallest element to its right that's still bigger than it, then reverse everything after that point. Each of those three steps has a reason; ask them to justify the reverse specifically (the suffix is descending at that point, so reversing it is what makes it the smallest possible arrangement).",
  },
  {
    id: "first-missing-positive",
    pattern: "arrays-hashing",
    tiers: ["senior"],
    title: "First Missing Positive Integer",
    fn: "first_missing_positive",
    companies: ["Meta", "Microsoft", "Amazon", "Google"],
    statement:
      "Given an unsorted array of integers, return the smallest positive integer that does not appear in it. Must run in O(n) time and O(1) extra space.",
    example: "[3,4,-1,1] -> 2",
    signatures: {
      python: "def first_missing_positive(nums):\n    # your code here\n    pass\n",
      javascript: "function first_missing_positive(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[1, 2, 0]], expected: 3 },
      { args: [[3, 4, -1, 1]], expected: 2 },
      { args: [[7, 8, 9, 11, 12]], expected: 1 },
      { args: [[]], expected: 1 },
      { args: [[1]], expected: 2 },
    ],
    strongAnswerCovers:
      "The O(1)-space trick: the answer must be between 1 and n+1, so each value can be placed at its own index (cyclic sort) using the array itself as the hash set. A hash-set solution is O(n) space and a fine warm-up, but the constraint is specifically there to push past it.",
  },
];

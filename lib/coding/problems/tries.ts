import type { Problem } from "./types";

/** tries — add new problems to this array. */
export const TRIES: Problem[] = [
  {
    id: "longest-common-prefix",
    pattern: "tries",
    tiers: ["junior"],
    title: "Longest Common Prefix",
    fn: "longest_common_prefix",
    companies: ["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement:
      "Given a list of words, return the longest starting string that all of them share. Return an empty string if there is none.",
    example: "[\"flower\",\"flow\",\"flight\"] -> \"fl\"",
    signatures: {
      python: "def longest_common_prefix(words):\n    # your code here\n    pass\n",
      javascript: "function longest_common_prefix(words) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["flower", "flow", "flight"]], expected: "fl" },
      { args: [["dog", "racecar", "car"]], expected: "" },
      { args: [[]], expected: "" },
      { args: [["a"]], expected: "a" },
      { args: [["ab", "ab"]], expected: "ab" },
    ],
    strongAnswerCovers:
      "A simple scan is fine, but ask when a trie would be worth building: repeated prefix queries over a fixed dictionary rather than one pass.",
  },
  {
    id: "prefix-counts",
    pattern: "tries",
    tiers: ["mid"],
    title: "Count Words by Prefix",
    fn: "count_by_prefix",
    companies: ["Google", "Amazon"],
    statement:
      "Given a dictionary of words and a list of prefixes, return for each prefix how many dictionary words start with it. Assume the prefix list is long, so preprocessing the dictionary is worthwhile.",
    example: "words [\"apple\",\"app\",\"apt\"], prefixes [\"ap\",\"app\"] -> [3, 2]",
    signatures: {
      python: "def count_by_prefix(words, prefixes):\n    # your code here\n    pass\n",
      javascript: "function count_by_prefix(words, prefixes) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["apple", "app", "apt"], ["ap", "app"]], expected: [3, 2] },
      { args: [["a"], ["a", "b"]], expected: [1, 0] },
      { args: [[], ["x"]], expected: [0] },
      { args: [["abc", "abd"], ["ab", "abc", ""]], expected: [2, 1, 2] },
    ],
    strongAnswerCovers:
      "This is the trie problem: build once, then answer each prefix in O(len(prefix)). Look for a count stored at each node rather than a subtree walk per query.",
  },
  {
    id: "word-search-grid",
    pattern: "tries",
    tiers: ["senior"],
    title: "Find Words in a Letter Grid",
    fn: "find_words",
    companies: ["Amazon", "Meta", "Google", "Microsoft"],
    statement:
      "Given a grid of letters and a list of target words, return which of those words can be spelled by walking between horizontally or vertically adjacent cells without reusing a cell in a single word.",
    example: "grid [[\"o\",\"a\"],[\"e\",\"t\"]], words [\"oat\",\"ate\"] -> [\"oat\",\"ate\"]",
    signatures: {
      python: "def find_words(grid, words):\n    # your code here\n    pass\n",
      javascript: "function find_words(grid, words) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[["o", "a"], ["e", "t"]], ["oat", "ate", "tea", "zzz"]], expected: ["oat", "ate"], unordered: true },
      { args: [[["a"]], ["a", "b"]], expected: ["a"], unordered: true },
      { args: [[["a", "b"], ["c", "d"]], ["abdc", "abcd"]], expected: ["abdc"], unordered: true },
    ],
    strongAnswerCovers:
      "Backtracking per word is the baseline. The strong answer builds a trie of the words and walks the grid once, pruning branches no word can extend.",
  },
  {
    id: "word-search-wildcard",
    pattern: "tries",
    tiers: ["mid"],
    title: "Add and Search Words With Wildcards",
    fn: "search_words",
    companies: ["Google", "Meta", "Amazon"],
    statement:
      "First add every word in words_to_add to a dictionary. Then answer each query: a query may contain '.', which matches any single character. Return, in order, whether each query matches a word in the dictionary.",
    example: "add [\"bad\",\"dad\",\"mad\"], query \".ad\" -> true",
    signatures: {
      python: "def search_words(words_to_add, queries):\n    # your code here\n    pass\n",
      javascript: "function search_words(words_to_add, queries) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["bad", "dad", "mad"], ["pad", ".ad", "b..", "bad"]], expected: [false, true, true, true] },
      { args: [["a"], ["a", ".", "aa", "a."]], expected: [true, true, false, false] },
    ],
    strongAnswerCovers:
      "A trie plus DFS that branches over every child on a '.' is the expected shape. A query only matches if the DFS reaches the exact end of the word AND that node is marked as a real word ending, not just any node that exists along the path.",
  },
  {
    id: "replace-words-with-roots",
    pattern: "tries",
    tiers: ["junior"],
    title: "Replace Words With Their Shortest Root",
    fn: "replace_words",
    companies: ["Google", "Amazon"],
    statement:
      "Given a list of root words and a sentence, replace every word in the sentence with the shortest root that is a prefix of it. If no root matches, leave the word unchanged. Words are separated by single spaces.",
    example: "roots [\"cat\",\"bat\",\"rat\"], sentence \"the cattle was rattled by the battery\" -> \"the cat was rat by the bat\"",
    signatures: {
      python: "def replace_words(roots, sentence):\n    # your code here\n    pass\n",
      javascript: "function replace_words(roots, sentence) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [["cat", "bat", "rat"], "the cattle was rattled by the battery"], expected: "the cat was rat by the bat" },
      { args: [["a", "b", "c"], "aadsfasf absfasf acbfnasv acbfnasv"], expected: "a a a a" },
    ],
    strongAnswerCovers:
      "A trie of the roots, walked one character at a time until a root-end node is found, is the intended shape. A plain prefix scan over a small root set is a legitimate alternative -- ask what changes with a million-entry root dictionary.",
  },
  {
    id: "maximum-xor-pair",
    pattern: "tries",
    tiers: ["senior"],
    title: "Maximum XOR of Two Numbers",
    fn: "max_xor",
    companies: ["Google"],
    statement:
      "Given an array of non-negative integers, return the maximum value of nums[i] XOR nums[j] over any pair of elements.",
    example: "[3,10,5,25,2,8] -> 28",
    signatures: {
      python: "def max_xor(nums):\n    # your code here\n    pass\n",
      javascript: "function max_xor(nums) {\n  // your code here\n}\n",
    },
    tests: [
      { args: [[3, 10, 5, 25, 2, 8]], expected: 28 },
      { args: [[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]], expected: 127 },
      { args: [[0]], expected: 0 },
      { args: [[0, 0]], expected: 0 },
    ],
    strongAnswerCovers:
      "Same trie shape as the string problems, over bits instead of characters: insert every number's binary representation, then greedily walk toward the opposite bit at each level. The O(n^2) pairwise check is a fine starting point, but they should explain WHY the greedy opposite-bit choice maximizes the result.",
  },
];

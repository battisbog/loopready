import type { Problem } from "./types";

/** tries — add new problems to this array. */
export const TRIES: Problem[] = [
  {
    id: "longest-common-prefix",
    pattern: "tries",
    tiers: ["junior"],
    title: "Longest Common Prefix",
    fn: "longest_common_prefix",
    companies: ["Amazon", "Google"],
    statement:
      "Given a list of words, return the longest starting string that all of them share. Return an empty string if there is none.",
    example: "[\"flower\",\"flow\",\"flight\"] -> \"fl\"",
    signatures: {
      python: "def longest_common_prefix(words):\\n    # your code here\\n    pass\\n",
      javascript: "function longest_common_prefix(words) {\\n  // your code here\\n}\\n",
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
      python: "def count_by_prefix(words, prefixes):\\n    # your code here\\n    pass\\n",
      javascript: "function count_by_prefix(words, prefixes) {\\n  // your code here\\n}\\n",
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
    companies: ["Amazon", "Meta", "Google"],
    statement:
      "Given a grid of letters and a list of target words, return which of those words can be spelled by walking between horizontally or vertically adjacent cells without reusing a cell in a single word.",
    example: "grid [[\"o\",\"a\"],[\"e\",\"t\"]], words [\"oat\",\"ate\"] -> [\"oat\",\"ate\"]",
    signatures: {
      python: "def find_words(grid, words):\\n    # your code here\\n    pass\\n",
      javascript: "function find_words(grid, words) {\\n  // your code here\\n}\\n",
    },
    tests: [
      { args: [[["o", "a"], ["e", "t"]], ["oat", "ate", "tea", "zzz"]], expected: ["oat", "ate"], unordered: true },
      { args: [[["a"]], ["a", "b"]], expected: ["a"], unordered: true },
      { args: [[["a", "b"], ["c", "d"]], ["abdc", "abcd"]], expected: ["abdc"], unordered: true },
    ],
    strongAnswerCovers:
      "Backtracking per word is the baseline. The strong answer builds a trie of the words and walks the grid once, pruning branches no word can extend.",
  },
];

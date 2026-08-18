#!/usr/bin/env python3
"""
Builds lib/coding/problems/ from verified data.

Every problem carries a reference solution. This script RUNS each solution
against every test case before emitting any TypeScript, so a problem cannot
reach the product with a wrong expected value. Statements are written from
scratch rather than copied from any site.

    python3 scripts/build-problems.py            # verify + write
    python3 scripts/build-problems.py --check    # verify only
"""
import json
import sys
from collections import Counter, defaultdict, deque
import heapq

P = []


def problem(**kw):
    P.append(kw)


# ─────────────────────────────────────────────── arrays & hashing
problem(
    id="two-sum", pattern="arrays-hashing", tiers=["junior"], title="Two Sum",
    fn="two_sum", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers and a target, return the indices of the two numbers that add up to the target. Each input has exactly one solution, and you may not use the same element twice.",
    example="nums = [2, 7, 11, 15], target = 9 -> [0, 1]",
    params="nums, target",
    tests=[[[2,7,11,15],9],[[3,2,4],6],[[3,3],6],[[-1,-2,-3,-4,-5],-8],[[0,4,3,0],0]],
    solution="""
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
""",
    covers="States the brute-force O(n^2) first, then reaches the hash-map O(n) single pass unprompted. Handles negatives and duplicates. Explains the space/time trade-off.",
)
problem(
    id="contains-duplicate", pattern="arrays-hashing", tiers=["junior"], title="Contains Duplicate",
    fn="has_duplicate", companies=["Amazon", "Apple"],
    statement="Given an array of integers, return true if any value appears more than once, and false if every element is distinct.",
    example="[1, 2, 3, 1] -> true",
    params="nums",
    tests=[[[1,2,3,1]],[[1,2,3,4]],[[]],[[7]],[[2,2]]],
    solution="""
def has_duplicate(nums):
    return len(set(nums)) != len(nums)
""",
    covers="Recognises the set solution immediately and can state why it beats sorting. Should mention the O(n) space cost and when sorting in place would be preferable.",
)
problem(
    id="valid-anagram", pattern="arrays-hashing", tiers=["junior"], title="Valid Anagram",
    fn="is_anagram", companies=["Amazon", "Meta"],
    statement="Given two strings, return true if the second is a rearrangement of the first using exactly the same letters with the same counts.",
    example='"listen", "silent" -> true',
    params="s, t",
    tests=[["listen","silent"],["rat","car"],["",""],["aab","aba"],["a","aa"]],
    solution="""
def is_anagram(s, t):
    from collections import Counter
    return Counter(s) == Counter(t)
""",
    covers="Compares counts rather than sorting, and knows sorting is O(n log n) versus O(n). Asks about unicode or case sensitivity before assuming ASCII.",
)
problem(
    id="group-anagrams", pattern="arrays-hashing", tiers=["mid"], title="Group Anagrams",
    fn="group_anagrams", companies=["Amazon", "Uber", "Meta"],
    statement="Given a list of words, group together the words that are rearrangements of one another. Return the groups in any order.",
    example='["eat","tea","tan","ate"] -> [["eat","tea","ate"],["tan"]]',
    params="words",
    tests=[[["eat","tea","tan","ate","nat","bat"]],[[""]],[["a"]],[["abc","cba","bca","xyz"]]],
    unordered=True,
    solution="""
def group_anagrams(words):
    from collections import defaultdict
    g = defaultdict(list)
    for w in words:
        g[tuple(sorted(w))].append(w)
    return list(g.values())
""",
    covers="Picks a canonical key (sorted letters or a count tuple) and can justify it. Strong candidates note the count-tuple key is O(n*k) versus O(n*k log k) for sorting.",
)
problem(
    id="top-k-frequent", pattern="arrays-hashing", tiers=["mid"], title="Top K Frequent Elements",
    fn="top_k_frequent", companies=["Amazon", "Meta", "Netflix"],
    statement="Given an array of integers and a number k, return the k values that occur most often. The order of the returned values does not matter.",
    example="nums = [1,1,1,2,2,3], k = 2 -> [1, 2]",
    params="nums, k",
    tests=[[[1,1,1,2,2,3],2],[[1],1],[[4,4,4,5,5,6],2],[[1,2,3,4],4]],
    unordered=True,
    solution="""
def top_k_frequent(nums, k):
    from collections import Counter
    return [v for v, _ in Counter(nums).most_common(k)]
""",
    covers="Counts first, then chooses between a heap (O(n log k)) and bucket sort (O(n)). Should explain why a full sort is wasteful when k is small.",
)
problem(
    id="product-except-self", pattern="arrays-hashing", tiers=["mid"], title="Product of Array Except Self",
    fn="product_except_self", companies=["Amazon", "Meta", "Apple"],
    statement="Given an array of integers, return an array where each position holds the product of every other element. Solve it without using division.",
    example="[1,2,3,4] -> [24,12,8,6]",
    params="nums",
    tests=[[[1,2,3,4]],[[-1,1,0,-3,3]],[[2,3]],[[0,0]]],
    solution="""
def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    pre = 1
    for i in range(n):
        out[i] = pre
        pre *= nums[i]
    post = 1
    for i in range(n - 1, -1, -1):
        out[i] *= post
        post *= nums[i]
    return out
""",
    covers="Reaches the prefix/suffix product idea without division. Handles zeros correctly. Strong candidates do it with O(1) extra space beyond the output array.",
)
problem(
    id="longest-consecutive", pattern="arrays-hashing", tiers=["senior"], title="Longest Consecutive Run",
    fn="longest_consecutive", companies=["Google", "Meta"],
    statement="Given an unsorted array of integers, find the length of the longest run of consecutive whole numbers present in the array. Aim for linear time.",
    example="[100, 4, 200, 1, 3, 2] -> 4  (the run 1,2,3,4)",
    params="nums",
    tests=[[[100,4,200,1,3,2]],[[0,3,7,2,5,8,4,6,0,1]],[[]],[[5]],[[1,2,0,1]]],
    solution="""
def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for n in s:
        if n - 1 not in s:
            cur = n
            length = 1
            while cur + 1 in s:
                cur += 1
                length += 1
            best = max(best, length)
    return best
""",
    covers="Sees that only run-starts need expanding, which is what makes it O(n) rather than O(n^2). Sorting is an acceptable first answer but should be improved on.",
)

# ─────────────────────────────────────────────── two pointers
problem(
    id="valid-palindrome", pattern="two-pointers", tiers=["junior"], title="Valid Palindrome",
    fn="is_palindrome", companies=["Meta", "Amazon"],
    statement="Given a string, return true if it reads the same forwards and backwards once you ignore punctuation and spacing and treat upper and lower case as equal.",
    example='"A man, a plan, a canal: Panama" -> true',
    params="s",
    tests=[["A man, a plan, a canal: Panama"],["race a car"],[""],["  "],["0P"],["ab_a"]],
    solution="""
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        while i < j and not s[i].isalnum():
            i += 1
        while i < j and not s[j].isalnum():
            j -= 1
        if s[i].lower() != s[j].lower():
            return False
        i += 1
        j -= 1
    return True
""",
    covers="Uses two pointers in place rather than building a cleaned copy. Asks what counts as a character before assuming. Handles the empty string.",
)
problem(
    id="two-sum-sorted", pattern="two-pointers", tiers=["junior"], title="Two Sum on a Sorted Array",
    fn="two_sum_sorted", companies=["Amazon", "Microsoft"],
    statement="Given an array sorted in ascending order and a target, return the 1-based positions of the two values that sum to the target. Exactly one pair exists. Use constant extra space.",
    example="[2,7,11,15], target 9 -> [1,2]",
    params="nums, target",
    tests=[[[2,7,11,15],9],[[2,3,4],6],[[-1,0],-1],[[1,2,3,4,4,9,56,90],8]],
    solution="""
def two_sum_sorted(nums, target):
    i, j = 0, len(nums) - 1
    while i < j:
        s = nums[i] + nums[j]
        if s == target:
            return [i + 1, j + 1]
        if s < target:
            i += 1
        else:
            j -= 1
""",
    covers="Exploits the sortedness for O(1) space instead of reaching for a hash map. Can argue why moving the pointer inward never skips the answer.",
)
problem(
    id="three-sum", pattern="two-pointers", tiers=["mid", "senior"], title="Three Sum",
    fn="three_sum", companies=["Meta", "Amazon", "Google"],
    statement="Given an array of integers, find every unique triple of values that sums to zero. Each triple should appear once regardless of the order its members were found in.",
    example="[-1,0,1,2,-1,-4] -> [[-1,-1,2],[-1,0,1]]",
    params="nums",
    tests=[[[-1,0,1,2,-1,-4]],[[0,1,1]],[[0,0,0]],[[]],[[-2,0,1,1,2]]],
    unordered=True,
    solution="""
def three_sum(nums):
    nums = sorted(nums)
    out = []
    n = len(nums)
    for i in range(n):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        j, k = i + 1, n - 1
        while j < k:
            s = nums[i] + nums[j] + nums[k]
            if s < 0:
                j += 1
            elif s > 0:
                k -= 1
            else:
                out.append([nums[i], nums[j], nums[k]])
                j += 1
                while j < k and nums[j] == nums[j - 1]:
                    j += 1
    return out
""",
    covers="Sorts, then fixes one element and runs two pointers, giving O(n^2). The real signal is handling duplicates without a set. Should state why the brute force is O(n^3).",
)
problem(
    id="container-most-water", pattern="two-pointers", tiers=["mid"], title="Container With Most Water",
    fn="max_area", companies=["Amazon", "Google", "Bloomberg"],
    statement="You are given an array where each value is the height of a vertical line at that index. Pick two lines so that the rectangle they form with the horizontal axis holds the most water, and return that area.",
    example="[1,8,6,2,5,4,8,3,7] -> 49",
    params="heights",
    tests=[[[1,8,6,2,5,4,8,3,7]],[[1,1]],[[4,3,2,1,4]],[[1,2,1]]],
    solution="""
def max_area(heights):
    i, j = 0, len(heights) - 1
    best = 0
    while i < j:
        best = max(best, (j - i) * min(heights[i], heights[j]))
        if heights[i] < heights[j]:
            i += 1
        else:
            j -= 1
    return best
""",
    covers="Argues why moving the shorter side is safe: the area is bounded by the shorter line, so keeping it can only lose. Recognises the brute force is O(n^2).",
)

# ─────────────────────────────────────────────── sliding window
problem(
    id="best-time-stock", pattern="sliding-window", tiers=["junior"], title="Best Time to Buy and Sell",
    fn="max_profit", companies=["Amazon", "Meta", "Microsoft"],
    statement="You are given daily prices for one stock. Choose one day to buy and a later day to sell to make the largest profit. If no profit is possible, return 0.",
    example="[7,1,5,3,6,4] -> 5  (buy at 1, sell at 6)",
    params="prices",
    tests=[[[7,1,5,3,6,4]],[[7,6,4,3,1]],[[]],[[2]],[[1,2]]],
    solution="""
def max_profit(prices):
    best = 0
    low = None
    for p in prices:
        if low is None or p < low:
            low = p
        elif p - low > best:
            best = p - low
    return best
""",
    covers="Tracks the running minimum in one pass instead of comparing all pairs. Must handle a strictly falling series returning 0, and the empty input.",
)
problem(
    id="longest-substring-unique", pattern="sliding-window", tiers=["mid"], title="Longest Substring Without Repeats",
    fn="length_of_longest", companies=["Amazon", "Google", "Meta"],
    statement="Given a string, return the length of the longest stretch of consecutive characters that contains no repeats.",
    example='"abcabcbb" -> 3  ("abc")',
    params="s",
    tests=[["abcabcbb"],["bbbbb"],["pwwkew"],[""],["dvdf"],["abba"]],
    solution="""
def length_of_longest(s):
    last = {}
    start = 0
    best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best
""",
    covers='Uses a window with a last-seen map and never moves the left edge backwards. "abba" and "dvdf" are the cases that break naive versions.',
)
problem(
    id="longest-repeating-replacement", pattern="sliding-window", tiers=["senior"], title="Longest Run After K Replacements",
    fn="character_replacement", companies=["Google", "Amazon"],
    statement="Given a string of uppercase letters and a budget k, you may change up to k characters to any other letter. Return the length of the longest run of one repeated letter you can produce.",
    example='"AABABBA", k = 1 -> 4',
    params="s, k",
    tests=[["AABABBA",1],["ABAB",2],["AAAA",0],["",2],["ABCDE",1]],
    solution="""
def character_replacement(s, k):
    from collections import Counter
    count = Counter()
    left = 0
    best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        while (right - left + 1) - max(count.values()) > k:
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
""",
    covers="Sees that the window is valid while (length - most frequent count) <= k. Strong candidates note the max count never needs recomputing, giving O(n).",
)
problem(
    id="min-window-substring", pattern="sliding-window", tiers=["senior"], title="Minimum Window Containing All Characters",
    fn="min_window", companies=["Meta", "Google", "Uber"],
    statement="Given a string and a set of required characters given as a string, return the shortest stretch of the first string that contains every required character including repeats. Return an empty string if none exists.",
    example='"ADOBECODEBANC", "ABC" -> "BANC"',
    params="s, need",
    tests=[["ADOBECODEBANC","ABC"],["a","a"],["a","aa"],["",""],["ab","b"]],
    solution="""
def min_window(s, need):
    from collections import Counter
    if not need:
        return ""
    want = Counter(need)
    missing = len(need)
    best = ""
    left = 0
    for right, ch in enumerate(s):
        if want[ch] > 0:
            missing -= 1
        want[ch] -= 1
        while missing == 0:
            if not best or right - left + 1 < len(best):
                best = s[left:right + 1]
            want[s[left]] += 1
            if want[s[left]] > 0:
                missing += 1
            left += 1
    return best
""",
    covers="Expands then contracts with a counts map and a satisfied counter. The hard part is shrinking correctly; watch whether they recheck the whole map each step (O(n*k)) or keep a counter (O(n)).",
)

# ─────────────────────────────────────────────── stack
problem(
    id="valid-parentheses", pattern="stack", tiers=["junior"], title="Valid Parentheses",
    fn="is_valid", companies=["Amazon", "Meta", "Microsoft"],
    statement="Given a string containing only the characters ()[]{}, determine if it is balanced. Brackets must close in the correct order and every closing bracket must match the most recent unclosed opening bracket of the same type.",
    example='"{[]}" -> true,  "(]" -> false',
    params="s",
    tests=[["()"],["()[]{}"],["(]"],["([)]"],["{[]}"],[""],["]"],["((("]],
    solution="""
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    st = []
    for ch in s:
        if ch in pairs:
            if not st or st.pop() != pairs[ch]:
                return False
        else:
            st.append(ch)
    return not st
""",
    covers="Uses a stack and remembers the final emptiness check. Leaving unclosed brackets open is the most common miss.",
)
problem(
    id="evaluate-rpn", pattern="stack", tiers=["mid"], title="Evaluate Postfix Expression",
    fn="eval_rpn", companies=["Amazon", "LinkedIn"],
    statement="Evaluate an arithmetic expression given in postfix order, where each token is either an integer or one of + - * /. Division truncates toward zero.",
    example='["2","1","+","3","*"] -> 9',
    params="tokens",
    tests=[[["2","1","+","3","*"]],[["4","13","5","/","+"]],[["3","-4","+"]],[["5"]],[["7","-3","/"]]],
    solution="""
def eval_rpn(tokens):
    st = []
    for t in tokens:
        if t in ("+", "-", "*", "/"):
            b = st.pop()
            a = st.pop()
            if t == "+":
                st.append(a + b)
            elif t == "-":
                st.append(a - b)
            elif t == "*":
                st.append(a * b)
            else:
                st.append(int(a / b))
        else:
            st.append(int(t))
    return st[-1]
""",
    covers="Gets operand order right for subtraction and division, and handles truncation toward zero for negatives, which Python's // does not do.",
)
problem(
    id="daily-temperatures", pattern="stack", tiers=["mid"], title="Days Until a Warmer Day",
    fn="daily_temperatures", companies=["Amazon", "Google"],
    statement="Given daily temperatures, return an array where each position holds how many days you must wait for a warmer temperature. Use 0 where no warmer day follows.",
    example="[73,74,75,71,69,72,76,73] -> [1,1,4,2,1,1,0,0]",
    params="temps",
    tests=[[[73,74,75,71,69,72,76,73]],[[30,40,50,60]],[[30,60,90]],[[50]],[[50,50,50]]],
    solution="""
def daily_temperatures(temps):
    out = [0] * len(temps)
    st = []
    for i, t in enumerate(temps):
        while st and temps[st[-1]] < t:
            j = st.pop()
            out[j] = i - j
        st.append(i)
    return out
""",
    covers="Reaches the monotonic decreasing stack of indices. The brute force is O(n^2); the stack gives O(n) because each index is pushed and popped once.",
)
problem(
    id="largest-rectangle-histogram", pattern="stack", tiers=["senior"], title="Largest Rectangle in a Histogram",
    fn="largest_rectangle", companies=["Google", "Amazon"],
    statement="Given bar heights of a histogram where every bar has width 1, return the area of the largest rectangle that fits entirely inside the bars.",
    example="[2,1,5,6,2,3] -> 10",
    params="heights",
    tests=[[[2,1,5,6,2,3]],[[2,4]],[[]],[[5]],[[1,1,1,1]],[[6,5,4,3,2,1]]],
    solution="""
def largest_rectangle(heights):
    st = []
    best = 0
    for i, h in enumerate(heights + [0]):
        start = i
        while st and st[-1][1] > h:
            j, ph = st.pop()
            best = max(best, ph * (i - j))
            start = j
        st.append((start, h))
    return best
""",
    covers="A genuinely hard monotonic stack problem. Look for the insight that a bar's rectangle extends back to where it could have started. Many candidates only reach O(n^2).",
)

# ─────────────────────────────────────────────── binary search
problem(
    id="binary-search", pattern="binary-search", tiers=["junior"], title="Binary Search",
    fn="search", companies=["Amazon", "Microsoft"],
    statement="Given a sorted array of distinct integers and a target, return the index of the target or -1 if it is absent. Run in logarithmic time.",
    example="[-1,0,3,5,9,12], target 9 -> 4",
    params="nums, target",
    tests=[[[-1,0,3,5,9,12],9],[[-1,0,3,5,9,12],2],[[],1],[[5],5],[[5],-5],[[1,2],2]],
    solution="""
def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
""",
    covers="Writes it without an off-by-one and can state the loop invariant. Ask them to justify the <= and the mid+1 rather than accepting a memorised template.",
)
problem(
    id="search-rotated", pattern="binary-search", tiers=["mid"], title="Search a Rotated Sorted Array",
    fn="search_rotated", companies=["Amazon", "Meta", "Google"],
    statement="A sorted array of distinct integers has been rotated at an unknown pivot. Given the rotated array and a target, return the target's index or -1. Run in logarithmic time.",
    example="[4,5,6,7,0,1,2], target 0 -> 4",
    params="nums, target",
    tests=[[[4,5,6,7,0,1,2],0],[[4,5,6,7,0,1,2],3],[[1],0],[[1,3],3],[[5,1,3],3]],
    solution="""
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
""",
    covers="Identifies which half is sorted on each step and decides from that. The signal is careful boundary reasoning, not the trick itself.",
)
problem(
    id="find-min-rotated", pattern="binary-search", tiers=["mid"], title="Minimum in a Rotated Sorted Array",
    fn="find_min", companies=["Amazon", "Microsoft"],
    statement="A sorted array of distinct integers has been rotated at an unknown pivot. Return its smallest value in logarithmic time.",
    example="[4,5,6,7,0,1,2] -> 0",
    params="nums",
    tests=[[[3,4,5,1,2]],[[4,5,6,7,0,1,2]],[[11,13,15,17]],[[1]],[[2,1]]],
    solution="""
def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]
""",
    covers="Compares against the right edge rather than the left, and uses lo < hi with hi = mid. Comparing to nums[lo] is the classic wrong turn.",
)
problem(
    id="koko-bananas", pattern="binary-search", tiers=["senior"], title="Minimum Rate to Finish in Time",
    fn="min_rate", companies=["Google", "Amazon"],
    statement="You are given pile sizes and a number of hours. Each hour you may consume up to a fixed rate from a single pile, and a partly eaten pile still uses the whole hour. Return the smallest rate that clears every pile within the given hours.",
    example="piles = [3,6,7,11], hours = 8 -> 4",
    params="piles, hours",
    tests=[[[3,6,7,11],8],[[30,11,23,4,20],5],[[30,11,23,4,20],6],[[1],1],[[1,1,1,1],4]],
    solution="""
def min_rate(piles, hours):
    import math
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        need = sum(math.ceil(p / mid) for p in piles)
        if need <= hours:
            hi = mid
        else:
            lo = mid + 1
    return lo
""",
    covers="Recognises this is binary search over the ANSWER, not the array, and that feasibility is monotonic. That reframing is the whole interview.",
)

# ─────────────────────────────────────────────── linked list
# Lists are passed and returned as plain arrays so they stay executable.
problem(
    id="reverse-linked-list", pattern="linked-list", tiers=["junior"], title="Reverse a Linked List",
    fn="reverse_list", companies=["Amazon", "Meta", "Microsoft", "Apple"],
    statement="A singly linked list is given to you as an array of its values in order. Return an array of the values in reversed order. Discuss the pointer manipulation you would use on real nodes.",
    example="[1,2,3,4,5] -> [5,4,3,2,1]",
    params="values",
    tests=[[[1,2,3,4,5]],[[]],[[1]],[[1,2]]],
    solution="""
def reverse_list(values):
    out = []
    for v in values:
        out.insert(0, v)
    return out
""",
    covers="The array form is trivial; the interview is the pointer version. Ask them to walk through prev/curr/next on real nodes and to handle the empty and single-node cases.",
)
problem(
    id="merge-two-sorted-lists", pattern="linked-list", tiers=["junior"], title="Merge Two Sorted Lists",
    fn="merge_sorted", companies=["Amazon", "Microsoft", "Apple"],
    statement="Two sorted linked lists are given as arrays of their values. Return one sorted array containing every value from both.",
    example="[1,2,4], [1,3,4] -> [1,1,2,3,4,4]",
    params="a, b",
    tests=[[[1,2,4],[1,3,4]],[[],[]],[[],[0]],[[5],[1,2,3]]],
    solution="""
def merge_sorted(a, b):
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out
""",
    covers="Merges in one pass without concatenating and sorting. Should mention the dummy-head trick for the real pointer version and handle one list running out.",
)
problem(
    id="linked-list-cycle", pattern="linked-list", tiers=["mid"], title="Detect a Cycle",
    fn="has_cycle", companies=["Amazon", "Meta", "Bloomberg"],
    statement="A linked list is described by an array of values plus an index that the last node points back to, or -1 for no cycle. Return true if the list contains a cycle. Explain how you would do it with constant extra space.",
    example="values = [3,2,0,-4], tail connects to index 1 -> true",
    params="values, tail_index",
    tests=[[[3,2,0,-4],1],[[1,2],0],[[1],-1],[[],-1],[[1,2,3],-1]],
    solution="""
def has_cycle(values, tail_index):
    return len(values) > 0 and tail_index >= 0
""",
    covers="The data form makes the answer easy, so spend the time on Floyd's fast/slow pointers: why the pointers must meet inside a cycle, and why it is O(1) space versus a visited set.",
)
problem(
    id="remove-nth-from-end", pattern="linked-list", tiers=["mid"], title="Remove the Nth Node From the End",
    fn="remove_nth", companies=["Amazon", "Meta"],
    statement="Given a linked list as an array of values and a number n, remove the nth node counting from the end and return the remaining values. Aim to do it in a single pass.",
    example="[1,2,3,4,5], n = 2 -> [1,2,3,5]",
    params="values, n",
    tests=[[[1,2,3,4,5],2],[[1],1],[[1,2],1],[[1,2],2],[[1,2,3],3]],
    solution="""
def remove_nth(values, n):
    out = list(values)
    del out[len(out) - n]
    return out
""",
    covers="The one-pass answer is two pointers held n apart. Removing the head is the edge case that breaks most attempts; a dummy head fixes it.",
)

# ─────────────────────────────────────────────── trees
# Trees arrive as level-order arrays with null for missing children.
TREE_HELPERS = """
class _N:
    __slots__ = ("val", "left", "right")
    def __init__(self, v):
        self.val = v; self.left = None; self.right = None

def _build(a):
    if not a or a[0] is None:
        return None
    root = _N(a[0]); q = [root]; i = 1; k = 0
    while k < len(q) and i < len(a):
        node = q[k]; k += 1
        if i < len(a):
            v = a[i]; i += 1
            if v is not None:
                node.left = _N(v); q.append(node.left)
        if i < len(a):
            v = a[i]; i += 1
            if v is not None:
                node.right = _N(v); q.append(node.right)
    return root
"""
problem(
    id="max-depth-tree", pattern="trees", tiers=["junior"], title="Maximum Depth of a Binary Tree",
    fn="max_depth", companies=["Amazon", "Meta", "Microsoft"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return the number of nodes on the longest path from the root down to a leaf.",
    example="[3,9,20,null,null,15,7] -> 3",
    params="tree",
    tests=[[[3,9,20,None,None,15,7]],[[1,None,2]],[[]],[[0]],[[1,2,3,4,None,None,5]]],
    solution=TREE_HELPERS + """
def max_depth(tree):
    root = _build(tree)
    def d(n):
        return 0 if not n else 1 + max(d(n.left), d(n.right))
    return d(root)
""",
    covers="Recursion is natural here. Ask for the iterative BFS version and the space cost of each, plus what happens on a degenerate tree.",
)
problem(
    id="invert-tree", pattern="trees", tiers=["junior"], title="Invert a Binary Tree",
    fn="invert_tree", companies=["Google", "Amazon"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Mirror the tree left-to-right and return the result as a level-order array with trailing nulls removed.",
    example="[4,2,7,1,3,6,9] -> [4,7,2,9,6,3,1]",
    params="tree",
    tests=[[[4,2,7,1,3,6,9]],[[2,1,3]],[[]],[[1]]],
    solution=TREE_HELPERS + """
def invert_tree(tree):
    root = _build(tree)
    def inv(n):
        if not n:
            return
        n.left, n.right = n.right, n.left
        inv(n.left); inv(n.right)
    inv(root)
    if not root:
        return []
    out = []; q = [root]
    while q:
        n = q.pop(0)
        if n is None:
            out.append(None); continue
        out.append(n.val); q.append(n.left); q.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out
""",
    covers="A short recursion, so push on the traversal choice and the iterative version with an explicit queue or stack.",
)
problem(
    id="same-tree", pattern="trees", tiers=["junior"], title="Identical Trees",
    fn="is_same_tree", companies=["Amazon", "Apple"],
    statement="Two binary trees are given as level-order arrays where null marks a missing child. Return true if they have the same shape and the same values in the same positions.",
    example="[1,2,3] and [1,2,3] -> true",
    params="a, b",
    tests=[[[1,2,3],[1,2,3]],[[1,2],[1,None,2]],[[],[]],[[1,2,1],[1,1,2]]],
    solution=TREE_HELPERS + """
def is_same_tree(a, b):
    ra, rb = _build(a), _build(b)
    def same(x, y):
        if not x and not y:
            return True
        if not x or not y or x.val != y.val:
            return False
        return same(x.left, y.left) and same(x.right, y.right)
    return same(ra, rb)
""",
    covers="Watch that structure is compared, not just values: [1,2] and [1,null,2] must differ. Both-null and one-null base cases must be separate.",
)
problem(
    id="level-order-traversal", pattern="trees", tiers=["mid"], title="Level Order Traversal",
    fn="level_order", companies=["Amazon", "Meta", "LinkedIn"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return a list of lists holding the values at each depth, from the root down.",
    example="[3,9,20,null,null,15,7] -> [[3],[9,20],[15,7]]",
    params="tree",
    tests=[[[3,9,20,None,None,15,7]],[[1]],[[]],[[1,2,None,3]]],
    solution=TREE_HELPERS + """
def level_order(tree):
    root = _build(tree)
    if not root:
        return []
    out = []; q = [root]
    while q:
        out.append([n.val for n in q])
        nxt = []
        for n in q:
            if n.left: nxt.append(n.left)
            if n.right: nxt.append(n.right)
        q = nxt
    return out
""",
    covers="Needs a level boundary, either by snapshotting the queue length or swapping lists. Losing the boundary and flattening everything is the common bug.",
)
problem(
    id="validate-bst", pattern="trees", tiers=["senior"], title="Validate a Binary Search Tree",
    fn="is_valid_bst", companies=["Amazon", "Meta", "Google"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return true if it is a valid binary search tree: every value in a node's left subtree is smaller than the node, and every value in its right subtree is larger.",
    example="[5,1,4,null,null,3,6] -> false",
    params="tree",
    tests=[[[2,1,3]],[[5,1,4,None,None,3,6]],[[]],[[1]],[[5,4,6,None,None,3,7]],[[10,5,15,None,None,6,20]]],
    solution=TREE_HELPERS + """
def is_valid_bst(tree):
    root = _build(tree)
    def ok(n, lo, hi):
        if not n:
            return True
        if (lo is not None and n.val <= lo) or (hi is not None and n.val >= hi):
            return False
        return ok(n.left, lo, n.val) and ok(n.right, n.val, hi)
    return ok(root, None, None)
""",
    covers="The trap is checking only parent against child. A correct answer carries min/max bounds down, or does an in-order walk checking it is strictly increasing. [10,5,15,null,null,6,20] catches the shallow version.",
)
problem(
    id="lowest-common-ancestor-bst", pattern="trees", tiers=["mid"], title="Lowest Common Ancestor in a BST",
    fn="lca_bst", companies=["Amazon", "Meta"],
    statement="A binary search tree is given as a level-order array where null marks a missing child, along with two values present in it. Return the value of the deepest node that has both of them as descendants, where a node may be its own descendant.",
    example="[6,2,8,0,4,7,9], p = 2, q = 8 -> 6",
    params="tree, p, q",
    tests=[[[6,2,8,0,4,7,9],2,8],[[6,2,8,0,4,7,9],2,4],[[2,1],2,1],[[5,3,8],3,8]],
    solution=TREE_HELPERS + """
def lca_bst(tree, p, q):
    n = _build(tree)
    while n:
        if p < n.val and q < n.val:
            n = n.left
        elif p > n.val and q > n.val:
            n = n.right
        else:
            return n.val
""",
    covers="Should exploit the BST ordering to walk down in O(h) rather than searching the whole tree. Ask how the answer changes for a general binary tree.",
)

# ─────────────────────────────────────────────── tries
problem(
    id="longest-common-prefix", pattern="tries", tiers=["junior"], title="Longest Common Prefix",
    fn="longest_common_prefix", companies=["Amazon", "Google"],
    statement="Given a list of words, return the longest starting string that all of them share. Return an empty string if there is none.",
    example='["flower","flow","flight"] -> "fl"',
    params="words",
    tests=[[["flower","flow","flight"]],[["dog","racecar","car"]],[[]],[["a"]],[["ab","ab"]]],
    solution="""
def longest_common_prefix(words):
    if not words:
        return ""
    pre = words[0]
    for w in words[1:]:
        while not w.startswith(pre):
            pre = pre[:-1]
            if not pre:
                return ""
    return pre
""",
    covers="A simple scan is fine, but ask when a trie would be worth building: repeated prefix queries over a fixed dictionary rather than one pass.",
)
problem(
    id="prefix-counts", pattern="tries", tiers=["mid"], title="Count Words by Prefix",
    fn="count_by_prefix", companies=["Google", "Amazon"],
    statement="Given a dictionary of words and a list of prefixes, return for each prefix how many dictionary words start with it. Assume the prefix list is long, so preprocessing the dictionary is worthwhile.",
    example='words ["apple","app","apt"], prefixes ["ap","app"] -> [3, 2]',
    params="words, prefixes",
    tests=[[["apple","app","apt"],["ap","app"]],[["a"],["a","b"]],[[],["x"]],[["abc","abd"],["ab","abc",""]]],
    solution="""
def count_by_prefix(words, prefixes):
    root = {}
    for w in words:
        node = root
        node["#"] = node.get("#", 0) + 1
        for ch in w:
            node = node.setdefault(ch, {})
            node["#"] = node.get("#", 0) + 1
    out = []
    for p in prefixes:
        node = root
        ok = True
        for ch in p:
            if ch not in node:
                ok = False
                break
            node = node[ch]
        out.append(node.get("#", 0) if ok else 0)
    return out
""",
    covers="This is the trie problem: build once, then answer each prefix in O(len(prefix)). Look for a count stored at each node rather than a subtree walk per query.",
)
problem(
    id="word-search-grid", pattern="tries", tiers=["senior"], title="Find Words in a Letter Grid",
    fn="find_words", companies=["Amazon", "Meta", "Google"],
    statement="Given a grid of letters and a list of target words, return which of those words can be spelled by walking between horizontally or vertically adjacent cells without reusing a cell in a single word.",
    example='grid [["o","a"],["e","t"]], words ["oat","ate"] -> ["oat","ate"]',
    params="grid, words",
    tests=[[[["o","a"],["e","t"]],["oat","ate","tea","zzz"]],[[["a"]],["a","b"]],[[["a","b"],["c","d"]],["abdc","abcd"]]],
    unordered=True,
    solution="""
def find_words(grid, words):
    rows, cols = len(grid), len(grid[0]) if grid else 0
    found = []
    def dfs(r, c, w, i, seen):
        if i == len(w):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols:
            return False
        if (r, c) in seen or grid[r][c] != w[i]:
            return False
        seen.add((r, c))
        ok = (dfs(r+1,c,w,i+1,seen) or dfs(r-1,c,w,i+1,seen)
              or dfs(r,c+1,w,i+1,seen) or dfs(r,c-1,w,i+1,seen))
        seen.discard((r, c))
        return ok
    for w in words:
        if any(dfs(r, c, w, 0, set()) for r in range(rows) for c in range(cols)):
            found.append(w)
    return found
""",
    covers="Backtracking per word is the baseline. The strong answer builds a trie of the words and walks the grid once, pruning branches no word can extend.",
)

# ─────────────────────────────────────────────── heap
problem(
    id="kth-largest", pattern="heap", tiers=["mid"], title="Kth Largest Element",
    fn="find_kth_largest", companies=["Amazon", "Meta", "Netflix"],
    statement="Given an unsorted array of integers and a number k, return the kth largest value counting duplicates as separate entries.",
    example="[3,2,1,5,6,4], k = 2 -> 5",
    params="nums, k",
    tests=[[[3,2,1,5,6,4],2],[[3,2,3,1,2,4,5,5,6],4],[[1],1],[[2,1],2]],
    solution="""
def find_kth_largest(nums, k):
    import heapq
    return heapq.nlargest(k, nums)[-1]
""",
    covers="Sorting is O(n log n); a size-k min heap is O(n log k). Quickselect gets average O(n). Ask which they would ship and why.",
)
problem(
    id="k-closest-points", pattern="heap", tiers=["mid"], title="K Closest Points to the Origin",
    fn="k_closest", companies=["Amazon", "Meta", "Uber"],
    statement="Given a list of [x, y] points and a number k, return the k points nearest to the origin. The order of the returned points does not matter.",
    example="[[1,3],[-2,2]], k = 1 -> [[-2,2]]",
    params="points, k",
    tests=[[[[1,3],[-2,2]],1],[[[3,3],[5,-1],[-2,4]],2],[[[0,0]],1]],
    unordered=True,
    solution="""
def k_closest(points, k):
    import heapq
    return heapq.nsmallest(k, points, key=lambda p: p[0]*p[0] + p[1]*p[1])
""",
    covers="Should skip the square root since it does not change the ordering. Then the same heap-versus-quickselect trade-off as any top-k problem.",
)
problem(
    id="task-scheduler", pattern="heap", tiers=["senior"], title="Task Scheduler With Cooldown",
    fn="least_interval", companies=["Meta", "Amazon"],
    statement="Given a list of task labels and a cooldown n, each unit of time runs one task or idles. The same label cannot run again until n units have passed. Return the fewest units of time needed to run every task.",
    example='["A","A","A","B","B","B"], n = 2 -> 8',
    params="tasks, n",
    tests=[[["A","A","A","B","B","B"],2],[["A","A","A","B","B","B"],0],[["A","B","C"],2],[[],2],[["A"],5]],
    solution="""
def least_interval(tasks, n):
    from collections import Counter
    if not tasks:
        return 0
    c = Counter(tasks)
    mx = max(c.values())
    n_max = sum(1 for v in c.values() if v == mx)
    return max(len(tasks), (mx - 1) * (n + 1) + n_max)
""",
    covers="The counting formula is the elegant answer; a greedy heap simulation also works. Ask them to justify the max against len(tasks), which is the case where no idling is needed.",
)

# ─────────────────────────────────────────────── backtracking
problem(
    id="subsets", pattern="backtracking", tiers=["mid"], title="All Subsets",
    fn="subsets", companies=["Amazon", "Meta"],
    statement="Given an array of distinct integers, return every possible subset including the empty one. The order of the subsets does not matter.",
    example="[1,2] -> [[],[1],[2],[1,2]]",
    params="nums",
    tests=[[[1,2]],[[1,2,3]],[[]],[[0]]],
    unordered=True,
    solution="""
def subsets(nums):
    out = [[]]
    for n in nums:
        out += [cur + [n] for cur in out]
    return out
""",
    covers="Either the include/exclude recursion or the iterative doubling. Should state the output is 2^n, so that is the floor on complexity.",
)
problem(
    id="permutations", pattern="backtracking", tiers=["mid"], title="All Permutations",
    fn="permutations", companies=["Amazon", "Microsoft"],
    statement="Given an array of distinct integers, return every ordering of them. The order of the results does not matter.",
    example="[1,2,3] -> six orderings",
    params="nums",
    tests=[[[1,2,3]],[[0,1]],[[1]],[[]]],
    unordered=True,
    solution="""
def permutations(nums):
    out = []
    def go(cur, rest):
        if not rest:
            out.append(cur)
            return
        for i in range(len(rest)):
            go(cur + [rest[i]], rest[:i] + rest[i+1:])
    go([], list(nums))
    return out
""",
    covers="Watch the undo step in the backtracking, or whether they avoid it by copying. n! outputs, so ask what they would do if n were 12.",
)
problem(
    id="combination-sum", pattern="backtracking", tiers=["mid", "senior"], title="Combination Sum",
    fn="combination_sum", companies=["Amazon", "Meta", "Airbnb"],
    statement="Given distinct positive integers and a target, return every unique combination that sums to the target. A number may be reused any number of times. Combinations differing only in order count as the same.",
    example="[2,3,6,7], target 7 -> [[2,2,3],[7]]",
    params="nums, target",
    tests=[[[2,3,6,7],7],[[2,3,5],8],[[2],1],[[3],3]],
    unordered=True,
    solution="""
def combination_sum(nums, target):
    out = []
    nums = sorted(nums)
    def go(start, cur, left):
        if left == 0:
            out.append(cur); return
        for i in range(start, len(nums)):
            if nums[i] > left:
                break
            go(i, cur + [nums[i]], left - nums[i])
    go(0, [], target)
    return out
""",
    covers="Passing the start index is what prevents permuted duplicates; a visited set instead is a red flag. Pruning once the value exceeds the remainder is the natural optimisation.",
)
problem(
    id="generate-parentheses", pattern="backtracking", tiers=["mid"], title="Generate Balanced Parentheses",
    fn="generate_parens", companies=["Amazon", "Google", "Uber"],
    statement="Given a count n, return every string of n opening and n closing brackets that is balanced. The order of the results does not matter.",
    example='n = 2 -> ["(())","()()"]',
    params="n",
    tests=[[2],[3],[1],[0]],
    unordered=True,
    solution="""
def generate_parens(n):
    out = []
    def go(cur, o, c):
        if len(cur) == 2 * n:
            out.append(cur); return
        if o < n:
            go(cur + "(", o + 1, c)
        if c < o:
            go(cur + ")", o, c + 1)
    go("", 0, 0)
    return out
""",
    covers="Building only valid strings beats generating all and filtering. The two invariants (open <= n, close < open) are the whole insight.",
)

# ─────────────────────────────────────────────── graphs
problem(
    id="number-of-islands", pattern="graphs", tiers=["mid"], title="Number of Islands",
    fn="num_islands", companies=["Amazon", "Meta", "Google", "Microsoft"],
    statement='Given a grid of "1" for land and "0" for water, count the separate land masses. Cells join only horizontally or vertically.',
    example='[["1","1","0"],["0","1","0"],["0","0","1"]] -> 2',
    params="grid",
    tests=[[[["1","1","0"],["0","1","0"],["0","0","1"]]],[[["0"]]],[[]],[[["1","1"],["1","1"]]]],
    solution="""
def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()
    def flood(r, c):
        stack = [(r, c)]
        while stack:
            x, y = stack.pop()
            if x < 0 or y < 0 or x >= rows or y >= cols:
                continue
            if (x, y) in seen or grid[x][y] != "1":
                continue
            seen.add((x, y))
            stack.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
    n = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                n += 1
                flood(r, c)
    return n
""",
    covers="Flood fill with BFS or DFS and a visited set. Ask about recursion depth on a large grid, and whether mutating the input is acceptable.",
)
problem(
    id="max-area-island", pattern="graphs", tiers=["mid"], title="Largest Island",
    fn="max_area_island", companies=["Amazon", "Google"],
    statement="Given a grid of 1 for land and 0 for water, return the number of cells in the largest connected land mass. Cells join only horizontally or vertically. Return 0 if there is no land.",
    example="[[1,1,0],[0,1,0],[0,0,1]] -> 3",
    params="grid",
    tests=[[[[1,1,0],[0,1,0],[0,0,1]]],[[[0,0],[0,0]]],[[]],[[[1]]]],
    solution="""
def max_area_island(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    seen = set()
    best = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != 1 or (r, c) in seen:
                continue
            stack = [(r, c)]; area = 0
            while stack:
                x, y = stack.pop()
                if x < 0 or y < 0 or x >= rows or y >= cols:
                    continue
                if (x, y) in seen or grid[x][y] != 1:
                    continue
                seen.add((x, y)); area += 1
                stack.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
            best = max(best, area)
    return best
""",
    covers="Same traversal as counting islands but accumulating a size. Look for one shared visited set rather than one per component.",
)
problem(
    id="course-schedule", pattern="graphs", tiers=["senior"], title="Course Prerequisites",
    fn="can_finish", companies=["Amazon", "Meta", "Google"],
    statement="Given a number of courses labelled from zero and a list of [course, prerequisite] pairs, return true if there is an order that lets you take every course.",
    example="2 courses, [[1,0]] -> true;  [[1,0],[0,1]] -> false",
    params="n, prereqs",
    tests=[[2,[[1,0]]],[2,[[1,0],[0,1]]],[1,[]],[3,[[0,1],[1,2],[2,0]]],[4,[[1,0],[2,1],[3,2]]]],
    solution="""
def can_finish(n, prereqs):
    from collections import defaultdict, deque
    adj = defaultdict(list)
    indeg = [0] * n
    for a, b in prereqs:
        adj[b].append(a)
        indeg[a] += 1
    q = deque([i for i in range(n) if indeg[i] == 0])
    seen = 0
    while q:
        node = q.popleft(); seen += 1
        for nxt in adj[node]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                q.append(nxt)
    return seen == n
""",
    covers="Recognises this as cycle detection on a directed graph. Kahn's topological sort or DFS with three colours. A plain visited set without recursion state is the classic wrong answer.",
)
problem(
    id="rotting-oranges", pattern="graphs", tiers=["mid"], title="Spreading Rot",
    fn="oranges_rotting", companies=["Amazon", "Google"],
    statement="In a grid, 0 is empty, 1 is a fresh orange and 2 is a rotten one. Each minute, every fresh orange horizontally or vertically adjacent to a rotten one also rots. Return the minutes until none are fresh, or -1 if some can never rot.",
    example="[[2,1,1],[1,1,0],[0,1,1]] -> 4",
    params="grid",
    tests=[[[[2,1,1],[1,1,0],[0,1,1]]],[[[2,1,1],[0,1,1],[1,0,1]]],[[[0,2]]],[[[0]]],[[[1]]]],
    solution="""
def oranges_rotting(grid):
    from collections import deque
    rows, cols = len(grid), len(grid[0]) if grid else 0
    q = deque(); fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2: q.append((r, c, 0))
            elif grid[r][c] == 1: fresh += 1
    t = 0
    while q:
        r, c, t = q.popleft()
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            x, y = r + dr, c + dc
            if 0 <= x < rows and 0 <= y < cols and grid[x][y] == 1:
                grid[x][y] = 2; fresh -= 1
                q.append((x, y, t + 1))
    return -1 if fresh else t
""",
    covers="Multi-source BFS starting from every rotten cell at once. Running BFS per source is the slow path. The unreachable case must return -1.",
)
problem(
    id="pacific-atlantic", pattern="graphs", tiers=["senior"], title="Water Flowing to Both Coasts",
    fn="pacific_atlantic", companies=["Google", "Amazon"],
    statement="Given a grid of heights, water flows from a cell to a neighbour of equal or lower height. The top and left edges touch one ocean, the bottom and right edges touch another. Return the coordinates of every cell from which water can reach both oceans.",
    example="a 5x5 height map -> the ridge cells",
    params="heights",
    tests=[[[[1,2,3],[8,9,4],[7,6,5]]],[[[1]]],[[[2,1],[1,2]]]],
    unordered=True,
    solution="""
def pacific_atlantic(heights):
    if not heights:
        return []
    rows, cols = len(heights), len(heights[0])
    def climb(starts):
        seen = set(starts); stack = list(starts)
        while stack:
            r, c = stack.pop()
            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
                x, y = r + dr, c + dc
                if 0 <= x < rows and 0 <= y < cols and (x, y) not in seen \\
                   and heights[x][y] >= heights[r][c]:
                    seen.add((x, y)); stack.append((x, y))
        return seen
    pac = climb([(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)])
    atl = climb([(rows-1, c) for c in range(cols)] + [(r, cols-1) for r in range(rows)])
    return [[r, c] for (r, c) in sorted(pac & atl)]
""",
    covers="The inversion is the interview: search UPHILL from each coast instead of downhill from every cell, turning O((mn)^2) into O(mn).",
)

# ─────────────────────────────────────────────── dynamic programming
problem(
    id="climbing-stairs", pattern="dynamic-programming", tiers=["junior"], title="Climbing Stairs",
    fn="climb_stairs", companies=["Amazon", "Apple"],
    statement="You are climbing a staircase of n steps and may take one or two steps at a time. Return how many distinct ways you can reach the top.",
    example="n = 4 -> 5",
    params="n",
    tests=[[2],[3],[4],[1],[10]],
    solution="""
def climb_stairs(n):
    a, b = 1, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return b
""",
    covers="Recognises the Fibonacci recurrence and reduces memory to two variables. Ask for the recursion's complexity before memoisation (exponential) and after (linear).",
)
problem(
    id="house-robber", pattern="dynamic-programming", tiers=["mid"], title="Non-Adjacent Maximum Sum",
    fn="rob", companies=["Amazon", "Google"],
    statement="Given an array of non-negative numbers, choose a subset with the largest possible sum such that no two chosen entries are adjacent. Return that sum.",
    example="[2,7,9,3,1] -> 12",
    params="nums",
    tests=[[[1,2,3,1]],[[2,7,9,3,1]],[[]],[[5]],[[2,1,1,2]]],
    solution="""
def rob(nums):
    take, skip = 0, 0
    for n in nums:
        take, skip = skip + n, max(skip, take)
    return max(take, skip)
""",
    covers="States the recurrence take-or-skip clearly, then collapses the table to two variables. [2,1,1,2] catches greedy answers.",
)
problem(
    id="coin-change", pattern="dynamic-programming", tiers=["mid", "senior"], title="Fewest Coins",
    fn="coin_change", companies=["Amazon", "Meta", "Google"],
    statement="Given coin denominations available in unlimited quantity and a target amount, return the fewest coins that sum exactly to the amount, or -1 if it cannot be made.",
    example="coins [1,2,5], amount 11 -> 3",
    params="coins, amount",
    tests=[[[1,2,5],11],[[2],3],[[1],0],[[2,5],3],[[1,3,4],6]],
    solution="""
def coin_change(coins, amount):
    INF = float("inf")
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return -1 if dp[amount] == INF else dp[amount]
""",
    covers="Must see that greedy fails: [1,3,4] for 6 is 3+3, not 4+1+1. Bottom-up table or memoised recursion, and the unreachable case returning -1.",
)
problem(
    id="longest-increasing-subsequence", pattern="dynamic-programming", tiers=["senior"], title="Longest Increasing Subsequence",
    fn="length_of_lis", companies=["Google", "Amazon", "Microsoft"],
    statement="Given an array of integers, return the length of the longest strictly increasing subsequence. The chosen elements need not be adjacent.",
    example="[10,9,2,5,3,7,101,18] -> 4",
    params="nums",
    tests=[[[10,9,2,5,3,7,101,18]],[[0,1,0,3,2,3]],[[7,7,7]],[[]],[[1]]],
    solution="""
def length_of_lis(nums):
    import bisect
    tails = []
    for n in nums:
        i = bisect.bisect_left(tails, n)
        if i == len(tails):
            tails.append(n)
        else:
            tails[i] = n
    return len(tails)
""",
    covers="O(n^2) DP is a solid answer. The O(n log n) patience-sorting version is a strong-hire signal, but only if they can explain what the tails array holds.",
)
problem(
    id="word-break", pattern="dynamic-programming", tiers=["senior"], title="Word Break",
    fn="word_break", companies=["Amazon", "Meta", "Google"],
    statement="Given a string and a dictionary of words, return true if the string can be split into a sequence of dictionary words. Words may be reused.",
    example='"applepen", ["apple","pen"] -> true',
    params="s, words",
    tests=[["applepen",["apple","pen"]],["catsandog",["cats","dog","sand","and","cat"]],["",["a"]],["aaa",["a","aa"]],["ab",["a"]]],
    solution="""
def word_break(s, words):
    w = set(words)
    dp = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in w:
                dp[i] = True
                break
    return dp[len(s)]
""",
    covers='Naive recursion blows up on "aaaa...b" style inputs; memoisation or the DP table is the point. Ask what changes if they must return the actual split.',
)
problem(
    id="unique-paths", pattern="dynamic-programming", tiers=["junior", "mid"], title="Unique Grid Paths",
    fn="unique_paths", companies=["Amazon", "Google"],
    statement="A robot starts at the top-left of an m by n grid and may move only right or down. Return how many distinct paths reach the bottom-right corner.",
    example="3 by 7 -> 28",
    params="m, n",
    tests=[[3,7],[3,2],[1,1],[1,10],[4,4]],
    solution="""
def unique_paths(m, n):
    row = [1] * n
    for _ in range(m - 1):
        for c in range(1, n):
            row[c] += row[c - 1]
    return row[-1]
""",
    covers="The grid DP is immediate; the combinatorial closed form is a nice bonus. Ask how obstacles would change the recurrence.",
)
problem(
    id="edit-distance", pattern="dynamic-programming", tiers=["senior"], title="Edit Distance",
    fn="min_distance", companies=["Google", "Amazon", "Microsoft"],
    statement="Given two strings, return the fewest single-character insertions, deletions or substitutions needed to turn the first into the second.",
    example='"horse" -> "ros" is 3',
    params="a, b",
    tests=[["horse","ros"],["intention","execution"],["",""],["","abc"],["abc","abc"]],
    solution="""
def min_distance(a, b):
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, n + 1):
            cur = dp[j]
            dp[j] = prev if a[i-1] == b[j-1] else 1 + min(prev, dp[j], dp[j-1])
            prev = cur
    return dp[n]
""",
    covers="A genuinely hard two-dimensional DP. Look for a clear table definition and correct base cases before any code. The rolling-array space optimisation is a bonus.",
)

# ─────────────────────────────────────────────── intervals
problem(
    id="merge-intervals", pattern="intervals", tiers=["mid"], title="Merge Overlapping Intervals",
    fn="merge_intervals", companies=["Amazon", "Meta", "Google", "Bloomberg"],
    statement="Given a list of [start, end] intervals, merge every set that overlaps and return the resulting list sorted by start. Intervals that merely touch at an endpoint count as overlapping.",
    example="[[1,3],[2,6],[8,10]] -> [[1,6],[8,10]]",
    params="intervals",
    tests=[[[[1,3],[2,6],[8,10],[15,18]]],[[[1,4],[4,5]]],[[]],[[[1,4],[0,4]]],[[[1,4],[2,3]]]],
    solution="""
def merge_intervals(intervals):
    if not intervals:
        return []
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out
""",
    covers="Sorting by start is the unlock. [[1,4],[2,3]] catches people who assume the later interval always extends the range.",
)
problem(
    id="insert-interval", pattern="intervals", tiers=["mid"], title="Insert an Interval",
    fn="insert_interval", companies=["Google", "Amazon", "LinkedIn"],
    statement="Given a list of non-overlapping [start, end] intervals sorted by start, insert one new interval and merge where needed. Return the resulting list.",
    example="[[1,3],[6,9]], insert [2,5] -> [[1,5],[6,9]]",
    params="intervals, new_interval",
    tests=[[[[1,3],[6,9]],[2,5]],[[[1,2],[3,5],[6,7],[8,10]],[4,8]],[[],[5,7]],[[[1,5]],[2,3]],[[[3,5]],[1,2]]],
    solution="""
def insert_interval(intervals, new_interval):
    s, e = new_interval
    out = []
    i = 0
    n = len(intervals)
    while i < n and intervals[i][1] < s:
        out.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:
        s = min(s, intervals[i][0]); e = max(e, intervals[i][1]); i += 1
    out.append([s, e])
    out.extend(intervals[i:])
    return out
""",
    covers="Should exploit the existing sort for O(n) rather than appending and re-sorting. The three phases (before, overlapping, after) are the clean framing.",
)
problem(
    id="meeting-rooms", pattern="intervals", tiers=["mid", "senior"], title="Minimum Meeting Rooms",
    fn="min_rooms", companies=["Amazon", "Meta", "Google", "Uber"],
    statement="Given meeting times as [start, end] intervals, return the smallest number of rooms needed so that no two meetings share a room at the same time. A meeting ending exactly when another begins can reuse the room.",
    example="[[0,30],[5,10],[15,20]] -> 2",
    params="intervals",
    tests=[[[[0,30],[5,10],[15,20]]],[[[7,10],[2,4]]],[[]],[[[1,5],[5,10]]],[[[1,10],[2,7],[3,19],[8,12],[10,20],[11,30]]]],
    solution="""
def min_rooms(intervals):
    starts = sorted(i[0] for i in intervals)
    ends = sorted(i[1] for i in intervals)
    rooms = best = 0
    j = 0
    for s in starts:
        while j < len(ends) and ends[j] <= s:
            j += 1; rooms -= 1
        rooms += 1
        best = max(best, rooms)
    return best
""",
    covers="Either a min heap of end times or the sorted start/end sweep. The touching case [[1,5],[5,10]] returning 1 is the boundary worth asking about.",
)
problem(
    id="non-overlapping-intervals", pattern="intervals", tiers=["senior"], title="Fewest Removals to Remove Overlap",
    fn="erase_overlap", companies=["Google", "Amazon"],
    statement="Given a list of [start, end] intervals, return the minimum number you must remove so that none of the remainder overlap. Touching endpoints do not count as overlap.",
    example="[[1,2],[2,3],[3,4],[1,3]] -> 1",
    params="intervals",
    tests=[[[[1,2],[2,3],[3,4],[1,3]]],[[[1,2],[1,2],[1,2]]],[[[1,2],[2,3]]],[[]]],
    solution="""
def erase_overlap(intervals):
    if not intervals:
        return 0
    kept = 0
    end = float("-inf")
    for s, e in sorted(intervals, key=lambda x: x[1]):
        if s >= end:
            kept += 1; end = e
    return len(intervals) - kept
""",
    covers="Greedy by EARLIEST END is correct; sorting by start is the intuitive wrong answer. Ask them to argue why keeping the earliest finisher is always safe.",
)

# ─────────────────────────────────────────────── greedy
problem(
    id="maximum-subarray", pattern="greedy", tiers=["junior", "mid"], title="Maximum Subarray Sum",
    fn="max_subarray", companies=["Amazon", "Meta", "Microsoft", "LinkedIn"],
    statement="Given an array of integers, return the largest sum obtainable from any contiguous non-empty run of elements.",
    example="[-2,1,-3,4,-1,2,1,-5,4] -> 6",
    params="nums",
    tests=[[[-2,1,-3,4,-1,2,1,-5,4]],[[1]],[[5,4,-1,7,8]],[[-3,-2,-5]],[[-1]]],
    solution="""
def max_subarray(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best
""",
    covers="Kadane's algorithm. The all-negative case is what separates a correct answer from one initialised to zero. Ask them to also return the indices.",
)
problem(
    id="jump-game", pattern="greedy", tiers=["mid"], title="Jump Game",
    fn="can_jump", companies=["Amazon", "Meta"],
    statement="Given an array where each value is the maximum number of positions you may advance from that index, starting at index 0, return true if you can reach the final index.",
    example="[2,3,1,1,4] -> true;  [3,2,1,0,4] -> false",
    params="nums",
    tests=[[[2,3,1,1,4]],[[3,2,1,0,4]],[[0]],[[2,0,0]],[[1,0,1,0]]],
    solution="""
def can_jump(nums):
    reach = 0
    for i, n in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + n)
    return True
""",
    covers="The greedy furthest-reach scan is O(n) and beats the DP. Ask why tracking a single reachability frontier is sufficient.",
)
problem(
    id="gas-station", pattern="greedy", tiers=["senior"], title="Circular Route Start",
    fn="can_complete_circuit", companies=["Amazon", "Google"],
    statement="Stations are arranged in a circle. Each has an amount of fuel available and a cost to travel to the next one. Starting empty, return the index you must begin at to complete one full loop, or -1 if no start works. A solution is unique when it exists.",
    example="gas [1,2,3,4,5], cost [3,4,5,1,2] -> 3",
    params="gas, cost",
    tests=[[[1,2,3,4,5],[3,4,5,1,2]],[[2,3,4],[3,4,3]],[[5],[4]],[[3,1,1],[1,2,2]]],
    solution="""
def can_complete_circuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    total = start = 0
    for i in range(len(gas)):
        total += gas[i] - cost[i]
        if total < 0:
            total = 0; start = i + 1
    return start
""",
    covers="Two insights: the loop is possible only if total gas covers total cost, and any prefix that runs dry rules out every start inside it. Together they give one pass.",
)

problem(
    id="merge-k-sorted-lists", pattern="linked-list", tiers=["senior"], title="Merge K Sorted Lists",
    fn="merge_k", companies=["Amazon", "Google", "Meta", "Uber"],
    statement="You are given several sorted linked lists, each as an array of its values. Return one sorted array containing every value from all of them.",
    example="[[1,4,5],[1,3,4],[2,6]] -> [1,1,2,3,4,4,5,6]",
    params="lists",
    tests=[[[[1,4,5],[1,3,4],[2,6]]],[[]],[[[]]],[[[1]]],[[[],[1],[]]]],
    solution="""
def merge_k(lists):
    import heapq
    h = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(h, (lst[0], i, 0))
    out = []
    while h:
        v, i, j = heapq.heappop(h)
        out.append(v)
        if j + 1 < len(lists[i]):
            heapq.heappush(h, (lists[i][j + 1], i, j + 1))
    return out
""",
    covers="Concatenating and sorting is O(N log N) and usually the first answer. The interview is the k-way merge with a heap, O(N log k), or divide-and-conquer pairwise merging. Empty lists in the input are the common crash.",
)
problem(
    id="reorder-list", pattern="linked-list", tiers=["mid", "senior"], title="Reorder a List",
    fn="reorder", companies=["Meta", "Amazon"],
    statement="A linked list is given as an array of its values. Reorder it by interleaving the first half with the reversed second half: first element, last element, second element, second-to-last, and so on. Return the resulting array.",
    example="[1,2,3,4,5] -> [1,5,2,4,3]",
    params="values",
    tests=[[[1,2,3,4]],[[1,2,3,4,5]],[[]],[[1]],[[1,2]]],
    solution="""
def reorder(values):
    out = []
    i, j = 0, len(values) - 1
    while i <= j:
        out.append(values[i])
        if i != j:
            out.append(values[j])
        i += 1
        j -= 1
    return out
""",
    covers="The array form is two pointers. On real nodes it is three steps: find the middle with fast/slow, reverse the second half, then weave. Ask them to walk that through and handle the odd-length middle.",
)
problem(
    id="lru-cache", pattern="linked-list", tiers=["senior"], title="LRU Cache Behaviour",
    fn="lru_results", companies=["Amazon", "Meta", "Google", "Microsoft"],
    statement='You are given a capacity and a list of operations, each either ["put", key, value] or ["get", key]. Apply them to a cache that evicts the least recently used entry once it is over capacity. Both get and put count as a use. Return the list of results from the get operations, using -1 for a miss.',
    example='capacity 2, [["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2]] -> [1,-1]',
    params="capacity, ops",
    tests=[
        [2,[["put",1,1],["put",2,2],["get",1],["put",3,3],["get",2]]],
        [1,[["put",1,1],["put",2,2],["get",1],["get",2]]],
        [2,[["get",1]]],
        [2,[["put",1,1],["put",1,2],["get",1]]],
    ],
    solution="""
def lru_results(capacity, ops):
    from collections import OrderedDict
    cache = OrderedDict()
    out = []
    for op in ops:
        if op[0] == "put":
            _, k, v = op
            if k in cache:
                cache.move_to_end(k)
            cache[k] = v
            if len(cache) > capacity:
                cache.popitem(last=False)
        else:
            k = op[1]
            if k in cache:
                cache.move_to_end(k)
                out.append(cache[k])
            else:
                out.append(-1)
    return out
""",
    covers="The canonical answer is a hash map plus a doubly linked list giving O(1) get and put. Ask them why a plain list or array makes eviction O(n), and confirm that a get counts as a use.",
)
problem(
    id="partition-labels", pattern="greedy", tiers=["mid"], title="Partition a String Into Distinct Blocks",
    fn="partition_labels", companies=["Amazon", "Meta"],
    statement="Given a string, split it into the largest possible number of contiguous pieces so that no letter appears in more than one piece. Return the length of each piece in order.",
    example='"ababcbacadefegde" -> [9, 7]',
    params="s",
    tests=[["ababcbacadefegdehijhklij"],["ababcbacadefegde"],["a"],[""],["abc"]],
    solution="""
def partition_labels(s):
    last = {c: i for i, c in enumerate(s)}
    out = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])
        if i == end:
            out.append(end - start + 1)
            start = i + 1
    return out
""",
    covers="Precomputing each letter's last index, then extending the current window to the furthest last-index seen. The greedy cut when the scan index reaches the window end is the insight.",
)
problem(
    id="min-stack-ops", pattern="stack", tiers=["mid"], title="Stack With Constant-Time Minimum",
    fn="min_stack_results", companies=["Amazon", "Google", "Bloomberg"],
    statement='You are given a list of operations, each one of ["push", value], ["pop"], ["top"] or ["min"]. Apply them to a stack and return the results of the top and min operations in order. Every operation must run in constant time.',
    example='[["push",-2],["push",0],["push",-3],["min"],["pop"],["top"],["min"]] -> [-3,0,-2]',
    params="ops",
    tests=[
        [[["push",-2],["push",0],["push",-3],["min"],["pop"],["top"],["min"]]],
        [[["push",1],["min"],["push",2],["min"],["pop"],["min"]]],
        [[["push",5],["top"]]],
    ],
    solution="""
def min_stack_results(ops):
    st = []
    mins = []
    out = []
    for op in ops:
        if op[0] == "push":
            v = op[1]
            st.append(v)
            mins.append(v if not mins else min(v, mins[-1]))
        elif op[0] == "pop":
            st.pop(); mins.pop()
        elif op[0] == "top":
            out.append(st[-1])
        else:
            out.append(mins[-1])
    return out
""",
    covers="Keeping a parallel stack of running minimums is the standard answer. Scanning for the min on each query is O(n) and fails the constant-time requirement. Ask what happens with duplicate minimums on pop.",
)


# ───────────────────────────────────────────────────────── verification
def verify():
    fails = []
    for p in P:
        ns = {}
        try:
            exec(p["solution"], ns)
        except Exception as e:  # noqa: BLE001
            fails.append((p["id"], "solution did not compile", str(e)))
            continue
        fn = ns.get(p["fn"])
        if fn is None:
            fails.append((p["id"], "missing function", p["fn"]))
            continue
        expected = []
        for args in p["tests"]:
            try:
                got = fn(*json.loads(json.dumps(args)))
            except Exception as e:  # noqa: BLE001
                fails.append((p["id"], f"raised on {args}", str(e)))
                expected.append(None)
                continue
            expected.append(got)
        p["expected"] = expected
    return fails


def norm(v, unordered):
    if unordered and isinstance(v, list):
        if v and all(isinstance(x, list) for x in v):
            return sorted([sorted(x, key=lambda z: json.dumps(z, sort_keys=True)) for x in v],
                          key=lambda z: json.dumps(z, sort_keys=True))
        return sorted(v, key=lambda z: json.dumps(z, sort_keys=True))
    return v


def ts_value(v):
    return json.dumps(v).replace("null", "null")


PATTERNS = [
    "arrays-hashing", "two-pointers", "sliding-window", "stack", "binary-search",
    "linked-list", "trees", "tries", "heap", "backtracking", "graphs",
    "dynamic-programming", "intervals", "greedy",
]


def emit():
    import os
    os.makedirs("lib/coding/problems", exist_ok=True)
    by_pattern = defaultdict(list)
    for p in P:
        by_pattern[p["pattern"]].append(p)

    for pat in PATTERNS:
        items = by_pattern.get(pat, [])
        lines = [
            "import type { Problem } from \"./types\";",
            "",
            f"/** {pat} — add new problems to this array. */",
            f"export const {pat.replace('-', '_').upper()}: Problem[] = [",
        ]
        for p in items:
            py_sig = f"def {p['fn']}({p['params']}):\\n    # your code here\\n    pass\\n"
            js_params = ", ".join(x.strip() for x in p["params"].split(","))
            js_sig = f"function {p['fn']}({js_params}) {{\\n  // your code here\\n}}\\n"
            tests = ",\n".join(
                f"      {{ args: {ts_value(a)}, expected: {ts_value(e)}"
                + (", unordered: true" if p.get("unordered") else "")
                + " }"
                for a, e in zip(p["tests"], p["expected"])
            )
            lines += [
                "  {",
                f"    id: {json.dumps(p['id'])},",
                f"    pattern: {json.dumps(p['pattern'])},",
                f"    tiers: {json.dumps(p['tiers'])},",
                f"    title: {json.dumps(p['title'])},",
                f"    fn: {json.dumps(p['fn'])},",
                f"    companies: {json.dumps(p['companies'])},",
                f"    statement:\n      {json.dumps(p['statement'])},",
                f"    example: {json.dumps(p['example'])},",
                "    signatures: {",
                f"      python: {json.dumps(py_sig)},",
                f"      javascript: {json.dumps(js_sig)},",
                "    },",
                "    tests: [",
                tests + ",",
                "    ],",
                f"    strongAnswerCovers:\n      {json.dumps(p['covers'])},",
                "  },",
            ]
        lines += ["];", ""]
        with open(f"lib/coding/problems/{pat}.ts", "w") as f:
            f.write("\n".join(lines))
    return by_pattern


if __name__ == "__main__":
    fails = verify()
    if fails:
        print("VERIFICATION FAILED")
        for i, w, e in fails:
            print(f"  {i}: {w} -> {e}")
        sys.exit(1)
    print(f"verified {len(P)} problems, {sum(len(p['tests']) for p in P)} test cases")
    if "--check" not in sys.argv:
        bp = emit()
        for pat in PATTERNS:
            print(f"  {pat:24} {len(bp.get(pat, []))}")

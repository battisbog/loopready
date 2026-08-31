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
    fn="two_sum", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
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
    fn="has_duplicate", companies=["Amazon", "Apple", "Google", "Meta", "Microsoft"],
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
    fn="is_anagram", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="group_anagrams", companies=["Amazon", "Uber", "Meta", "Google", "Microsoft", "Apple"],
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
    fn="top_k_frequent", companies=["Amazon", "Meta", "Netflix", "Google", "Microsoft", "Apple"],
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
    fn="product_except_self", companies=["Amazon", "Meta", "Apple", "Google", "Microsoft"],
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
    fn="longest_consecutive", companies=["Google", "Meta", "Amazon", "Microsoft", "Apple"],
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
    fn="is_palindrome", companies=["Meta", "Amazon", "Google", "Microsoft", "Apple"],
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
    fn="two_sum_sorted", companies=["Amazon", "Microsoft", "Google", "Meta"],
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
    fn="three_sum", companies=["Meta", "Amazon", "Google", "Microsoft", "Apple"],
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
    fn="max_area", companies=["Amazon", "Google", "Bloomberg", "Meta", "Microsoft", "Apple"],
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
    fn="max_profit", companies=["Amazon", "Meta", "Microsoft", "Google", "Apple"],
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
    fn="length_of_longest", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple", "Netflix"],
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
    fn="character_replacement", companies=["Google", "Amazon", "Meta", "Microsoft"],
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
    fn="min_window", companies=["Meta", "Google", "Uber", "Amazon", "Microsoft"],
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
    fn="is_valid", companies=["Amazon", "Meta", "Microsoft", "Google"],
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
    fn="eval_rpn", companies=["Amazon", "LinkedIn", "Google", "Meta", "Microsoft"],
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
    fn="daily_temperatures", companies=["Amazon", "Google", "Meta", "Microsoft"],
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
    fn="largest_rectangle", companies=["Google", "Amazon", "Meta", "Microsoft"],
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
    fn="search", companies=["Amazon", "Microsoft", "Google", "Meta"],
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
    fn="search_rotated", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="find_min", companies=["Amazon", "Microsoft", "Google", "Meta"],
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
    fn="min_rate", companies=["Google", "Amazon", "Meta", "Microsoft", "Apple"],
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
    fn="reverse_list", companies=["Amazon", "Meta", "Microsoft", "Apple", "Google"],
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
    fn="merge_sorted", companies=["Amazon", "Microsoft", "Apple", "Google", "Meta"],
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
    fn="has_cycle", companies=["Amazon", "Meta", "Bloomberg", "Google", "Microsoft"],
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
    fn="remove_nth", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="max_depth", companies=["Amazon", "Meta", "Microsoft", "Google"],
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
    fn="invert_tree", companies=["Google", "Amazon", "Meta"],
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
    fn="is_same_tree", companies=["Amazon", "Apple", "Google", "Meta", "Microsoft"],
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
    fn="level_order", companies=["Amazon", "Meta", "LinkedIn", "Google", "Microsoft"],
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
    fn="is_valid_bst", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="lca_bst", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="longest_common_prefix", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
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
    fn="find_words", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="find_kth_largest", companies=["Amazon", "Meta", "Netflix", "Google", "Microsoft", "Apple"],
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
    fn="least_interval", companies=["Meta", "Amazon", "Google", "Microsoft", "Apple"],
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
    fn="subsets", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="permutations", companies=["Amazon", "Microsoft", "Google", "Meta"],
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
    fn="combination_sum", companies=["Amazon", "Meta", "Airbnb", "Google", "Microsoft"],
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
    fn="generate_parens", companies=["Amazon", "Google", "Uber", "Meta", "Microsoft"],
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
    fn="num_islands", companies=["Amazon", "Meta", "Google", "Microsoft", "Apple"],
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
    fn="max_area_island", companies=["Amazon", "Google", "Meta"],
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
    fn="can_finish", companies=["Amazon", "Meta", "Google", "Microsoft", "Apple"],
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
    fn="oranges_rotting", companies=["Amazon", "Google", "Meta", "Microsoft"],
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
    fn="climb_stairs", companies=["Amazon", "Apple", "Google", "Meta", "Microsoft"],
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
    fn="rob", companies=["Amazon", "Google", "Meta", "Microsoft"],
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
    fn="coin_change", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="length_of_lis", companies=["Google", "Amazon", "Microsoft", "Meta"],
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
    fn="word_break", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="unique_paths", companies=["Amazon", "Google", "Meta", "Microsoft"],
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
    fn="min_distance", companies=["Google", "Amazon", "Microsoft", "Meta", "Apple"],
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
    fn="merge_intervals", companies=["Amazon", "Meta", "Google", "Bloomberg", "Microsoft", "Apple"],
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
    fn="insert_interval", companies=["Google", "Amazon", "LinkedIn", "Meta", "Microsoft"],
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
    fn="min_rooms", companies=["Amazon", "Meta", "Google", "Uber", "Microsoft", "Apple"],
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
    fn="erase_overlap", companies=["Google", "Amazon", "Microsoft"],
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
    fn="max_subarray", companies=["Amazon", "Meta", "Microsoft", "LinkedIn", "Google", "Apple"],
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
    fn="can_jump", companies=["Amazon", "Meta", "Google", "Microsoft"],
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
    fn="can_complete_circuit", companies=["Amazon", "Google", "Meta", "Microsoft"],
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
    fn="merge_k", companies=["Amazon", "Google", "Meta", "Uber", "Microsoft", "Apple"],
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
    fn="reorder", companies=["Meta", "Amazon", "Google", "Microsoft"],
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
    fn="lru_results", companies=["Amazon", "Meta", "Google", "Microsoft", "Apple", "Netflix"],
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
    fn="partition_labels", companies=["Amazon", "Meta", "Microsoft"],
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
    fn="min_stack_results", companies=["Amazon", "Google", "Bloomberg", "Meta", "Microsoft"],
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


# ─────────────────────────────────────────────── heap / tries backfill
# These 6 were added directly to the .ts files in an earlier session before
# build-problems.py was discovered as the actual source of truth. Backfilled
# here so `python3 scripts/build-problems.py` (which overwrites every .ts
# file from P) does not silently delete them.
problem(
    id="kth-smallest-matrix", pattern="heap", tiers=["mid"], title="Kth Smallest in a Sorted Matrix",
    fn="kth_smallest_matrix", companies=["Google", "Amazon", "Bloomberg", "Meta"],
    statement="Given an n x n matrix where every row and every column is sorted in ascending order, return the kth smallest element in the matrix.",
    example="[[1,5,9],[10,11,13],[12,13,15]], k = 8 -> 13",
    params="matrix, k",
    tests=[
        [[[1,5,9],[10,11,13],[12,13,15]], 8],
        [[[-5]], 1],
        [[[1,2],[1,3]], 2],
    ],
    solution="""
def kth_smallest_matrix(matrix, k):
    import heapq
    n = len(matrix)
    heap = [(matrix[0][j], 0, j) for j in range(min(n, k))]
    heapq.heapify(heap)
    for _ in range(k - 1):
        val, r, c = heapq.heappop(heap)
        if r + 1 < n:
            heapq.heappush(heap, (matrix[r + 1][c], r + 1, c))
    return heap[0][0]
""",
    covers="Binary search on value range is the O(n log(max-min)) answer; a min-heap seeded with the first row is the more common O(k log n) one. They should name the row/column sortedness as what lets the heap only ever consider n candidates instead of all n^2 cells.",
)
problem(
    id="top-k-frequent-words", pattern="heap", tiers=["mid"], title="Top K Frequent Words",
    fn="top_k_frequent_words", companies=["Amazon", "Bloomberg", "Google"],
    statement="Given a list of words and a number k, return the k most frequent words, ordered by frequency (highest first). Break ties alphabetically.",
    example='["i","love","leetcode","i","love","coding"], k = 2 -> ["i","love"]',
    params="words, k",
    tests=[
        [["i","love","leetcode","i","love","coding"], 2],
        [["the","day","is","sunny","the","the","the","sunny","is","is"], 4],
        [["a","b","a"], 1],
    ],
    solution="""
def top_k_frequent_words(words, k):
    from collections import Counter
    items = list(Counter(words).items())
    items.sort(key=lambda x: (-x[1], x[0]))
    return [w for w, c in items[:k]]
""",
    covers="The tie-break is the part people skip: sorting or heap comparisons must order by (-count, word) together, not count alone. Bucket sort by frequency avoids a heap entirely and is worth asking about as the O(n) alternative.",
)
problem(
    id="find-median-stream", pattern="heap", tiers=["senior"], title="Running Median of a Number Stream",
    fn="find_medians", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Numbers arrive one at a time. After each one is added, return the median of every number seen so far. Return the list of running medians, in the order the numbers arrived.",
    example="[5, 15, 1] -> [5.0, 10.0, 5.0]",
    params="nums",
    tests=[
        [[5]],
        [[5, 15]],
        [[1, 2, 3]],
        [[]],
        [[6, 10, 2, 6, 5, 0]],
    ],
    solution="""
def find_medians(nums):
    import heapq
    small, large = [], []
    res = []
    for num in nums:
        heapq.heappush(small, -num)
        heapq.heappush(large, -heapq.heappop(small))
        if len(large) > len(small):
            heapq.heappush(small, -heapq.heappop(large))
        if len(small) > len(large):
            res.append(float(-small[0]))
        else:
            res.append((-small[0] + large[0]) / 2.0)
    return res
""",
    covers="Two heaps -- a max-heap for the lower half, a min-heap for the upper half, rebalanced after every insert -- is the expected shape. The median is the top of the larger half, or the average of both tops when equal in size. Sorting on every insert is the naive answer worth naming and rejecting first.",
)
problem(
    id="word-search-wildcard", pattern="tries", tiers=["mid"], title="Add and Search Words With Wildcards",
    fn="search_words", companies=["Google", "Meta", "Amazon"],
    statement="First add every word in words_to_add to a dictionary. Then answer each query: a query may contain '.', which matches any single character. Return, in order, whether each query matches a word in the dictionary.",
    example='add ["bad","dad","mad"], query ".ad" -> true',
    params="words_to_add, queries",
    tests=[
        [["bad","dad","mad"], ["pad",".ad","b..","bad"]],
        [["a"], ["a",".","aa","a."]],
    ],
    solution="""
def search_words(words_to_add, queries):
    trie = {}
    END = "$"
    for w in words_to_add:
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node[END] = True
    def dfs(node, i, q):
        if i == len(q):
            return END in node
        ch = q[i]
        if ch == ".":
            return any(k != END and dfs(v, i + 1, q) for k, v in node.items())
        return ch in node and dfs(node[ch], i + 1, q)
    return [dfs(trie, 0, q) for q in queries]
""",
    covers="A trie plus DFS that branches over every child on a '.' is the expected shape. A query only matches if the DFS reaches the exact end of the word AND that node is marked as a real word ending, not just any node that exists along the path.",
)
problem(
    id="replace-words-with-roots", pattern="tries", tiers=["junior"], title="Replace Words With Their Shortest Root",
    fn="replace_words", companies=["Google", "Amazon"],
    statement="Given a list of root words and a sentence, replace every word in the sentence with the shortest root that is a prefix of it. If no root matches, leave the word unchanged. Words are separated by single spaces.",
    example='roots ["cat","bat","rat"], sentence "the cattle was rattled by the battery" -> "the cat was rat by the bat"',
    params="roots, sentence",
    tests=[
        [["cat","bat","rat"], "the cattle was rattled by the battery"],
        [["a","b","c"], "aadsfasf absfasf acbfnasv acbfnasv"],
    ],
    solution="""
def replace_words(roots, sentence):
    root_set = set(roots)
    def shortest(word):
        for i in range(1, len(word) + 1):
            if word[:i] in root_set:
                return word[:i]
        return word
    return " ".join(shortest(w) for w in sentence.split(" "))
""",
    covers="A trie of the roots, walked one character at a time until a root-end node is found, is the intended shape. A plain prefix scan over a small root set is a legitimate alternative -- ask what changes with a million-entry root dictionary.",
)
problem(
    id="maximum-xor-pair", pattern="tries", tiers=["senior"], title="Maximum XOR of Two Numbers",
    fn="max_xor", companies=["Google"],
    statement="Given an array of non-negative integers, return the maximum value of nums[i] XOR nums[j] over any pair of elements.",
    example="[3,10,5,25,2,8] -> 28",
    params="nums",
    tests=[
        [[3, 10, 5, 25, 2, 8]],
        [[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]],
        [[0]],
        [[0, 0]],
    ],
    solution="""
def max_xor(nums):
    if len(nums) < 2:
        return 0
    L = max(nums).bit_length() or 1
    root = {}
    for n in nums:
        node = root
        for i in range(L - 1, -1, -1):
            b = (n >> i) & 1
            node = node.setdefault(b, {})
    best = 0
    for n in nums:
        node = root
        x = 0
        for i in range(L - 1, -1, -1):
            b = (n >> i) & 1
            t = 1 - b
            if t in node:
                x |= (1 << i)
                node = node[t]
            else:
                node = node[b]
        best = max(best, x)
    return best
""",
    covers="Same trie shape as the string problems, over bits instead of characters: insert every number's binary representation, then greedily walk toward the opposite bit at each level. The O(n^2) pairwise check is a fine starting point, but they should explain WHY the greedy opposite-bit choice maximizes the result.",
)

# ─────────────────────────────────────────────── matrix (new pattern)
problem(
    id="rotate-image", pattern="matrix", tiers=["mid"], title="Rotate Image 90 Degrees",
    fn="rotate_image", companies=["Amazon", "Microsoft", "Apple", "Google", "Meta"],
    statement="Given an n x n matrix, return a new matrix rotated 90 degrees clockwise.",
    example="[[1,2,3],[4,5,6],[7,8,9]] -> [[7,4,1],[8,5,2],[9,6,3]]",
    params="matrix",
    tests=[
        [[[1,2,3],[4,5,6],[7,8,9]]],
        [[[1]]],
        [[[1,2],[3,4]]],
    ],
    solution="""
def rotate_image(matrix):
    n = len(matrix)
    return [[matrix[n - 1 - c][r] for c in range(n)] for r in range(n)]
""",
    covers="The in-place version (transpose then reverse each row, or four-way swap by layer) is what a strong candidate reaches for when told to do it without extra memory. Ask them to derive the index formula rather than recite it.",
)
problem(
    id="spiral-matrix", pattern="matrix", tiers=["mid"], title="Spiral Matrix Traversal",
    fn="spiral_order", companies=["Google", "Microsoft", "Amazon", "Meta", "Apple"],
    statement="Given an m x n matrix, return all elements in spiral order, starting from the top-left and moving right.",
    example="[[1,2,3],[4,5,6],[7,8,9]] -> [1,2,3,6,9,8,7,4,5]",
    params="matrix",
    tests=[
        [[[1,2,3],[4,5,6],[7,8,9]]],
        [[[1,2,3,4],[5,6,7,8],[9,10,11,12]]],
        [[[1]]],
        [[[1,2],[3,4]]],
    ],
    solution="""
def spiral_order(matrix):
    res = []
    if not matrix:
        return res
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            res.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            res.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                res.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                res.append(matrix[r][left])
            left += 1
    return res
""",
    covers="Four shrinking boundaries (top/bottom/left/right) walked in order is the clean answer. The two guard checks before the bottom row and left column are the part people forget, and a non-square input is the case that catches a version without them.",
)
problem(
    id="set-matrix-zeroes", pattern="matrix", tiers=["mid"], title="Set Matrix Zeroes",
    fn="set_zeroes", companies=["Microsoft", "Amazon", "Google", "Meta"],
    statement="Given an m x n matrix, return a new matrix where any row or column that contained a 0 in the original is entirely zeroed out.",
    example="[[1,1,1],[1,0,1],[1,1,1]] -> [[1,0,1],[0,0,0],[1,0,1]]",
    params="matrix",
    tests=[
        [[[1,1,1],[1,0,1],[1,1,1]]],
        [[[0,1,2,0],[3,4,5,2],[1,3,1,5]]],
        [[[1]]],
        [[[1,0]]],
    ],
    solution="""
def set_zeroes(matrix):
    rows, cols = set(), set()
    for i, row in enumerate(matrix):
        for j, v in enumerate(row):
            if v == 0:
                rows.add(i)
                cols.add(j)
    return [
        [0 if (i in rows or j in cols) else v for j, v in enumerate(row)]
        for i, row in enumerate(matrix)
    ]
""",
    covers="A first pass to record which rows/columns contain a zero, then a second pass to zero them, avoids the bug of zeroing a cell and then reading that zero as a NEW trigger later in the same pass. The O(1)-extra-space version stores the flags in the matrix's own first row and column instead of two sets.",
)

# ─────────────────────────────────────────────── two-pointers / arrays additions
problem(
    id="trapping-rain-water", pattern="two-pointers", tiers=["mid"], title="Trapping Rain Water",
    fn="trap", companies=["Google", "Amazon", "Apple", "Microsoft", "Netflix", "Meta"],
    statement="Given a list of non-negative integers representing an elevation map where each bar has width 1, return how much water it can trap after raining.",
    example="[0,1,0,2,1,0,1,3,2,1,2,1] -> 6",
    params="heights",
    tests=[
        [[0,1,0,2,1,0,1,3,2,1,2,1]],
        [[4,2,0,3,2,5]],
        [[]],
        [[1,1]],
        [[5,4,1,2]],
    ],
    solution="""
def trap(heights):
    if not heights:
        return 0
    l, r = 0, len(heights) - 1
    left_max, right_max = heights[l], heights[r]
    water = 0
    while l < r:
        if left_max <= right_max:
            l += 1
            left_max = max(left_max, heights[l])
            water += left_max - heights[l]
        else:
            r -= 1
            right_max = max(right_max, heights[r])
            water += right_max - heights[r]
    return water
""",
    covers="Two pointers closing from both ends, each tracking the max seen on its own side, is the O(1)-space answer. The insight to press for: water above any bar is bounded by the SMALLER of the two side maxima, which is exactly why the pointer on the smaller-max side is the one that's safe to advance.",
)
problem(
    id="next-permutation", pattern="arrays-hashing", tiers=["mid"], title="Next Lexicographic Permutation",
    fn="next_permutation", companies=["Meta", "Microsoft", "Amazon", "Google"],
    statement="Given a list of numbers representing a permutation, return the next permutation in lexicographic order. If it is already the highest possible, return the lowest (sorted ascending).",
    example="[1,2,3] -> [1,3,2]",
    params="nums",
    tests=[
        [[1,2,3]],
        [[3,2,1]],
        [[1,1,5]],
        [[1]],
    ],
    solution="""
def next_permutation(nums):
    nums = nums[:]
    n = len(nums)
    i = n - 2
    while i >= 0 and nums[i] >= nums[i + 1]:
        i -= 1
    if i >= 0:
        j = n - 1
        while nums[j] <= nums[i]:
            j -= 1
        nums[i], nums[j] = nums[j], nums[i]
    nums[i + 1:] = reversed(nums[i + 1:])
    return nums
""",
    covers="Find the rightmost ascent, swap it with the smallest element to its right that's still bigger than it, then reverse everything after that point. Each of those three steps has a reason; ask them to justify the reverse specifically (the suffix is descending at that point, so reversing it is what makes it the smallest possible arrangement).",
)
problem(
    id="letter-combinations-phone", pattern="backtracking", tiers=["mid"], title="Letter Combinations of a Phone Number",
    fn="letter_combinations", companies=["Meta", "Microsoft", "Amazon", "Google", "Apple"],
    statement="Given a string of digits 2-9, return every possible letter combination the digits could represent on a phone keypad, in any order.",
    example='"23" -> ["ad","ae","af","bd","be","bf","cd","ce","cf"]',
    params="digits",
    unordered=True,
    tests=[
        ["23"],
        [""],
        ["2"],
    ],
    solution="""
def letter_combinations(digits):
    if not digits:
        return []
    m = {"2":"abc","3":"def","4":"ghi","5":"jkl","6":"mno","7":"pqrs","8":"tuv","9":"wxyz"}
    res = []
    def bt(i, path):
        if i == len(digits):
            res.append("".join(path))
            return
        for ch in m[digits[i]]:
            path.append(ch)
            bt(i + 1, path)
            path.pop()
    bt(0, [])
    return res
""",
    covers="Standard backtracking: one recursive call per digit, branching over that digit's letters. The empty-string edge case (return [], not ['']) is the one people get backwards.",
)
problem(
    id="word-search", pattern="backtracking", tiers=["mid"], title="Find a Single Word in a Letter Grid",
    fn="word_exists", companies=["Amazon", "Microsoft", "Netflix", "Google", "Meta"],
    statement="Given a grid of letters and a single target word, return whether the word can be spelled by walking between horizontally or vertically adjacent cells without reusing a cell.",
    example='[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED" -> true',
    params="grid, word",
    tests=[
        [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED"],
        [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "SEE"],
        [[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCB"],
        [[["A"]], "A"],
    ],
    solution="""
def word_exists(grid, word):
    if not grid or not grid[0]:
        return False
    rows, cols = len(grid), len(grid[0])
    def dfs(r, c, i):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != word[i]:
            return False
        tmp = grid[r][c]
        grid[r][c] = "#"
        found = dfs(r+1,c,i+1) or dfs(r-1,c,i+1) or dfs(r,c+1,i+1) or dfs(r,c-1,i+1)
        grid[r][c] = tmp
        return found
    for r in range(rows):
        for c in range(cols):
            if dfs(r, c, 0):
                return True
    return False
""",
    covers="Backtracking DFS with a visited-marker swapped in and restored on the cell itself (rather than a separate visited set) is the space-efficient version. This is the single-word sibling of Word Search II -- ask when a trie-based multi-word search would be worth the setup cost over running this once per word.",
)

# ─────────────────────────────────────────────── dynamic programming additions
problem(
    id="decode-ways", pattern="dynamic-programming", tiers=["mid"], title="Count Ways to Decode a Digit String",
    fn="num_decodings", companies=["Meta", "Amazon", "Google", "Microsoft"],
    statement="A string of digits was encoded from letters A-Z using 1=A ... 26=Z. Return the number of ways it could have been decoded. A leading zero in any group makes that decoding invalid.",
    example='"226" -> 3',
    params="s",
    tests=[
        ["12"],
        ["226"],
        ["06"],
        ["0"],
        ["10"],
        ["27"],
    ],
    solution="""
def num_decodings(s):
    if not s or s[0] == "0":
        return 0
    n = len(s)
    dp = [0] * (n + 1)
    dp[0] = 1
    dp[1] = 1
    for i in range(2, n + 1):
        one = int(s[i-1:i])
        two = int(s[i-2:i])
        if one >= 1:
            dp[i] += dp[i-1]
        if 10 <= two <= 26:
            dp[i] += dp[i-2]
    return dp[n]
""",
    covers="1-D DP where dp[i] depends on whether the last one or two digits form a valid group. The leading-zero trap ('06' can't be F, only 0-prefixed nothing) is the boundary worth probing, plus a string of all zeros.",
)
problem(
    id="maximum-product-subarray", pattern="dynamic-programming", tiers=["mid"], title="Maximum Product Subarray",
    fn="max_product", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers, return the largest product of any contiguous subarray.",
    example="[2,3,-2,4] -> 6",
    params="nums",
    tests=[
        [[2,3,-2,4]],
        [[-2,0,-1]],
        [[-2,3,-4]],
        [[0]],
        [[2,-5,-2,-4,3]],
    ],
    solution="""
def max_product(nums):
    if not nums:
        return 0
    res = nums[0]
    cur_max = cur_min = nums[0]
    for n in nums[1:]:
        candidates = (n, cur_max * n, cur_min * n)
        cur_max = max(candidates)
        cur_min = min(candidates)
        res = max(res, cur_max)
    return res
""",
    covers="The twist over Maximum Subarray: a negative number can turn the smallest running product into the largest, so both a running max AND a running min must be tracked. Losing the running min is the near-universal bug on a first attempt.",
)

# ─────────────────────────────────────────────── linked-list / two-pointers additions
problem(
    id="merge-sorted-array", pattern="two-pointers", tiers=["junior"], title="Merge Two Sorted Arrays",
    fn="merge_sorted", companies=["Microsoft", "Amazon", "Google", "Meta"],
    statement="Given two arrays already sorted in ascending order, return one merged array in ascending order.",
    example="[1,2,3], [2,5,6] -> [1,2,2,3,5,6]",
    params="nums1, nums2",
    tests=[
        [[1,2,3],[2,5,6]],
        [[],[1]],
        [[1],[]],
        [[4,5,6],[1,2,3]],
    ],
    solution="""
def merge_sorted(nums1, nums2):
    i = j = 0
    res = []
    while i < len(nums1) and j < len(nums2):
        if nums1[i] <= nums2[j]:
            res.append(nums1[i]); i += 1
        else:
            res.append(nums2[j]); j += 1
    res.extend(nums1[i:])
    res.extend(nums2[j:])
    return res
""",
    covers="The linear two-pointer merge is the O(m+n) answer and the actual building block of merge sort. Ask what changes if this had to merge in place into the first array with only its own trailing capacity to work with -- that's the version this is adapted from.",
)
problem(
    id="sort-colors", pattern="two-pointers", tiers=["mid"], title="Sort an Array of Three Values",
    fn="sort_colors", companies=["Microsoft", "Amazon", "Google", "Meta", "Apple"],
    statement="Given an array containing only the values 0, 1 and 2, return it sorted in a single pass without using a separate counting or sorting step.",
    example="[2,0,2,1,1,0] -> [0,0,1,1,2,2]",
    params="nums",
    tests=[
        [[2,0,2,1,1,0]],
        [[2,0,1]],
        [[0]],
        [[1,2,0]],
    ],
    solution="""
def sort_colors(nums):
    nums = nums[:]
    low, mid, high = 0, 0, len(nums) - 1
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1; mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
    return nums
""",
    covers="The Dutch national flag three-way partition, in one pass with three pointers. The trap is advancing mid after a swap with high -- that swap can bring in an unexamined 0, so mid must NOT advance in that branch, unlike the swap-with-low branch where it's safe to.",
)
problem(
    id="first-missing-positive", pattern="arrays-hashing", tiers=["senior"], title="First Missing Positive Integer",
    fn="first_missing_positive", companies=["Meta", "Microsoft", "Amazon", "Google"],
    statement="Given an unsorted array of integers, return the smallest positive integer that does not appear in it. Must run in O(n) time and O(1) extra space.",
    example="[3,4,-1,1] -> 2",
    params="nums",
    tests=[
        [[1,2,0]],
        [[3,4,-1,1]],
        [[7,8,9,11,12]],
        [[]],
        [[1]],
    ],
    solution="""
def first_missing_positive(nums):
    nums = nums[:]
    n = len(nums)
    for i in range(n):
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            j = nums[i] - 1
            nums[i], nums[j] = nums[j], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1
""",
    covers="The O(1)-space trick: the answer must be between 1 and n+1, so each value can be placed at its own index (cyclic sort) using the array itself as the hash set. A hash-set solution is O(n) space and a fine warm-up, but the constraint is specifically there to push past it.",
)
problem(
    id="add-two-numbers", pattern="linked-list", tiers=["junior"], title="Add Two Numbers as Linked Lists",
    fn="add_two_numbers", companies=["Microsoft", "Amazon", "Google", "Meta"],
    statement="Two non-negative integers are given as lists of digits in reverse order (least significant digit first), one digit per node. Return their sum in the same reverse-digit-order form.",
    example="[2,4,3] + [5,6,4] -> [7,0,8]  (342 + 465 = 807)",
    params="l1, l2",
    tests=[
        [[2,4,3],[5,6,4]],
        [[0],[0]],
        [[9,9,9,9,9,9,9],[9,9,9,9]],
        [[5],[5]],
    ],
    solution="""
def add_two_numbers(l1, l2):
    carry = 0
    res = []
    i = j = 0
    while i < len(l1) or j < len(l2) or carry:
        a = l1[i] if i < len(l1) else 0
        b = l2[j] if j < len(l2) else 0
        total = a + b + carry
        carry = total // 10
        res.append(total % 10)
        i += 1; j += 1
    return res
""",
    covers="Simulated grade-school addition, one digit at a time with a carry, stopping only when both lists AND the carry are exhausted -- the carry-after-both-lists-end case (999...+9999) is what a version that stops too early misses.",
)

# ─────────────────────────────────────────────── tree additions
problem(
    id="symmetric-tree", pattern="trees", tiers=["junior"], title="Symmetric Binary Tree",
    fn="is_symmetric", companies=["Microsoft", "Amazon", "Google", "Meta"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return true if it is a mirror of itself around its center.",
    example="[1,2,2,3,4,4,3] -> true",
    params="tree",
    tests=[
        [[1,2,2,3,4,4,3]],
        [[1,2,2,None,3,None,3]],
        [[]],
        [[1]],
    ],
    solution=TREE_HELPERS + """
def is_symmetric(tree):
    root = _build(tree)
    def mirror(a, b):
        if not a and not b:
            return True
        if not a or not b or a.val != b.val:
            return False
        return mirror(a.left, b.right) and mirror(a.right, b.left)
    return mirror(root.left, root.right) if root else True
""",
    covers="A recursive mirror check comparing the outer pair and inner pair of grandchildren at each level. Ask for the iterative version with an explicit queue holding pairs of nodes to compare.",
)
problem(
    id="lowest-common-ancestor-tree", pattern="trees", tiers=["mid"], title="Lowest Common Ancestor in a Binary Tree",
    fn="lca_general", companies=["Meta", "Apple", "Amazon", "Google"],
    statement="A binary tree (not necessarily a search tree) is given as a level-order array where null marks a missing child, along with two values present in it, assumed unique. Return the value of the deepest node that has both as descendants, where a node may be its own descendant.",
    example="[3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1 -> 3",
    params="tree, p, q",
    tests=[
        [[3,5,1,6,2,0,8,None,None,7,4],5,1],
        [[3,5,1,6,2,0,8,None,None,7,4],5,4],
        [[1,2],1,2],
    ],
    solution=TREE_HELPERS + """
def lca_general(tree, p, q):
    root = _build(tree)
    def find(n):
        if not n or n.val == p or n.val == q:
            return n
        l = find(n.left)
        r = find(n.right)
        if l and r:
            return n
        return l or r
    res = find(root)
    return res.val if res else None
""",
    covers="Without the BST ordering to exploit, this is a postorder search: return the node itself if found, otherwise whichever side returned something, or both if this node is the split point. The sibling problem lowest-common-ancestor-bst is the special case worth contrasting -- ask what shortcut the ordering enabled there that doesn't exist here.",
)
problem(
    id="binary-tree-max-path-sum", pattern="trees", tiers=["senior"], title="Maximum Path Sum in a Binary Tree",
    fn="max_path_sum", companies=["Google", "Amazon", "Meta", "Microsoft"],
    statement="A binary tree is given as a level-order array where null marks a missing child. A path is any sequence of nodes connected by edges, not necessarily passing through the root, and does not need to include the whole tree. Return the largest sum of node values along any path.",
    example="[-10,9,20,null,null,15,7] -> 42",
    params="tree",
    tests=[
        [[1,2,3]],
        [[-10,9,20,None,None,15,7]],
        [[2,-1]],
        [[-3]],
    ],
    solution=TREE_HELPERS + """
def max_path_sum(tree):
    root = _build(tree)
    best = [float("-inf")]
    def dfs(n):
        if not n:
            return 0
        l = max(dfs(n.left), 0)
        r = max(dfs(n.right), 0)
        best[0] = max(best[0], n.val + l + r)
        return n.val + max(l, r)
    dfs(root)
    return best[0]
""",
    covers="Two different things are computed at each node: the best path THROUGH it (which can use both children, updates the global answer, but can never be returned upward) and the best path EXTENDING from it upward (which can only use one child, since a path can't branch). Negative subtree contributions get clamped to zero rather than subtracted.",
)
problem(
    id="construct-tree-preorder-inorder", pattern="trees", tiers=["senior"], title="Build a Tree From Preorder and Inorder Traversals",
    fn="build_tree", companies=["Microsoft", "Amazon", "Google"],
    statement="Given the preorder and inorder traversals of a binary tree with unique values, reconstruct the tree. Return it as a level-order array with trailing nulls removed.",
    example="preorder [3,9,20,15,7], inorder [9,3,15,20,7] -> [3,9,20,null,null,15,7]",
    params="preorder, inorder",
    tests=[
        [[3,9,20,15,7],[9,3,15,20,7]],
        [[-1],[-1]],
        [[1,2],[2,1]],
    ],
    solution=TREE_HELPERS + """
def build_tree(preorder, inorder):
    if not preorder:
        return []
    idx = {v: i for i, v in enumerate(inorder)}
    pre_iter = iter(preorder)
    def helper(lo, hi):
        if lo > hi:
            return None
        val = next(pre_iter)
        node = _N(val)
        mid = idx[val]
        node.left = helper(lo, mid - 1)
        node.right = helper(mid + 1, hi)
        return node
    root = helper(0, len(inorder) - 1)
    if not root:
        return []
    out = []
    q = [root]
    while q:
        n = q.pop(0)
        if n is None:
            out.append(None); continue
        out.append(n.val); q.append(n.left); q.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out
""",
    covers="Preorder gives roots in the order to build them; inorder gives, for a known root, exactly which values fall in its left versus right subtree. A hash map from value to inorder index turns the naive O(n) subtree search into O(1), which is the difference between an O(n^2) and an O(n) solution.",
)


# ─────────────────────────────────────────────── leetcode-companywise additions
problem(
    id="subarray-sum-k", pattern="arrays-hashing", tiers=["mid"], title="Subarray Sum Equals K",
    fn="subarray_sum_k", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given an array of integers (which may include negative numbers) and a target k, return how many contiguous subarrays sum to exactly k.",
    example="nums = [1, 1, 1], k = 2 -> 2 (the two subarrays [1,1])",
    params="nums, k",
    tests=[[[1,1,1],2],[[1,2,3],3],[[1,-1,0],0],[[-1,-1,1],0],[[3,4,7,2,-3,1,4,2],7]],
    solution="""
def subarray_sum_k(nums, k):
    count = 0
    running = 0
    seen = {0: 1}
    for n in nums:
        running += n
        count += seen.get(running - k, 0)
        seen[running] = seen.get(running, 0) + 1
    return count
""",
    covers="Recognizes the need for a running sum with a hash map of seen sums rather than a nested O(n^2) scan. Explains why seeding the map with {0: 1} is necessary, and handles negative numbers correctly.",
)
problem(
    id="median-two-sorted-arrays", pattern="binary-search", tiers=["senior"], title="Median of Two Sorted Arrays",
    fn="find_median_sorted_arrays", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given two sorted arrays, return the median of the combined set of numbers as a single number, averaging the two middle values when the total count is even.",
    example="nums1 = [1, 3], nums2 = [2] -> 2",
    params="nums1, nums2",
    tests=[[[1,3],[2]],[[1,2],[3,4]],[[],[1]],[[0,0],[0,0]],[[1,2,3],[4,5,6,7]]],
    solution="""
def find_median_sorted_arrays(nums1, nums2):
    merged = sorted(nums1 + nums2)
    n = len(merged)
    mid = n // 2
    if n % 2 == 1:
        return merged[mid]
    return (merged[mid - 1] + merged[mid]) / 2
""",
    covers="States the brute-force merge-and-index approach first, then discusses the O(log(min(m,n))) binary-search partition approach when pushed to do better. Handles empty-array and even/odd-length edge cases explicitly.",
)
problem(
    id="search-range", pattern="binary-search", tiers=["junior"], title="Find First and Last Position of a Target",
    fn="search_range", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given a sorted array and a target value, return the first and last index at which the target appears, as [first, last]. Return [-1, -1] if it does not appear.",
    example="nums = [5, 7, 7, 8, 8, 10], target = 8 -> [3, 4]",
    params="nums, target",
    tests=[[[5,7,7,8,8,10],8],[[5,7,7,8,8,10],6],[[],0],[[1],1],[[2,2],2]],
    solution="""
def search_range(nums, target):
    first = -1
    last = -1
    for i, n in enumerate(nums):
        if n == target:
            if first == -1:
                first = i
            last = i
    return [first, last]
""",
    covers="Reaches for two separate binary searches (one for the left boundary, one for the right) to hit O(log n) rather than a linear scan, and can explain why a single binary search cannot find both ends.",
)
problem(
    id="search-2d-matrix", pattern="binary-search", tiers=["junior"], title="Search a Sorted 2D Grid",
    fn="search_matrix", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a grid of integers where each row is sorted left to right and the first value of each row is greater than the last value of the previous row, return true if a target value exists anywhere in the grid.",
    example="matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3 -> true",
    params="matrix, target",
    tests=[[[[1,3,5,7],[10,11,16,20],[23,30,34,60]],3],[[[1,3,5,7],[10,11,16,20],[23,30,34,60]],13],[[[1]],1],[[[1]],2],[[[],[]],1]],
    solution="""
def search_matrix(matrix, target):
    for row in matrix:
        if row and row[0] <= target <= row[-1]:
            return target in row
    return False
""",
    covers="Treats the grid as a single sorted sequence and binary searches the virtual flattened index rather than scanning row by row, and can convert a flat index back to row/column coordinates.",
)
problem(
    id="rotate-array", pattern="two-pointers", tiers=["junior"], title="Rotate an Array",
    fn="rotate_array", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given an array and a number k, rotate the array to the right by k steps and return the resulting array.",
    example="nums = [1,2,3,4,5,6,7], k = 3 -> [5,6,7,1,2,3,4]",
    params="nums, k",
    tests=[[[1,2,3,4,5,6,7],3],[[1,2],3],[[1],0],[[],5],[[1,2,3,4],4]],
    solution="""
def rotate_array(nums, k):
    n = len(nums)
    if n == 0:
        return nums[:]
    k = k % n
    return nums[-k:] + nums[:-k] if k else nums[:]
""",
    covers="Reaches for the reverse-three-times in-place trick (or explicitly discusses the space/time trade-off of a fresh array) rather than rotating one step at a time, and correctly reduces k modulo the array length.",
)
problem(
    id="remove-duplicates-sorted", pattern="two-pointers", tiers=["junior"], title="Deduplicate a Sorted Array",
    fn="remove_duplicates", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a sorted array of integers, return a new array with duplicate values removed, keeping only the first occurrence of each value in order.",
    example="[1,1,2,2,3] -> [1,2,3]",
    params="nums",
    tests=[[[1,1,2,2,3]],[[]],[[1]],[[1,1,1,1]],[[0,0,1,1,1,2,2,3,3,4]]],
    solution="""
def remove_duplicates(nums):
    out = []
    for n in nums:
        if not out or out[-1] != n:
            out.append(n)
    return out
""",
    covers="Uses a single forward pass comparing against the last kept value rather than a set or nested loop, and explains why sortedness is what makes this solvable in one linear pass.",
)
problem(
    id="move-zeroes", pattern="two-pointers", tiers=["junior"], title="Move Zeroes to the End",
    fn="move_zeroes", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers, move all zeroes to the end while keeping the relative order of the non-zero elements, and return the resulting array.",
    example="[0,1,0,3,12] -> [1,3,12,0,0]",
    params="nums",
    tests=[[[0,1,0,3,12]],[[0]],[[1,2,3]],[[0,0,0]],[[]]],
    solution="""
def move_zeroes(nums):
    non_zero = [n for n in nums if n != 0]
    return non_zero + [0] * (len(nums) - len(non_zero))
""",
    covers="Prefers a stable in-place two-pointer swap over building a new array when pushed on space, and explains why relative order of the non-zero elements must be preserved.",
)
problem(
    id="four-sum", pattern="two-pointers", tiers=["mid"], title="Four Sum",
    fn="four_sum", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers and a target, return all unique quadruples [a, b, c, d] from the array whose values sum to the target. Each quadruple's values should be sorted ascending, and no duplicate quadruples should appear.",
    example="nums = [1,0,-1,0,-2,2], target = 0 -> [[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]",
    params="nums, target",
    tests=[[[1,0,-1,0,-2,2],0],[[2,2,2,2,2],8],[[],0],[[0,0,0,0],0]],
    unordered=True,
    solution="""
def four_sum(nums, target):
    nums = sorted(nums)
    n = len(nums)
    res = []
    for i in range(n - 3):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        for j in range(i + 1, n - 2):
            if j > i + 1 and nums[j] == nums[j - 1]:
                continue
            lo, hi = j + 1, n - 1
            while lo < hi:
                total = nums[i] + nums[j] + nums[lo] + nums[hi]
                if total == target:
                    res.append([nums[i], nums[j], nums[lo], nums[hi]])
                    lo += 1
                    hi -= 1
                    while lo < hi and nums[lo] == nums[lo - 1]:
                        lo += 1
                    while lo < hi and nums[hi] == nums[hi + 1]:
                        hi -= 1
                elif total < target:
                    lo += 1
                else:
                    hi -= 1
    return res
""",
    covers="Sorts first, then reduces to two nested loops plus a two-pointer sweep, and explicitly skips duplicates at all three levels to avoid repeated quadruples rather than deduplicating the result afterward.",
)
problem(
    id="permutation-in-string", pattern="sliding-window", tiers=["mid"], title="Permutation in a String",
    fn="check_inclusion", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given two strings s1 and s2, return true if s2 contains a contiguous substring that is a character rearrangement of s1.",
    example='s1 = "ab", s2 = "eidbaooo" -> true, because "ba" is a substring of s2 and a rearrangement of "ab"',
    params="s1, s2",
    tests=[["ab","eidbaooo"],["ab","eidboaoo"],["a","a"],["adc","dcda"],["abc","ccccbbbbaaaa"]],
    solution="""
def check_inclusion(s1, s2):
    from collections import Counter
    need = Counter(s1)
    window = len(s1)
    if window > len(s2):
        return False
    have = Counter(s2[:window])
    if have == need:
        return True
    for i in range(window, len(s2)):
        have[s2[i]] += 1
        left = s2[i - window]
        have[left] -= 1
        if have[left] == 0:
            del have[left]
        if have == need:
            return True
    return False
""",
    covers="Uses a fixed-size sliding window with an incrementally updated character count rather than re-counting the window from scratch at every position, and explains why the window size must equal len(s1).",
)
problem(
    id="sliding-window-maximum", pattern="sliding-window", tiers=["senior"], title="Sliding Window Maximum",
    fn="max_sliding_window", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers and a window size k, return an array of the maximum value in each contiguous window of size k as it slides from left to right across the array.",
    example="nums = [1,3,-1,-3,5,3,6,7], k = 3 -> [3,3,5,5,6,7]",
    params="nums, k",
    tests=[[[1,3,-1,-3,5,3,6,7],3],[[1],1],[[9,11],2],[[4,-2],1],[[1,-1],1]],
    solution="""
def max_sliding_window(nums, k):
    from collections import deque
    dq = deque()
    res = []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res
""",
    covers="Reaches for a monotonic deque of indices rather than recomputing each window's maximum from scratch, and can explain why the deque stays in decreasing value order and why stale indices fall off the front.",
)
problem(
    id="longest-valid-parentheses", pattern="stack", tiers=["senior"], title="Longest Valid Parentheses Run",
    fn="longest_valid_parens", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a string containing only '(' and ')', return the length of the longest contiguous substring that forms valid, properly matched parentheses.",
    example='"(()" -> 2',
    params="s",
    tests=[["(()"],[")()())"],[""],["()(()"],["()()"]],
    solution="""
def longest_valid_parens(s):
    stack = [-1]
    best = 0
    for i, c in enumerate(s):
        if c == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)
            else:
                best = max(best, i - stack[-1])
    return best
""",
    covers="Uses a stack of indices (or a DP array) rather than a naive running balance counter, and can explain why seeding the stack with -1 correctly handles a valid run that starts at index 0.",
)
problem(
    id="best-time-stock-ii", pattern="greedy", tiers=["junior"], title="Best Time to Buy and Sell, Unlimited Trades",
    fn="max_profit_multi", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given an array of daily stock prices, return the maximum profit achievable by buying and selling any number of times, holding at most one share at a time.",
    example="[7,1,5,3,6,4] -> 7, buying at 1 and selling at 5 (profit 4), then buying at 3 and selling at 6 (profit 3)",
    params="prices",
    tests=[[[7,1,5,3,6,4]],[[1,2,3,4,5]],[[7,6,4,3,1]],[[]],[[5]]],
    solution="""
def max_profit_multi(prices):
    profit = 0
    for i in range(1, len(prices)):
        if prices[i] > prices[i - 1]:
            profit += prices[i] - prices[i - 1]
    return profit
""",
    covers="Recognizes that summing every positive day-over-day gain is equivalent to buying at every local minimum and selling at every local maximum, without tracking explicit buy/sell state.",
)
problem(
    id="valid-sudoku", pattern="arrays-hashing", tiers=["mid"], title="Validate a Sudoku Board",
    fn="is_valid_sudoku", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given a 9x9 Sudoku board as a grid of single-character strings (with '.' marking an empty cell), return true if the filled-in cells satisfy Sudoku's rules: no repeated digit 1-9 in any row, column, or 3x3 sub-box. The board does not need to be solvable overall, only currently consistent.",
    example="A board with two '5's in the same row is invalid -> false",
    params="board",
    tests=[
        [[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],
        [[["5","3","4","6","7","8","9","1","5"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],
        [[[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."],[".",".",".",".",".",".",".",".","."]]],
    ],
    solution="""
def is_valid_sudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == '.':
                continue
            b = (r // 3) * 3 + c // 3
            if v in rows[r] or v in cols[c] or v in boxes[b]:
                return False
            rows[r].add(v)
            cols[c].add(v)
            boxes[b].add(v)
    return True
""",
    covers="Tracks seen digits per row, column, and 3x3 box in a single pass rather than three separate passes, and gets the box-index formula (row // 3) * 3 + col // 3 right without trial and error.",
)
problem(
    id="majority-element", pattern="arrays-hashing", tiers=["junior"], title="Find the Majority Element",
    fn="majority_element", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers where one value appears more than n/2 times, return that value.",
    example="[2,2,1,1,1,2,2] -> 2",
    params="nums",
    tests=[[[2,2,1,1,1,2,2]],[[3,2,3]],[[1]],[[6,5,5]],[[1,1,1,2,2]]],
    solution="""
def majority_element(nums):
    from collections import Counter
    counts = Counter(nums)
    return counts.most_common(1)[0][0]
""",
    covers="Reaches for Boyer-Moore voting for O(1) space when pushed to do better than a hash map, and can explain why a guaranteed majority element keeps the running counter from ever fully cancelling out.",
)
problem(
    id="nodes-distance-k", pattern="trees", tiers=["senior"], title="All Nodes at Distance K",
    fn="nodes_at_distance_k", companies=["Amazon", "Meta", "Microsoft", "Apple"],
    statement="A binary tree is given as a level-order array where null marks a missing child, along with a target value present in the tree and a distance k. Return the values of all nodes that are exactly k edges away from the target node, in any order.",
    example="[3,5,1,6,2,0,8,null,null,7,4], target = 5, k = 2 -> [7, 4, 1] (order may vary)",
    params="tree, target, k",
    tests=[[[3,5,1,6,2,0,8,None,None,7,4],5,2],[[3,5,1,6,2,0,8,None,None,7,4],5,0],[[1],1,0],[[1],1,1],[[0,1],0,1]],
    unordered=True,
    solution=TREE_HELPERS + """
def nodes_at_distance_k(tree, target, k):
    from collections import deque
    root = _build(tree)
    parent = {}
    target_node = None
    q = deque([root])
    while q:
        n = q.popleft()
        if n.val == target:
            target_node = n
        for c in (n.left, n.right):
            if c:
                parent[id(c)] = n
                q.append(c)
    visited = {id(target_node)}
    frontier = [target_node]
    dist = 0
    while frontier and dist < k:
        nxt = []
        for n in frontier:
            for nb in (n.left, n.right, parent.get(id(n))):
                if nb and id(nb) not in visited:
                    visited.add(id(nb))
                    nxt.append(nb)
        frontier = nxt
        dist += 1
    return [n.val for n in frontier]
""",
    covers="Recognizes a tree alone only supports downward traversal, so parent pointers (or treating it as an undirected graph) are needed to search in every direction, then runs a plain BFS out from the target.",
)
problem(
    id="diameter-binary-tree", pattern="trees", tiers=["mid"], title="Diameter of a Binary Tree",
    fn="diameter_of_tree", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return the length, in edges, of the longest path between any two nodes in the tree -- the path does not need to pass through the root.",
    example="[1,2,3,4,5] -> 3",
    params="tree",
    tests=[[[1,2,3,4,5]],[[1]],[[]],[[1,2]],[[1,None,2,None,3]]],
    solution=TREE_HELPERS + """
def diameter_of_tree(tree):
    root = _build(tree)
    best = [0]
    def depth(n):
        if not n:
            return 0
        l = depth(n.left)
        r = depth(n.right)
        best[0] = max(best[0], l + r)
        return 1 + max(l, r)
    depth(root)
    return best[0]
""",
    covers="Recognizes the diameter is a path through some node's left and right subtrees, not necessarily the root, and computes it in one post-order pass rather than recomputing height at every node separately.",
)
problem(
    id="right-side-view", pattern="trees", tiers=["mid"], title="Binary Tree Right Side View",
    fn="right_side_view", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="A binary tree is given as a level-order array where null marks a missing child. Return the values visible when looking at the tree from the right side, ordered from the top level down -- the last node processed at each level.",
    example="[1,2,3,null,5,null,4] -> [1, 3, 4]",
    params="tree",
    tests=[[[1,2,3,None,5,None,4]],[[1,None,3]],[[]],[[1,2]],[[1,2,3,4]]],
    solution=TREE_HELPERS + """
def right_side_view(tree):
    from collections import deque
    root = _build(tree)
    if not root:
        return []
    res = []
    q = deque([root])
    while q:
        n = len(q)
        for i in range(n):
            node = q.popleft()
            if i == n - 1:
                res.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
    return res
""",
    covers="Performs a level-order BFS and keeps the last node processed at each level, rather than a right-first DFS -- should be able to explain the DFS version too if asked to avoid the queue.",
)
problem(
    id="n-queens-count", pattern="backtracking", tiers=["senior"], title="Count N-Queens Placements",
    fn="count_n_queens", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an integer n, return the number of distinct ways to place n queens on an n x n chessboard so that no two queens share a row, column, or diagonal.",
    example="4 -> 2",
    params="n",
    tests=[[1],[2],[3],[4],[5]],
    solution="""
def count_n_queens(n):
    count = 0
    cols = set()
    diag1 = set()
    diag2 = set()
    def backtrack(r):
        nonlocal count
        if r == n:
            count += 1
            return
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue
            cols.add(c); diag1.add(r - c); diag2.add(r + c)
            backtrack(r + 1)
            cols.remove(c); diag1.remove(r - c); diag2.remove(r + c)
    backtrack(0)
    return count
""",
    covers="Prunes columns and both diagonals during placement rather than checking the whole board after each attempt, and can state the search's exponential worst case and why pruning matters so much here.",
)
problem(
    id="word-ladder-length", pattern="graphs", tiers=["senior"], title="Shortest Word Transformation",
    fn="ladder_length", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given a start word, an end word, and a list of allowed words, return the number of words in the shortest transformation sequence from start to end, changing exactly one letter per step, where every intermediate word must be in the allowed list. Return 0 if no such sequence exists.",
    example='begin = "hit", end = "cog", words = ["hot","dot","dog","lot","log","cog"] -> 5',
    params="begin_word, end_word, word_list",
    tests=[
        ["hit","cog",["hot","dot","dog","lot","log","cog"]],
        ["hit","cog",["hot","dot","dog","lot","log"]],
        ["a","c",["a","b","c"]],
        ["hot","dog",["hot","dog"]],
        ["same","same",["same"]],
    ],
    solution="""
def ladder_length(begin_word, end_word, word_list):
    from collections import deque
    words = set(word_list)
    if end_word not in words:
        return 0
    q = deque([(begin_word, 1)])
    visited = {begin_word}
    alphabet = "abcdefghijklmnopqrstuvwxyz"
    while q:
        word, steps = q.popleft()
        if word == end_word:
            return steps
        for i in range(len(word)):
            for ch in alphabet:
                if ch == word[i]:
                    continue
                nxt = word[:i] + ch + word[i + 1:]
                if nxt in words and nxt not in visited:
                    visited.add(nxt)
                    q.append((nxt, steps + 1))
    return 0
""",
    covers="Treats this as shortest-path-in-an-unweighted-graph and reaches for BFS rather than DFS to guarantee the minimum step count, and can discuss the cost of generating each word's 26xlength neighbors.",
)
problem(
    id="find-peak-element", pattern="binary-search", tiers=["mid"], title="Find the Peak Element",
    fn="find_peak", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers with no two adjacent elements equal and exactly one peak (an element strictly greater than both neighbors, treating positions outside the array as negative infinity), return the index of that peak.",
    example="[1,3,5,4,2] -> 2, the index of value 5",
    params="nums",
    tests=[[[1,3,5,4,2]],[[1]],[[1,2]],[[2,1]],[[1,2,3,4,5]]],
    solution="""
def find_peak(nums):
    n = len(nums)
    for i in range(n):
        left_ok = (i == 0) or nums[i - 1] < nums[i]
        right_ok = (i == n - 1) or nums[i] > nums[i + 1]
        if left_ok and right_ok:
            return i
    return -1
""",
    covers="Reaches for binary search using the slope between adjacent elements to discard half the array each step, once pushed to beat the O(n) linear scan.",
)


# ─────────────────────────────────────────────── second leetcode-companywise batch
problem(
    id="longest-palindromic-substring", pattern="two-pointers", tiers=["mid"], title="Longest Palindromic Substring",
    fn="longest_palindrome", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="Given a string, return its longest substring that reads the same forwards and backwards.",
    example='"cbbd" -> "bb"',
    params="s",
    tests=[["cbbd"],["racecar"],["a"],["abcba"]],
    solution="""
def longest_palindrome(s):
    if not s:
        return ""
    best = s[0]
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return s[l + 1:r]
    for i in range(len(s)):
        odd = expand(i, i)
        if len(odd) > len(best):
            best = odd
        even = expand(i, i + 1)
        if len(even) > len(best):
            best = even
    return best
""",
    covers="Expands outward from each of the 2n-1 possible centers (including the gap between two characters, for even-length palindromes) rather than checking every substring, and can state the resulting O(n^2) time / O(1) space bound. A DP table over every (i, j) pair is an accepted but weaker alternative they should be able to name and compare.",
)
problem(
    id="three-sum-closest", pattern="two-pointers", tiers=["mid"], title="3Sum Closest",
    fn="three_sum_closest", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of integers and a target, return the sum of the three numbers whose total is closest to the target.",
    example="[-1,2,1,-4], target 1 -> 2 (from -1 + 2 + 1)",
    params="nums, target",
    tests=[[[-1,2,1,-4],1],[[0,0,0],1],[[1,1,1,0],-100]],
    solution="""
def three_sum_closest(nums, target):
    nums = sorted(nums)
    best = nums[0] + nums[1] + nums[2]
    for i in range(len(nums) - 2):
        l, r = i + 1, len(nums) - 1
        while l < r:
            total = nums[i] + nums[l] + nums[r]
            if abs(total - target) < abs(best - target):
                best = total
            if total == target:
                return total
            elif total < target:
                l += 1
            else:
                r -= 1
    return best
""",
    covers="Sorts first, then fixes one number and sweeps the other two inward with two pointers, moving the pointer on the side that would shrink the gap to the target -- the same skeleton as Three Sum, tracking a running best difference instead of collecting exact-match triplets.",
)
problem(
    id="max-consecutive-ones-flips", pattern="sliding-window", tiers=["mid"], title="Longest Run of Ones With K Flips",
    fn="longest_ones", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a binary array and an integer k, return the length of the longest contiguous run of 1s obtainable by flipping at most k zeros to ones.",
    example="[1,1,1,0,0,0,1,1,1,1,0], k=2 -> 6",
    params="nums, k",
    tests=[[[1,1,1,0,0,0,1,1,1,1,0],2],[[0,0,1,1,1,0,0],0],[[1,1,1,1],0],[[],1]],
    solution="""
def longest_ones(nums, k):
    left = 0
    zeros = 0
    best = 0
    for right in range(len(nums)):
        if nums[right] == 0:
            zeros += 1
        while zeros > k:
            if nums[left] == 0:
                zeros -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
""",
    covers="A window that grows on the right and only shrinks from the left once the zero-count inside it exceeds k, rather than resetting on every zero -- the window never needs to shrink below its previous best length, so a naive reset-based scan is the tell for a candidate who has not internalised the technique.",
)
problem(
    id="single-non-duplicate", pattern="binary-search", tiers=["mid", "senior"], title="Single Element in a Sorted Array",
    fn="single_non_duplicate", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a sorted array where every value appears exactly twice except for one value that appears once, return that single value.",
    example="[1,1,2,3,3,4,4,8,8] -> 2",
    params="nums",
    tests=[[[1,1,2,3,3,4,4,8,8]],[[3,3,7,7,10,11,11]],[[1]],[[1,1,2,2,3]]],
    solution="""
def single_non_duplicate(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if mid % 2 == 1:
            mid -= 1
        if nums[mid] == nums[mid + 1]:
            lo = mid + 2
        else:
            hi = mid
    return nums[lo]
""",
    covers="Uses binary search on the parity of the index: before the single element every pair starts at an even index, after it every pair starts at an odd index, so checking whether mid's partner sits to its left or right tells you which half to discard. Accepts a plain linear XOR scan as correct but not the O(log n) answer being asked for.",
)
problem(
    id="search-2d-matrix-ii", pattern="binary-search", tiers=["mid", "senior"], title="Search a 2D Matrix II",
    fn="search_matrix_ii", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a grid of integers where every row is sorted left to right and every column is sorted top to bottom (but, unlike a fully sorted grid, the rows are not sorted relative to each other), return true if a target value exists anywhere in the grid.",
    example="matrix = [[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]], target = 5 -> true",
    params="matrix, target",
    tests=[
        [[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]],5],
        [[[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]],20],
        [[[1]],1],
        [[[]],1],
    ],
    solution="""
def search_matrix_ii(matrix, target):
    if not matrix or not matrix[0]:
        return False
    row, col = 0, len(matrix[0]) - 1
    while row < len(matrix) and col >= 0:
        v = matrix[row][col]
        if v == target:
            return True
        if v > target:
            col -= 1
        else:
            row += 1
    return False
""",
    covers="Starts at the top-right corner and eliminates a full row or column on every comparison: moves left when the current value is too big, down when it is too small. Explain why this only works from a corner where one direction increases and the other decreases -- starting at the top-left or searching each row independently loses the O(m+n) bound this problem is actually testing.",
)
problem(
    id="next-greater-element", pattern="stack", tiers=["junior", "mid"], title="Next Greater Element",
    fn="next_greater_element", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="You are given two arrays of distinct integers: a query list and a reference list that contains every value in the query list somewhere within it. For each value in the query list, find the first value to its right in the reference list that is strictly greater, or -1 if there is none. Return the results in query order.",
    example="query=[4,1,2], reference=[1,3,4,2] -> [-1,3,-1]",
    params="query, reference",
    tests=[[[4,1,2],[1,3,4,2]],[[2,4],[1,2,3,4]],[[1],[1]]],
    solution="""
def next_greater_element(query, reference):
    next_greater = {}
    stack = []
    for v in reference:
        while stack and stack[-1] < v:
            next_greater[stack.pop()] = v
        stack.append(v)
    return [next_greater.get(q, -1) for q in query]
""",
    covers="Makes one pass over the reference list with a decreasing stack, popping every value smaller than the current one and recording the current value as their answer -- computing this once for the whole reference list rather than re-scanning from each query value's position, which is the naive O(n*m) approach.",
)
problem(
    id="distance-to-nearest-zero", pattern="matrix", tiers=["mid", "senior"], title="Distance to the Nearest Zero",
    fn="nearest_zero_distances", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a grid of 0s and 1s, return a grid of the same shape where each cell holds the shortest number of up/down/left/right steps to the nearest 0 (a 0 cell holds 0).",
    example="[[0,0,0],[0,1,0],[1,1,1]] -> [[0,0,0],[0,1,0],[1,2,1]]",
    params="grid",
    tests=[[[[0,0,0],[0,1,0],[1,1,1]]],[[[0]]],[[[1,0]]]],
    solution="""
def nearest_zero_distances(grid):
    from collections import deque
    if not grid or not grid[0]:
        return grid
    rows, cols = len(grid), len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    q = deque()
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                dist[r][c] = 0
                q.append((r, c))
    while q:
        r, c = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))
    return dist
""",
    covers="Starts a single multi-source BFS from every 0 cell at once, rather than running a separate BFS/DFS outward from each 1 cell -- that per-cell approach is correct but revisits the same ground repeatedly and is the naive answer this problem is designed to push past. Can state the O(rows*cols) bound multi-source BFS achieves.",
)
problem(
    id="course-order", pattern="graphs", tiers=["senior"], title="Find a Valid Course Order",
    fn="find_order", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given a number of courses labelled from zero and a list of [course, prerequisite] pairs, return an order in which every course can be taken with its prerequisites already completed, or an empty array if no valid order exists.",
    example="3 courses, [[1,0],[2,1]] -> [0,1,2]",
    params="n, prereqs",
    tests=[[4,[[1,0],[2,1],[3,2]]],[1,[]],[2,[[1,0]]],[2,[[1,0],[0,1]]],[3,[[1,0],[2,1]]]],
    solution="""
def find_order(n, prereqs):
    from collections import deque
    indegree = [0] * n
    adj = [[] for _ in range(n)]
    for course, pre in prereqs:
        adj[pre].append(course)
        indegree[course] += 1
    q = deque(i for i in range(n) if indegree[i] == 0)
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nxt in adj[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    return order if len(order) == n else []
""",
    covers="Builds on cycle detection (Course Prerequisites) by actually recording a topological order -- Kahn's algorithm (repeatedly removing zero-indegree nodes) or a DFS post-order reversal. An empty result must mean a genuine cycle was detected, not just an empty input; test cases here are deliberately chains with only one valid order, so any correct topological sort produces the exact expected array rather than one of several equally valid orderings.",
)
problem(
    id="odd-even-linked-list", pattern="linked-list", tiers=["mid"], title="Group Odd and Even Positioned Nodes",
    fn="odd_even_list", companies=["Amazon", "Google", "Meta", "Microsoft", "Apple"],
    statement="A singly linked list is given to you as an array of its values in order. Regroup it so every node originally at an odd 1-indexed position comes first (in their original relative order), followed by every node originally at an even position (also in their original relative order). Return the result as an array.",
    example="[1,2,3,4,5] -> [1,3,5,2,4]",
    params="values",
    tests=[[[1,2,3,4,5]],[[2,1,3,5,6,4,7]],[[]],[[1]],[[1,2]]],
    solution="""
def odd_even_list(values):
    odd = values[0::2]
    even = values[1::2]
    return odd + even
""",
    covers="Rewires the list in place with two running pointers (one walking the odd chain, one the even chain) in a single O(n) pass with O(1) extra space, then splices the even chain onto the tail of the odd chain -- rather than allocating a new list or making two full passes.",
)
problem(
    id="partition-equal-subset-sum", pattern="dynamic-programming", tiers=["mid", "senior"], title="Partition Into Two Equal-Sum Groups",
    fn="can_partition", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given an array of positive integers, return true if it can be split into two groups with equal sums.",
    example="[1,5,11,5] -> true (11 alone, and 1+5+5)",
    params="nums",
    tests=[[[1,5,11,5]],[[1,2,3,5]],[[4,4]],[[1,2,5]]],
    solution="""
def can_partition(nums):
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    achievable = {0}
    for n in nums:
        achievable |= {s + n for s in achievable if s + n <= target}
        if target in achievable:
            return True
    return target in achievable
""",
    covers="Recognizes this as subset-sum in disguise: an odd total sum makes it immediately impossible, otherwise the question is whether some subset sums to exactly half the total. Builds a 1D boolean DP over achievable sums (0/1 knapsack shape) rather than trying every subset directly, and iterates the sum dimension DOWNWARD when updating in place so each number is only used once.",
)
problem(
    id="longest-common-subsequence", pattern="dynamic-programming", tiers=["mid"], title="Longest Common Subsequence",
    fn="lcs_length", companies=["Amazon", "Google", "Meta", "Microsoft"],
    statement="Given two strings, return the length of their longest common subsequence -- a sequence of characters that appears in both strings in the same relative order, but not necessarily contiguously.",
    example='"abcde", "ace" -> 3 ("ace")',
    params="a, b",
    tests=[["abcde","ace"],["abc","abc"],["abc","def"],["","abc"]],
    solution="""
def lcs_length(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
""",
    covers="Builds a 2D DP table where cell (i, j) is the LCS length of the first i characters of a and the first j of b: a match extends the diagonal by one, a mismatch takes the better of dropping one character from either string. Distinguishes this clearly from Edit Distance, which counts operations rather than a shared subsequence, when asked how the two relate.",
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
    "dynamic-programming", "intervals", "greedy", "matrix",
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
            # REAL newlines. Using "\\n" here emits a literal backslash-n into
            # the TypeScript, which Monaco then shows as \\n on one line.
            py_sig = "def %s(%s):\n    # your code here\n    pass\n" % (p["fn"], p["params"])
            js_params = ", ".join(x.strip() for x in p["params"].split(","))
            js_sig = "function %s(%s) {\n  // your code here\n}\n" % (p["fn"], js_params)
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

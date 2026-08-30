import { fetchNewPosts, type RedditPost } from "./client";

/**
 * Subreddits where LoopReady's audience (candidates prepping for FAANG-style
 * technical interviews) already congregates. Matches the community list in
 * ~/.claude/skills/loopready-marketing/references/playbook.md Section 5.
 */
export const TARGET_SUBREDDITS = [
  "cscareerquestions",
  "leetcode",
  "ExperiencedDevs",
  "csMajors",
  "ITCareerQuestions",
  "interviews",
];

/** Signals the post is actually ABOUT a technical interview, not just careers in general. */
const TOPIC_KEYWORDS = [
  "interview",
  "onsite",
  "phone screen",
  "behavioral round",
  "system design",
  "leetcode",
  "technical interview",
  "coding interview",
  "mock interview",
  "final round",
  "offer",
  "rejected",
  "rejection",
];

/** Signals the poster is asking for help, not just narrating/venting with no ask. */
const HELP_SIGNAL_KEYWORDS = [
  "how do i",
  "how to",
  "any tips",
  "any advice",
  "need advice",
  "help",
  "struggling",
  "nervous",
  "anxious",
  "scared",
  "failed",
  "bombed",
  "what should i",
  "should i",
  "advice?",
  "?",
];

/** Obvious noise this scanner should never surface -- not what LoopReady solves. */
const EXCLUDE_KEYWORDS = [
  "resume review",
  "rate my resume",
  "salary negotiation",
  "visa",
  "h1b",
  "layoff",
  "layoffs",
];

export interface ScoredPost extends RedditPost {
  score_reason: number;
}

function textOf(post: RedditPost): string {
  return `${post.title} ${post.selftext ?? ""}`.toLowerCase();
}

function scorePost(post: RedditPost): number {
  const text = textOf(post);
  if (EXCLUDE_KEYWORDS.some((k) => text.includes(k))) return 0;

  const topicHits = TOPIC_KEYWORDS.filter((k) => text.includes(k)).length;
  if (topicHits === 0) return 0;

  const helpHits = HELP_SIGNAL_KEYWORDS.filter((k) => text.includes(k)).length;

  // Topic relevance matters most; a genuine ask on top of it is the real signal.
  return topicHits * 2 + helpHits;
}

/**
 * Scans all target subreddits for posts from the last `hoursBack` hours that
 * look like a real, answerable ask in LoopReady's space. Returns the top
 * `limit` by relevance score, deduped, newest-scored-first.
 */
export async function scanForOpportunities(
  hoursBack = 24,
  limit = 15
): Promise<ScoredPost[]> {
  const cutoff = Date.now() / 1000 - hoursBack * 3600;
  const results: ScoredPost[] = [];

  for (const subreddit of TARGET_SUBREDDITS) {
    let posts: RedditPost[];
    try {
      posts = await fetchNewPosts(subreddit, 25);
    } catch (e) {
      console.error(`[reddit-scan] r/${subreddit} failed:`, e);
      continue; // One subreddit failing must not sink the whole scan.
    }

    for (const post of posts) {
      if (post.created_utc < cutoff) continue;
      const score_reason = scorePost(post);
      if (score_reason > 0) results.push({ ...post, score_reason });
    }
  }

  return results
    .sort((a, b) => b.score_reason - a.score_reason)
    .slice(0, limit);
}

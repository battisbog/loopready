/**
 * Minimal Reddit REST client for the growth-outreach scanner.
 *
 * Reddit closed self-service app registration in 2026 and now requires an
 * approved OAuth client (see the "Responsible Builder Policy" request flow)
 * -- confirmed live: reddit.com/r/&lt;subreddit&gt;/new.json returns a hard 403 for
 * unauthenticated requests now, so there is no anonymous fallback. This
 * client is written and ready; it simply has nothing to authenticate with
 * until REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are approved and set.
 *
 * Auth: OAuth2 client_credentials grant (the "installed client" flow for a
 * script-type app) -- read-only, no user login needed, matches a personal
 * script app's scope.
 */

const USER_AGENT = "web:loopready-reddit-scanner:v1.0 (by /u/loopready)";

export function redditConfigured(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

interface TokenCache {
  token: string;
  expiresAt: number;
}
let cached: TokenCache | null = null;

async function redditAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Reddit credentials are not configured");

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Reddit auth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, (data.expires_in - 60) * 1000),
  };
  return cached.token;
}

export interface RedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  permalink: string;
  author: string;
  created_utc: number;
  num_comments: number;
  score: number;
}

/**
 * Newest posts in a subreddit, via OAuth's oauth.reddit.com host (the
 * regular www.reddit.com host 403s on this kind of programmatic access
 * regardless of auth -- oauth.reddit.com is the documented API host for
 * authenticated requests).
 */
export async function fetchNewPosts(subreddit: string, limit = 25): Promise<RedditPost[]> {
  const token = await redditAccessToken();
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } }
  );
  if (!res.ok) {
    throw new Error(`Reddit fetch failed for r/${subreddit} (${res.status})`);
  }
  const data = await res.json();
  return (data.data?.children ?? []).map((c: { data: RedditPost }) => c.data);
}

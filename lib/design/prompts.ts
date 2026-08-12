import type { Tier } from "@/lib/interview/companies";

export interface DesignPrompt {
  id: string;
  title: string;
  statement: string;
  tiers: Tier[];
  // Written from real loop experience — drives probing and the feedback rubric.
  strongAnswerCovers: string;
  // The specific hand-waves interviewers pounce on for this problem.
  pressurePoints: string[];
}

export const DESIGN_PROMPTS: DesignPrompt[] = [
  {
    id: "url-shortener",
    title: "Design a URL shortener",
    statement:
      "Design a service like bit.ly: users submit a long URL and get a short one back; visiting the short URL redirects them.",
    tiers: ["junior", "mid"],
    strongAnswerCovers:
      "Clarifies read/write ratio (heavily read-skewed) before designing. Estimates QPS and storage from a stated user count. Picks a key generation strategy (counter+base62, hash with collision handling, or pre-generated keys) and defends it. Uses a cache for hot links and explains the redirect path end to end (301 vs 302 and why it matters for analytics).",
    pressurePoints: [
      "If they hash the URL, ask what happens on collision and how they detect it.",
      "If they use an auto-increment counter, ask how it works across multiple app servers.",
      "Ask what the read:write ratio is and whether their storage choice reflects it.",
      "Ask what happens to the cache when a link is deleted or expires.",
    ],
  },
  {
    id: "rate-limiter",
    title: "Design a distributed rate limiter",
    statement:
      "Design a rate limiter that caps each API client to N requests per minute across a fleet of servers.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Names a specific algorithm (token bucket, sliding window log, sliding window counter) and states its memory and accuracy trade-off. Addresses the distributed problem directly: shared store vs local counters with sync, and the race condition on read-modify-write. Discusses what happens when the limiter store is down (fail open vs fail closed) — that answer alone separates senior from mid.",
    pressurePoints: [
      "Ask what happens if the shared counter store goes down — fail open or fail closed, and why?",
      "Ask about the race between reading and incrementing the counter across servers.",
      "Ask how much memory their approach costs per client at 10M clients.",
      "If they say 'fixed window', ask about the burst at the window boundary.",
    ],
  },
  {
    id: "news-feed",
    title: "Design a news feed",
    statement:
      "Design the news feed for a social network: users follow others and see a ranked feed of their posts.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Frames the core decision as fan-out-on-write vs fan-out-on-read and picks per-case rather than globally — the hybrid where celebrities are pulled at read time and normal users pushed at write time. Estimates feed storage. Separates the ranking concern from the delivery concern.",
    pressurePoints: [
      "Ask what happens when a user with 50 million followers posts.",
      "Ask how a newly followed user's posts appear in an already-materialized feed.",
      "Ask where ranking happens and whether it is on the read or write path.",
      "Ask how they'd page the feed without duplicates as new posts arrive.",
    ],
  },
  {
    id: "chat-app",
    title: "Design a real-time chat system",
    statement:
      "Design a messaging system supporting one-to-one and group chats with delivery and read receipts.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Chooses a connection strategy (WebSocket with a connection registry) and explains how a message reaches a user connected to a different server. Handles offline delivery and ordering. Discusses the message store's access pattern (recent-first per conversation) and picks storage accordingly.",
    pressurePoints: [
      "Ask how server A delivers a message to a user holding a socket on server B.",
      "Ask what guarantees message ordering within a conversation.",
      "Ask what happens to messages sent while the recipient is offline.",
      "Ask how group fan-out differs from one-to-one at 500 members.",
    ],
  },
  {
    id: "video-streaming",
    title: "Design a video streaming service",
    statement:
      "Design the upload, storage, and playback path for a service like YouTube.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Separates the upload/transcode pipeline from the playback path. Covers chunked upload, async transcoding into multiple bitrates via a queue, CDN distribution, and adaptive bitrate playback. Estimates storage and egress — egress cost is the real constraint and few candidates raise it.",
    pressurePoints: [
      "Ask what happens between upload finishing and the video being watchable.",
      "Ask how they'd handle a transcode job failing halfway.",
      "Ask what fraction of traffic the CDN absorbs and what it costs.",
      "Ask how playback adapts when the viewer's bandwidth drops mid-video.",
    ],
  },
  {
    id: "ride-sharing",
    title: "Design a ride-hailing service",
    statement:
      "Design the matching system for a service like Uber: riders request rides, nearby drivers are matched.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Handles the geospatial index explicitly (geohash, quadtree, or S2) rather than hand-waving 'find nearby drivers'. Deals with high-frequency driver location updates as a distinct write-heavy problem. Addresses matching consistency — the same driver must not be assigned to two riders.",
    pressurePoints: [
      "Ask exactly how they find drivers within 2 km — what is the index?",
      "Ask how they handle drivers pushing location updates every 4 seconds at scale.",
      "Ask what prevents two riders being matched to the same driver.",
      "Ask what happens when a matched driver cancels.",
    ],
  },
  {
    id: "notification-system",
    title: "Design a notification system",
    statement:
      "Design a system that sends push, email, and SMS notifications across a large user base.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Puts a queue between producers and channel senders, and treats third-party providers as unreliable — retries with backoff, dead-letter handling, idempotency so a retry does not double-send. Covers user preferences and rate limiting per user.",
    pressurePoints: [
      "Ask what stops a user getting the same notification twice after a retry.",
      "Ask what happens when the SMS provider is down for an hour.",
      "Ask how they'd handle a burst of 10 million notifications at once.",
    ],
  },
  {
    id: "web-crawler",
    title: "Design a web crawler",
    statement:
      "Design a crawler that fetches and indexes a large portion of the web.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Treats politeness and the frontier as first-class: per-domain rate limiting, robots.txt, URL dedup at scale (bloom filter), and prioritization. Discusses trap avoidance and recrawl scheduling based on change frequency.",
    pressurePoints: [
      "Ask how they avoid hammering a single domain when it has millions of URLs.",
      "Ask how they dedupe URLs when the seen-set does not fit in memory.",
      "Ask what happens with an infinite calendar page generating URLs forever.",
    ],
  },
];

export function pickDesignPrompt(tier: Tier): DesignPrompt {
  const eligible = DESIGN_PROMPTS.filter((p) => p.tiers.includes(tier));
  const pool = eligible.length ? eligible : DESIGN_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDesignPrompt(id: string): DesignPrompt | undefined {
  return DESIGN_PROMPTS.find((p) => p.id === id);
}

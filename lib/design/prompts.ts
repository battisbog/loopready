import type { Tier } from "@/lib/interview/companies";

/**
 * The system design prompt bank.
 *
 * To add a prompt: copy an entry, change the fields, done. `strongAnswerCovers`
 * is the private rubric shown to the interviewer and reused by the feedback
 * report, and `pressurePoints` are challenges to raise only once the candidate
 * has committed to something. Neither is ever read out; see
 * lib/interview/stance.ts.
 *
 * Prompts are the openly discussed classics, written in our own words and with
 * rubrics assembled from public system design material.
 */

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
  {
    id: "typeahead-search",
    title: "Design search autocomplete",
    statement:
      "Design the suggestion service behind a search box: as a user types, return the most likely completions with very low latency.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Separates the serving path from the offline aggregation path. Serves from a prefix structure (trie with top-k cached at each node) rather than querying a database per keystroke. States a latency budget and works backwards from it. Debounces on the client and discusses cache placement, including at the edge. Explains how the ranking data is rebuilt periodically from query logs rather than updated per query.",
    pressurePoints: [
      "Ask what the p99 latency budget is; if they cannot name one, the design has no target.",
      "If they query a database per keystroke, ask what that does to QPS at their stated user count.",
      "Ask how the top-k list at each prefix stays fresh, and how stale it is allowed to be.",
      "Ask what happens for a prefix with millions of matches versus a rare one.",
    ],
  },
  {
    id: "distributed-cache",
    title: "Design a distributed cache",
    statement:
      "Design a caching layer that many application servers share, holding far more data than any single machine can.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Uses consistent hashing and can explain why plain modulo re-shuffles almost everything when a node joins. Covers eviction (LRU and why), replication for availability, and what happens on a node failure. Distinguishes cache-aside from write-through and names the staleness each produces. Addresses hot keys and the thundering herd on a cold miss.",
    pressurePoints: [
      "If they hash mod N, ask what fraction of keys move when one node is added.",
      "Ask what happens when one key is far hotter than the rest.",
      "Ask how a write invalidates the cache and what a reader sees in between.",
      "Ask what happens when a popular key expires and a thousand requests miss at once.",
    ],
  },
  {
    id: "payment-system",
    title: "Design a payment processing system",
    statement:
      "Design the service that takes a checkout request, charges an external payment provider, and records the result.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Leads with idempotency: a client-supplied key so a retried request cannot double-charge. Treats the external provider as unreliable and designs for timeouts where the outcome is unknown, using reconciliation rather than guessing. Uses a ledger of immutable entries instead of mutating a balance. Discusses exactly-once as an illusion built from at-least-once delivery plus idempotent handlers.",
    pressurePoints: [
      "Ask what happens when the provider call times out and they do not know if it succeeded.",
      "If they mutate a balance column, ask how they audit a disputed charge six months later.",
      "Ask how a duplicate submit from a double-clicked button is prevented.",
      "Ask where the money can be lost in their design, and how they would find out.",
    ],
  },
  {
    id: "leaderboard",
    title: "Design a real-time leaderboard",
    statement:
      "Design the ranking service for a game with millions of players, showing a global top list and each player's own rank.",
    tiers: ["mid", "senior"],
    strongAnswerCovers:
      "Recognises that top-k is easy and arbitrary rank lookup is the hard part. Uses a sorted structure (such as a sorted set) rather than sorting on read. Discusses sharding by score range or approximating rank for players outside the top. Separates the write path (score updates, very frequent) from the read path (rank queries) and considers periodic snapshots.",
    pressurePoints: [
      "Ask how they return the rank of the 4,000,000th player, not just the top 100.",
      "Ask what a full sort costs at their stated update rate.",
      "Ask whether rank needs to be exact, and what changes if it does not.",
      "Ask how ties are broken and whether that is stable across reads.",
    ],
  },
  {
    id: "file-storage",
    title: "Design a file storage and sync service",
    statement:
      "Design a service like a cloud drive: users upload files from several devices and every device converges on the same contents.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Chunks files and deduplicates by content hash, so an unchanged file costs nothing to re-sync. Separates metadata (small, transactional, queryable) from blob storage (large, immutable). Handles conflicting edits from two offline devices with an explicit policy rather than hand-waving. Covers resumable uploads and how a client learns what changed without polling everything.",
    pressurePoints: [
      "Ask what happens when two devices edit the same file while both are offline.",
      "Ask how a 4GB upload resumes after the connection drops at 90%.",
      "If they store files whole, ask what a one-byte change costs to sync.",
      "Ask how a client discovers changes: polling, long poll, or push, and the cost of each.",
    ],
  },
  {
    id: "ad-click-aggregator",
    title: "Design an ad click aggregator",
    statement:
      "Design a system that ingests a very high volume of click events and reports counts per campaign, both in near real time and accurately after the fact.",
    tiers: ["senior"],
    strongAnswerCovers:
      "Splits fast approximate serving from slow exact batch recomputation, and can name why both exist. Buffers through a log rather than writing per click to a database. Handles late and duplicate events explicitly, using event time rather than arrival time. Discusses pre-aggregation windows and the trade-off between query flexibility and storage.",
    pressurePoints: [
      "Ask what happens to a click that arrives two hours late because a phone was offline.",
      "Ask how a duplicate event from a client retry is prevented from inflating the count.",
      "If they write per click to a database, ask what that costs at their stated QPS.",
      "Ask whether the number shown to an advertiser is the same one used for billing.",
    ],
  },
  {
    id: "pastebin",
    title: "Design a text sharing service",
    statement:
      "Design a service where a user pastes text, gets a link, and anyone with the link can read it. Pastes may expire.",
    tiers: ["junior", "mid"],
    strongAnswerCovers:
      "Establishes size limits and expiry before designing. Separates metadata from the paste body and explains why the body does not belong in a relational row. Generates a key and handles collisions. Discusses expiry as either a background sweep or lazy deletion on read, and knows the trade-off. Adds a cache only after arguing the read skew justifies it.",
    pressurePoints: [
      "Ask what happens when someone pastes a 50MB file.",
      "Ask how an expired paste actually gets deleted, and what a reader sees at the moment it expires.",
      "If they store the body in the same table as metadata, ask what that does to a listing query.",
      "Ask how they stop someone guessing another user's link.",
    ],
  },
  {
    id: "key-value-store",
    title: "Design a simple key-value store",
    statement:
      "Design a service that stores values by key over a network, for clients that need get and put with predictable latency.",
    tiers: ["junior", "mid"],
    strongAnswerCovers:
      "Starts single-node and only distributes once a reason exists. Explains what happens on restart: durability via a write-ahead log or snapshot. Introduces partitioning with a stated scheme and replication with a stated consistency choice, rather than saying 'add more servers'. Can describe what a client sees during a failover.",
    pressurePoints: [
      "Ask what happens to in-flight writes when the process restarts.",
      "Ask how a client finds which node holds a given key.",
      "If they replicate, ask whether a read right after a write is guaranteed to see it.",
      "Ask what breaks first as the data outgrows one machine.",
    ],
  },
];

export function designPromptCount(): number {
  return DESIGN_PROMPTS.length;
}

export function pickDesignPrompt(tier: Tier): DesignPrompt {
  const eligible = DESIGN_PROMPTS.filter((p) => p.tiers.includes(tier));
  const pool = eligible.length ? eligible : DESIGN_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDesignPrompt(id: string): DesignPrompt | undefined {
  return DESIGN_PROMPTS.find((p) => p.id === id);
}

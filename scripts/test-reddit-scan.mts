/**
 * Manual run of the Reddit opportunity scan, without waiting for the daily
 * cron. Prints what it found; pass --send to also email the digest.
 *
 *   npx tsx scripts/test-reddit-scan.mts             # dry run, prints results
 *   npx tsx scripts/test-reddit-scan.mts --send       # also sends the digest email
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const { scanForOpportunities } = await import("../lib/reddit/scan.ts");
const { sendRedditDigest } = await import("../lib/email/reddit-digest.ts");

const SEND = process.argv.includes("--send");

const posts = await scanForOpportunities();
console.log(`Found ${posts.length} opportunit${posts.length === 1 ? "y" : "ies"}:\n`);
for (const p of posts) {
  console.log(`[score ${p.score_reason}] r/${p.subreddit} — ${p.title}`);
  console.log(`  https://reddit.com${p.permalink}\n`);
}

if (SEND) {
  const to = process.env.REDDIT_DIGEST_EMAIL;
  if (!to) {
    console.log("REDDIT_DIGEST_EMAIL not set in .env.local, cannot send.");
  } else {
    await sendRedditDigest(to, posts);
  }
}

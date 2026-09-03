/**
 * Uploads a finished video to TikTok as a DRAFT via the Content Posting
 * API's inbox/upload flow -- it lands in the account's TikTok inbox for
 * manual review and posting, never auto-published. That's deliberate: per
 * references/playbook.md, this agent proposes and produces, Aryan decides
 * and posts. Sandbox mode + the video.upload scope only requires the
 * account be added as a Sandbox target user, no app review needed.
 *
 * Usage:
 *   npx tsx scripts/post-to-tiktok.mts <video.mp4> --title "Caption text" --tags "#interviewtips,#softwareengineer,#loopready"
 */
import { readFileSync, statSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.log("TIKTOK_ACCESS_TOKEN missing from .env.local -- complete the OAuth flow first (see scripts/post-to-tiktok.mts header / app/api/tiktok/callback).");
  process.exit(1);
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function tiktok(path: string, body: unknown) {
  const res = await fetch(`https://open.tiktokapis.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(`TikTok ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const videoPath = process.argv[2];
  const title = flag("title");
  const tags = flag("tags");
  if (!videoPath || !title) {
    console.log('Usage: npx tsx scripts/post-to-tiktok.mts <video.mp4> --title "Caption" --tags "#tag1,#tag2"');
    process.exit(1);
  }

  const videoBytes = readFileSync(videoPath);
  const videoSize = statSync(videoPath).size;
  const caption = tags ? `${title} ${tags}` : title;

  console.log(`Uploading ${videoPath} (${(videoSize / 1024 / 1024).toFixed(1)} MB) as a draft...`);

  // 1. Init the upload -- single chunk, since these clips are short (well under TikTok's limits).
  const init = await tiktok("/v2/post/publish/inbox/video/init/", {
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
    post_info: {
      title: caption,
    },
  });

  const { publish_id, upload_url } = init.data;
  console.log(`Got upload URL, publish_id=${publish_id}. Sending video bytes...`);

  // 2. PUT the actual video to the returned upload URL.
  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
      "Content-Type": "video/mp4",
    },
    body: videoBytes,
  });
  if (!putRes.ok) {
    throw new Error(`Video upload PUT failed: ${putRes.status} ${await putRes.text()}`);
  }

  // 3. Poll status until TikTok has processed it.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await tiktok("/v2/post/publish/status/fetch/", { publish_id });
    console.log(`  [${i + 1}] status=${status.data.status}`);
    if (status.data.status === "PROCESSING_DOWNLOAD" || status.data.status === "SEND_TO_USER_INBOX") {
      console.log(`\nDone. A draft notification has been sent to the connected TikTok account's inbox.`);
      console.log(`Open the TikTok app, tap the notification, and complete posting from there -- nothing is published automatically.`);
      return;
    }
    if (status.data.status === "FAILED") {
      throw new Error(`TikTok processing failed: ${JSON.stringify(status.data)}`);
    }
  }
  console.log("Timed out waiting for TikTok to confirm -- check the app manually, it may still be processing.");
}

await main();

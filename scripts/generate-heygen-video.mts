/**
 * Renders a script into a vertical (1080x1920) talking-head video via HeyGen,
 * then emails the finished video for review. Built to be called by an agent
 * (the loopready-marketing subagent, or Claude Code directly) that has
 * already decided WHAT to say -- this script only handles HOW to render it.
 *
 * The avatar is LoopReady's own openly-branded presenter delivering
 * playbook scripts. It must never become a simulated "real user"
 * testimonial -- fabricated endorsements are FTC-regulated deceptive
 * advertising and a platform-ban risk. See references/playbook.md.
 *
 *   npx tsx scripts/generate-heygen-video.mts "Your script text here"
 *   npx tsx scripts/generate-heygen-video.mts "..." --avatar Abigail_expressive_2024112501 --voice 330290724a1b470fb63153f34d4c0183
 *   npx tsx scripts/generate-heygen-video.mts "..." --list-avatars   # print available avatars/voices, don't generate
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const KEY = process.env.HEYGEN_API_KEY;
if (!KEY) throw new Error("HEYGEN_API_KEY missing from .env.local");

const DEFAULT_AVATAR = "Abigail_standing_office_front";
const DEFAULT_VOICE = "330290724a1b470fb63153f34d4c0183"; // Annie - Lifelike (English)

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function heygen(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.heygen.com${path}`, {
    ...init,
    headers: { "X-Api-Key": KEY!, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HeyGen ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function listAvatarsAndVoices() {
  const [avatars, voices] = await Promise.all([
    heygen("/v2/avatars"),
    heygen("/v2/voices"),
  ]);
  console.log(`${avatars.data.avatars.length} avatars. First 15:`);
  for (const a of avatars.data.avatars.slice(0, 15)) console.log(`  ${a.avatar_id} -- ${a.avatar_name}`);
  console.log(`\n${voices.data.voices.length} voices. First 15 English:`);
  for (const v of voices.data.voices.filter((v: { language: string }) => v.language === "English").slice(0, 15)) {
    console.log(`  ${v.voice_id} -- ${v.name}`);
  }
}

async function generate(script: string, avatarId: string, voiceId: string) {
  console.log(`Generating with avatar=${avatarId} voice=${voiceId}...`);
  const created = await heygen("/v2/video/generate", {
    method: "POST",
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: { type: "text", input_text: script, voice_id: voiceId },
          background: { type: "color", value: "#09090b" },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
  });
  const videoId = created.data.video_id;
  console.log(`video_id=${videoId}. Polling for render...`);

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    const status = await heygen(`/v1/video_status.get?video_id=${videoId}`);
    console.log(`  [${i + 1}] status=${status.data.status}`);
    if (status.data.status === "completed") return status.data.video_url as string;
    if (status.data.status === "failed") throw new Error(`Render failed: ${status.data.error?.message}`);
  }
  throw new Error("Timed out waiting for render (10 min)");
}

async function emailForReview(script: string, videoUrl: string) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.REDDIT_DIGEST_EMAIL || "ishkiwashka@gmail.com"; // reuse the founder's known-good address
  const { error } = await resend.emails.send({
    from: "LoopReady <hello@loopready.io>",
    to,
    subject: "New LoopReady video ready for review",
    text: `A new UGC video finished rendering.\n\nScript:\n${script}\n\nVideo URL (download it, this link expires):\n${videoUrl}\n\nReview it, then post manually to TikTok / Reels / Shorts.`,
  });
  if (error) console.error("[email] failed:", error.message);
  else console.log(`Emailed review link to ${to}`);
}

async function main() {
  const script = process.argv[2];
  if (flag("list-avatars") !== undefined || process.argv.includes("--list-avatars")) {
    await listAvatarsAndVoices();
    return;
  }
  if (!script) {
    console.log('Usage: npx tsx scripts/generate-heygen-video.mts "script text" [--avatar ID] [--voice ID]');
    console.log("       npx tsx scripts/generate-heygen-video.mts --list-avatars");
    process.exit(1);
  }
  const avatarId = flag("avatar") ?? DEFAULT_AVATAR;
  const voiceId = flag("voice") ?? DEFAULT_VOICE;

  const videoUrl = await generate(script, avatarId, voiceId);
  console.log(`\nDone: ${videoUrl}`);
  await emailForReview(script, videoUrl);
}

await main();

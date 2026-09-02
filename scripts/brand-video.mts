/**
 * Post-processes a raw HeyGen avatar clip into an actual branded short-form
 * video: timed on-screen text cards (matching the playbook's script format --
 * see references/playbook.md's hook scripts, which are written as timed
 * beats like "0:00 ... / 0:01.5 ... / 0:03 ...") plus a 3-second end card
 * ("LoopReady / loopready.io / the mock interview that tells you the truth",
 * per ~/.claude/skills/loopready-marketing SKILL's "Do This First" spec).
 *
 * This is what fixes the exact gap Aryan flagged: a raw avatar clip alone
 * has zero visual context -- nothing on screen says LoopReady or tech
 * interviews. Text cards + end card fix that without needing product
 * screen-recording footage (which the avatar-only pipeline can't produce).
 *
 * Usage:
 *   npx tsx scripts/brand-video.mts <input.mp4> <output.mp4> --cards cards.json
 *
 * cards.json shape: [{ "start": 0, "end": 1.5, "text": "You're not failing the coding round." }, ...]
 * Times in seconds, matching the video's actual timeline.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";

const run = promisify(execFile);

interface Card {
  start: number;
  end: number;
  text: string;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Escapes text for ffmpeg's drawtext filter -- colons and quotes break the filter graph otherwise. */
function escapeDrawtext(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019");
}

function buildDrawtextFilters(cards: Card[]): string {
  // White text, black box behind it for legibility over any background --
  // stacked so multiple simultaneous cards (shouldn't normally overlap, but
  // don't silently corrupt the filter graph if a caller's timing does).
  return cards
    .map((c, i) => {
      const text = escapeDrawtext(c.text);
      return (
        `drawtext=text='${text}':fontsize=64:fontcolor=white:` +
        `box=1:boxcolor=black@0.65:boxborderw=24:` +
        `x=(w-text_w)/2:y=(h*0.72):` +
        `enable='between(t,${c.start},${c.end})'`
      );
    })
    .join(",");
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  const cardsPath = flag("cards");
  if (!input || !output || !cardsPath) {
    console.log("Usage: npx tsx scripts/brand-video.mts <input.mp4> <output.mp4> --cards cards.json");
    process.exit(1);
  }

  const cards: Card[] = JSON.parse(readFileSync(cardsPath, "utf8"));
  const drawtext = buildDrawtextFilters(cards);

  const withCardsPath = "/tmp/_branded-with-cards.mp4";
  console.log("Overlaying text cards...");
  await run("ffmpeg", [
    "-y", "-i", input,
    "-vf", drawtext,
    "-c:a", "copy",
    withCardsPath,
  ]);

  const endCardPath = "/tmp/_end-card.mp4";
  console.log("Building end card...");
  const endCardText = [
    "drawtext=text='LoopReady':fontsize=80:fontcolor=0x10b981:x=(w-text_w)/2:y=(h/2)-100",
    "drawtext=text='loopready.io':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=(h/2)",
    "drawtext=text='the mock interview that tells you the truth':fontsize=32:fontcolor=0xa1a1aa:x=(w-text_w)/2:y=(h/2)+70",
  ].join(",");
  await run("ffmpeg", [
    "-y",
    "-f", "lavfi", "-i", "color=c=0x09090b:s=1080x1920:d=3",
    "-vf", endCardText,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    endCardPath,
  ]);

  console.log("Concatenating...");
  const listPath = "/tmp/_concat-list.txt";
  writeFileSync(listPath, `file '${withCardsPath}'\nfile '${endCardPath}'\n`);
  // End card has no audio track; the main clip's audio needs a silent pad of
  // matching length appended, otherwise concat either drops the end card's
  // video-only stream or produces an out-of-sync audio track.
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-vf", "settb=AVTB",
    "-af", "aresample=async=1",
    "-c:v", "libx264", "-c:a", "aac",
    output,
  ]);

  for (const p of [withCardsPath, endCardPath, listPath]) {
    try { unlinkSync(p); } catch { /* best-effort cleanup */ }
  }
  console.log(`\nDone: ${output}`);
}

await main();

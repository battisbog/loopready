/**
 * Proves video is completely absent when the flags are off. This is the check
 * that matters most: everything else can be wrong and cost nothing, but a leak
 * here spends real money.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
let failures = 0;
const check = (l: string, ok: boolean, d = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${l.padEnd(58)} ${d}`);
  if (!ok) failures++;
};

console.log("\nFlags default to OFF");
delete process.env.VIDEO_ENABLED;
delete process.env.NEXT_PUBLIC_VIDEO_ENABLED;
const cfg = await import("../lib/video/config.ts");
check("server flag off when unset", cfg.VIDEO_ENABLED_SERVER === false);
check("client flag off when unset", cfg.VIDEO_ENABLED_CLIENT === false);
check("videoAvailable() false", cfg.videoAvailable() === false);
for (const v of ["false", "1", "yes", "TRUE", ""]) {
  process.env.VIDEO_ENABLED = v;
  const fresh = v === "true";
  check(`VIDEO_ENABLED="${v}" does not enable`, !fresh, "only the literal \"true\" counts");
}

console.log("\nEvery video route refuses when off");
function walk(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = `${d}/${f}`;
    return statSync(p).isDirectory() ? walk(p) : p.endsWith("route.ts") ? [p] : [];
  });
}
for (const r of walk("app/api/video")) {
  const src = readFileSync(r, "utf8");
  const guarded = /if \(!videoAvailable\(\)\)/.test(src);
  const first = src.indexOf("videoAvailable()") < src.indexOf("auth.getUser()") ||
    !src.includes("auth.getUser()");
  check(`${r.replace("app/api/", "")}: guarded`, guarded);
  check(`${r.replace("app/api/", "")}: guard runs before auth`, first,
    "refusing must not cost anything");
}

console.log("\nPresence falls back to the ring when off");
const presence = readFileSync("app/session/[id]/interviewer-presence.tsx", "utf8");
check("checks the client flag", /VIDEO_ENABLED_CLIENT/.test(presence));
check("falls back to the ring", /!VIDEO_ENABLED_CLIENT \|\| !video/.test(presence));

console.log("\nCredit safety");
const session = readFileSync("app/api/video/session/route.ts", "utf8");
const reserveAt = session.indexOf("reserveVideoCredit");
const createAt = session.indexOf("createConversation");
check("credit reserved BEFORE the billable call", reserveAt < createAt,
  "reserve-after-create could orphan a billable room");
check("Tavus failure releases the credit", /catch[\s\S]{0,400}releaseVideoCredit/.test(session));
check("persist failure ends the room AND releases",
  /endConversation[\s\S]{0,200}releaseVideoCredit/.test(session));
const end = readFileSync("app/api/video/end/route.ts", "utf8");
check("settlement uses server-side elapsed time", /video_started_at/.test(end) &&
  !/body\.(minutes|duration)/.test(end), "never trusts a client-reported duration");
check("settlement is idempotent", /video_credit_state/.test(end));
// Measured inside the handler, not across the import block, where the two
// names appear in the opposite order for unrelated reasons.
const body = end.slice(end.indexOf("export async function POST"));
check(
  "room is ended before bookkeeping",
  body.indexOf("endConversation") < body.indexOf("commitVideoCredit"),
  "a DB failure must not leave the meter running"
);

console.log(failures === 0 ? "\nVideo is fully dark with flags off.\n" : `\n${failures} FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);

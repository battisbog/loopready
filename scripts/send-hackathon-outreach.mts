/**
 * Sends personalized cold-outreach emails to hackathon organizing teams via
 * Resend, from aryan@loopready.io. Same discipline as
 * send-campus-outreach.mts, but framed for an event/participant audience
 * ("your event," "your participants") rather than a school ("your
 * students") -- and doesn't mention a discount code or link in the first
 * touch, for the same Gmail-Promotions-tab reason documented there.
 *
 * Reads scripts/campus-outreach-hackathons.csv (hackathon,school,email,confidence,source).
 *
 *   npx tsx scripts/send-hackathon-outreach.mts            # dry run
 *   npx tsx scripts/send-hackathon-outreach.mts --send      # actually sends
 *   npx tsx scripts/send-hackathon-outreach.mts --send --limit 5   # cap this run
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { Resend } from "resend";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing from .env.local");
const resend = new Resend(RESEND_API_KEY);

const FROM = "Aryan from LoopReady <aryan@loopready.io>";
const DELAY_MS = 4000;

const csvPath = "scripts/campus-outreach-hackathons.csv";
const SEND = process.argv.includes("--send");
const limitFlag = process.argv.indexOf("--limit");
const LIMIT = limitFlag !== -1 ? Number(process.argv[limitFlag + 1]) : Infinity;

interface Hackathon {
  hackathon: string;
  school: string;
  email: string;
}

function parseCsv(raw: string): Hackathon[] {
  const [header, ...rows] = raw.trim().split("\n");
  const cols = header.split(",").map((c) => c.trim());
  return rows
    .filter((r) => r.trim())
    .map((row) => {
      const values = row.split(",").map((v) => v.trim());
      const rec = Object.fromEntries(cols.map((c, i) => [c, values[i] ?? ""]));
      return rec as unknown as Hackathon;
    });
}

function subjectFor(h: Hackathon): string {
  return `Interview prep resource for ${h.hackathon} participants`;
}

function bodyFor(h: Hackathon): string {
  return `Hi there,

I'm Aryan, the founder of LoopReady, an AI-powered interview practice platform built to help students prepare for technical interviews.

I've been following ${h.hackathon} and wanted to reach out — a lot of your participants are exactly the kind of builders who go on to interview at top tech companies, and I wanted to see if we could make LoopReady available to your community at a discounted rate.

LoopReady lets people practice full interview rounds for software engineering roles, including coding, behavioral, and system design, with an AI interviewer that asks follow-up questions and provides detailed feedback afterward.

My goal is simply to give your participants another resource they can use while preparing for interviews, especially those who may not have access to regular mock interviews or someone to practice with.

I'd be happy to provide ${h.hackathon} participants with a dedicated discount code and, if helpful, share a short overview or demo that you could pass along through your newsletter, Discord, or sponsor resources.

We'd love to support the ${h.hackathon} community and explore whether there's a way we can partner to make interview preparation a little more accessible.

Please let me know if this would be useful, and I'd be happy to send over the details.

Best,
Aryan
Founder, LoopReady
loopready.io`;
}

async function main() {
  const hackathons = parseCsv(readFileSync(csvPath, "utf8")).slice(0, LIMIT);
  console.log(`${hackathons.length} hackathon(s) loaded. Mode: ${SEND ? "SENDING" : "DRY RUN"}\n`);

  const logPath = "scripts/campus-outreach-log.csv";
  if (SEND && !existsSync(logPath)) {
    appendFileSync(logPath, "timestamp,school,email,status\n");
  }

  for (const h of hackathons) {
    if (!h.email || !h.email.includes("@")) {
      console.log(`SKIP (no valid email): ${h.hackathon}`);
      continue;
    }
    const subject = subjectFor(h);
    const body = bodyFor(h);

    if (!SEND) {
      console.log(`--- DRY RUN: ${h.hackathon} <${h.email}> ---`);
      console.log(`Subject: ${subject}`);
      console.log(body);
      console.log();
      continue;
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: h.email,
        subject,
        text: body,
      });
      if (error) throw new Error(error.message);
      console.log(`SENT: ${h.hackathon} <${h.email}>`);
      appendFileSync(logPath, `${new Date().toISOString()},"${h.hackathon}",${h.email},sent\n`);
    } catch (e) {
      console.log(`FAILED: ${h.hackathon} <${h.email}> — ${e instanceof Error ? e.message : e}`);
      appendFileSync(logPath, `${new Date().toISOString()},"${h.hackathon}",${h.email},failed\n`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

await main();

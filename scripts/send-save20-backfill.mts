/**
 * One-off backfill: sends the SAVE20 (20% off) code to real signups who
 * never received any discount code -- the evergreen WELCOME10 welcome email
 * only fires on login/signup AFTER it shipped, so anyone who signed up
 * earlier and hasn't logged back in since got nothing. Reuses the same
 * visual template as lib/email/welcome.ts (same Gmail-collapse fix, same
 * dashed code box), just with SAVE20/percent copy instead of WELCOME10.
 *
 *   npx tsx scripts/send-save20-backfill.mts
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const { Resend } = await import("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const ACCENT = "#10b981";
const ACCENT_FG = "#052e21";
const CODE = "SAVE20";
const PRICING_URL = "https://loopready.io/pricing";

const RECIPIENTS = [
  "mohit0312002@gmail.com",
  "vish.adarsh01@gmail.com",
  "schinn13@asu.edu",
];

function html(): string {
  return `
<div style="max-width: 480px; margin: 0 auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b;">
  <p style="font-size: 15px; font-weight: 600; margin: 0 0 20px;">LoopReady</p>

  <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">Thanks for trying LoopReady.</h1>

  <p style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px;">
    Here's 20% off your first month, on us. Use this code at checkout:
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
    <tr>
      <td style="background: #f4f4f5; border: 1px dashed #a1a1aa; border-radius: 8px; padding: 16px; text-align: center;">
        <span style="font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 22px; font-weight: 700; letter-spacing: 0.08em; color: #047857;">${CODE}</span>
      </td>
    </tr>
  </table>

  <p style="margin: 0;">
    <a href="${PRICING_URL}" style="display: inline-block; background: ${ACCENT}; color: ${ACCENT_FG}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">See plans &rarr;</a>
  </p>
</div>`.trim();
}

function text(): string {
  return `Thanks for trying LoopReady.

Here's 20% off your first month, on us -- use this code at checkout: ${CODE}

See plans: ${PRICING_URL}`;
}

for (const to of RECIPIENTS) {
  const { error } = await resend.emails.send({
    from: "LoopReady <hello@loopready.io>",
    to,
    subject: "Here's 20% off, on us!",
    html: html(),
    text: text(),
  });
  if (error) {
    console.log(`FAILED: ${to} — ${error.message}`);
  } else {
    console.log(`SENT: ${to}`);
  }
}

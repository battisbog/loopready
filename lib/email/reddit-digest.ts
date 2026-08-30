import { EMAIL_FROM, resendClient, resendConfigured } from "@/lib/email/resend";
import type { ScoredPost } from "@/lib/reddit/scan";

function threadUrl(permalink: string): string {
  return `https://reddit.com${permalink}`;
}

/**
 * Same lesson as lib/email/welcome.ts: no small/gray trailing paragraph
 * (Gmail's "Show trimmed content" collapse). Each thread is a plain-weight
 * row, not styled as a footer/disclaimer.
 */
function digestHtml(posts: ScoredPost[]): string {
  const rows = posts
    .map(
      (p) => `
  <tr>
    <td style="padding: 14px 0; border-top: 1px solid #e4e4e7;">
      <a href="${threadUrl(p.permalink)}" style="font-size: 15px; font-weight: 600; color: #18181b; text-decoration: none;">${p.title}</a>
      <p style="font-size: 13px; color: #71717a; margin: 4px 0 0;">r/${p.subreddit} &middot; ${p.num_comments} comments &middot; u/${p.author}</p>
    </td>
  </tr>`
    )
    .join("");

  return `
<div style="max-width: 560px; margin: 0 auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b;">
  <p style="font-size: 15px; font-weight: 600; margin: 0 0 20px;">LoopReady</p>

  <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Today's Reddit digest</h1>
  <p style="font-size: 14px; color: #3f3f46; margin: 0 0 8px;">
    ${posts.length} conversation${posts.length === 1 ? "" : "s"} worth joining, found across r/cscareerquestions, r/leetcode, r/ExperiencedDevs, r/csMajors, r/ITCareerQuestions, and r/interviews.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 0;">
    ${rows}
  </table>
</div>`.trim();
}

function digestText(posts: ScoredPost[]): string {
  const lines = posts.map(
    (p) => `- ${p.title}\n  r/${p.subreddit} | ${p.num_comments} comments | u/${p.author}\n  ${threadUrl(p.permalink)}`
  );
  return `Today's Reddit digest — ${posts.length} conversation(s) worth joining.\n\n${lines.join("\n\n")}`;
}

/** Sends nothing (and logs why) if there's nothing worth surfacing that day. */
export async function sendRedditDigest(to: string, posts: ScoredPost[]): Promise<void> {
  if (posts.length === 0) {
    console.log("[reddit-digest] nothing scored today, skipping send");
    return;
  }
  if (!resendConfigured()) {
    console.warn("[reddit-digest] RESEND_API_KEY not set; skipping");
    return;
  }
  try {
    const { error } = await resendClient().emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${posts.length} Reddit thread${posts.length === 1 ? "" : "s"} worth joining today`,
      html: digestHtml(posts),
      text: digestText(posts),
    });
    if (error) {
      console.error("[reddit-digest] send failed:", error.message);
      return;
    }
    console.log(`[reddit-digest] sent to ${to} (${posts.length} threads)`);
  } catch (e) {
    console.error("[reddit-digest] send threw:", e);
  }
}

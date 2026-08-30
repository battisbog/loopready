import { EMAIL_FROM, resendClient, resendConfigured } from "@/lib/email/resend";
import { getSiteUrl } from "@/lib/site-url";

/** Shared, evergreen welcome-offer code. See supabase/migrations-welcome-email.sql. */
export const WELCOME_DISCOUNT_CODE = "WELCOME10";

/**
 * Light background deliberately, not the app's dark theme -- email clients
 * render dark-on-dark badly and some force light mode regardless, so
 * transactional email uses a light shell with the brand's real accent green
 * (app/globals.css --accent #10b981) rather than trying to reproduce the
 * product's dark UI. All styles inline: email clients strip <style> blocks.
 */
function welcomeHtml(): string {
  const pricingUrl = `${getSiteUrl()}/pricing`;
  const ACCENT = "#10b981";
  const ACCENT_FG = "#052e21"; // text on a solid accent fill, matches the app token
  return `
<div style="background: #f4f4f5; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7;">
    <div style="padding: 32px 32px 0;">
      <div style="display: inline-block; width: 10px; height: 10px; border-radius: 999px; background: ${ACCENT}; margin-right: 8px; vertical-align: middle;"></div>
      <span style="font-size: 15px; font-weight: 600; color: #18181b; letter-spacing: -0.01em; vertical-align: middle;">LoopReady</span>
    </div>

    <div style="padding: 24px 32px 8px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #18181b; margin: 0 0 16px; letter-spacing: -0.01em;">
        Welcome to LoopReady.
      </h1>
      <p style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 24px;">
        Here's $10 off your first month, on us. Use this code at checkout:
      </p>
    </div>

    <div style="padding: 0 32px;">
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px dashed ${ACCENT}; border-radius: 10px; padding: 18px 20px; text-align: center;">
        <span style="font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 22px; font-weight: 700; letter-spacing: 0.08em; color: #047857;">${WELCOME_DISCOUNT_CODE}</span>
      </div>
    </div>

    <div style="padding: 28px 32px 8px;">
      <a href="${pricingUrl}" style="display: inline-block; background: ${ACCENT}; color: ${ACCENT_FG}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
        See plans &rarr;
      </a>
    </div>

    <div style="padding: 24px 32px 32px; border-top: 1px solid #f4f4f5; margin-top: 24px;">
      <p style="font-size: 13px; line-height: 1.6; color: #a1a1aa; margin: 0;">
        You're getting this because you just signed up for LoopReady. You can
        turn off account emails any time in Settings.
      </p>
    </div>
  </div>
</div>`.trim();
}

function welcomeText(): string {
  return `Welcome to LoopReady.

Here's $10 off your first month, on us -- use this code at checkout: ${WELCOME_DISCOUNT_CODE}

See plans: ${getSiteUrl()}/pricing

You're getting this because you just signed up for LoopReady. You can turn off account emails any time in Settings.`;
}

/**
 * Sends the one-time welcome/discount email. Never throws -- a failed send
 * must not break login, which is the only place this is called from
 * (app/auth/callback/route.ts, guarded by the atomic welcome_email_sent_at
 * claim so this fires at most once per account regardless of retries).
 */
export async function sendWelcomeEmail(to: string): Promise<void> {
  if (!resendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping welcome email");
    return;
  }
  try {
    const { error } = await resendClient().emails.send({
      from: EMAIL_FROM,
      to,
      subject: "$10 off your first month at LoopReady",
      html: welcomeHtml(),
      text: welcomeText(),
    });
    if (error) {
      console.error("[email] welcome send failed:", error.message);
      return;
    }
    console.log(`[email] welcome sent to ${to}`);
  } catch (e) {
    console.error("[email] welcome send threw:", e);
  }
}

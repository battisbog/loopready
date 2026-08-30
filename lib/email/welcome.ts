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
 *
 * Deliberately has NO small/gray disclaimer paragraph at the end. Confirmed
 * by live test (send three variants to a real Gmail inbox) that a trailing
 * `font-size: 13px; color: #a1a1aa` paragraph is exactly what triggers
 * Gmail's "Show trimmed content" collapse -- it pattern-matches as a
 * signature/footer block and hides it (and sometimes the whole message)
 * behind a "..." toggle. If disclosure language is needed again, keep it in
 * welcomeText() only, or style it plainly (same size/color as body text) --
 * never as a smaller, lighter, separated block.
 */
function welcomeHtml(): string {
  const pricingUrl = `${getSiteUrl()}/pricing`;
  const ACCENT = "#10b981";
  const ACCENT_FG = "#052e21"; // text on a solid accent fill, matches the app token
  return `
<div style="max-width: 480px; margin: 0 auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b;">
  <p style="font-size: 15px; font-weight: 600; margin: 0 0 20px;">LoopReady</p>

  <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">Welcome to LoopReady.</h1>

  <p style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px;">
    Here's $10 off your first month, on us. Use this code at checkout:
  </p>

  <p style="font-size: 22px; font-weight: 700; letter-spacing: 0.08em; color: #047857; margin: 0 0 24px;">
    ${WELCOME_DISCOUNT_CODE}
  </p>

  <p style="margin: 0;">
    <a href="${pricingUrl}" style="display: inline-block; background: ${ACCENT}; color: ${ACCENT_FG}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">See plans &rarr;</a>
  </p>
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

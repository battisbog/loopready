import { EMAIL_FROM, resendClient, resendConfigured } from "@/lib/email/resend";
import { getSiteUrl } from "@/lib/site-url";

/** Shared, evergreen welcome-offer code. See supabase/migrations-welcome-email.sql. */
export const WELCOME_DISCOUNT_CODE = "WELCOME10";

function welcomeHtml(): string {
  const pricingUrl = `${getSiteUrl()}/pricing`;
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
  <p style="font-size: 16px; line-height: 1.6;">Welcome to LoopReady.</p>
  <p style="font-size: 16px; line-height: 1.6;">
    Here's $10 off your first month, on us -- use this code at checkout:
  </p>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0; text-align: center;">
    <span style="font-family: ui-monospace, monospace; font-size: 20px; font-weight: 600; letter-spacing: 0.05em;">${WELCOME_DISCOUNT_CODE}</span>
  </div>
  <p style="font-size: 16px; line-height: 1.6;">
    <a href="${pricingUrl}" style="color: #2563eb; text-decoration: none; font-weight: 500;">See plans &rarr;</a>
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #71717a; margin-top: 32px;">
    You're getting this because you just signed up for LoopReady. You can turn
    off account emails any time in Settings.
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

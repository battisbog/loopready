import { Resend } from "resend";

/**
 * Resend client. Mirrors the rest of lib/*'s "configured or not" pattern
 * (lib/paypal/client.ts, lib/video/config.ts) -- missing credentials must
 * degrade to "email is off," never throw and break login.
 */

let cached: Resend | null = null;

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function resendClient(): Resend {
  if (cached) return cached;
  cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

/** Verified sending domain (see the Resend dashboard's Domains tab). */
export const EMAIL_FROM = "LoopReady <hello@loopready.io>";

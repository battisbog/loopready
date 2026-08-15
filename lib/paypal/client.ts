/**
 * Minimal PayPal REST client.
 *
 * Sandbox vs live is chosen by PAYPAL_ENV so the same code path is exercised
 * in both. Credentials are read from the environment and never logged.
 */

const BASES = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export type PayPalEnv = keyof typeof BASES;

export function paypalEnv(): PayPalEnv {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

export function paypalBase(): string {
  return BASES[paypalEnv()];
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

interface TokenCache {
  token: string;
  expiresAt: number;
}
let cached: TokenCache | null = null;

/** OAuth2 client-credentials token, cached until shortly before it expires. */
export async function paypalAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials are not configured");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status})`);
  }
  const data = await res.json();
  cached = {
    token: data.access_token,
    // Refresh a minute early rather than racing the expiry.
    expiresAt: Date.now() + Math.max(0, (data.expires_in - 60) * 1000),
  };
  return cached.token;
}

/** Authenticated PayPal API call returning parsed JSON. */
export async function paypalFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    // Bodies can contain payer details, so log status and path only.
    console.error(`[paypal] ${init.method ?? "GET"} ${path} -> ${res.status}`);
    throw new Error(`PayPal request failed (${res.status})`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

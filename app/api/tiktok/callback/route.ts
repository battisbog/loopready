import { NextResponse } from "next/server";

/**
 * One-time OAuth callback for connecting Aryan's own TikTok account to the
 * LoopReady sandbox app -- NOT a per-user product feature, just how the
 * marketing agent's posting capability gets an access token for the one
 * account it posts to.
 *
 * Displays the tokens directly rather than persisting them server-side:
 * this is a single founder-owned account, not a multi-user flow, so there's
 * no user record to attach a token to. Copy the access_token/refresh_token
 * from the page into .env.local once, same as every other credential this
 * session.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error, error_description: searchParams.get("error_description") }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code param" }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_SANDBOX_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_SANDBOX_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: "TikTok sandbox credentials not configured on the server" }, { status: 500 });
  }

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${new URL(request.url).origin}/api/tiktok/callback`,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: "Token exchange failed", detail: data }, { status: 502 });
  }

  return new NextResponse(
    `<pre style="font-family: monospace; padding: 24px; white-space: pre-wrap; word-break: break-all;">Connected. Copy these into .env.local:

TIKTOK_ACCESS_TOKEN=${data.access_token}
TIKTOK_REFRESH_TOKEN=${data.refresh_token}
TIKTOK_OPEN_ID=${data.open_id}

(access_token expires in ${data.expires_in}s / ~24h, refresh_token in ${data.refresh_expires_in}s / ~365 days)
</pre>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

// Generates feedback for a session through the local API.
// Usage: node scripts/feedback-test.mjs <sessionId> [baseUrl]
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const sessionId = process.argv[2];
const baseUrl = process.argv[3] || "http://localhost:3000";
if (!sessionId) {
  console.error("Usage: node scripts/feedback-test.mjs <sessionId>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await client.auth.signInWithPassword({
  email: "test@loopready.dev",
  password: "loopready-test-1234",
});
if (error) throw error;
const ref = new URL(url).hostname.split(".")[0];
const encoded =
  "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const CHUNK = 3180;
const cookies = [];
if (encoded.length <= CHUNK) cookies.push(`sb-${ref}-auth-token=${encoded}`);
else
  for (let i = 0; i * CHUNK < encoded.length; i++)
    cookies.push(`sb-${ref}-auth-token.${i}=${encoded.slice(i * CHUNK, (i + 1) * CHUNK)}`);

const res = await fetch(`${baseUrl}/api/feedback`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookies.join("; ") },
  body: JSON.stringify({ sessionId }),
});
const json = await res.json();
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, JSON.stringify(json));
  process.exit(1);
}
console.log(JSON.stringify(json, null, 2));

/**
 * Create, list, and deactivate discount codes.
 *
 * Fixed dollar amount off the first billing cycle of a Voice or Premium
 * subscription; renewals bill at full price. See supabase/migrations-
 * discount-codes.sql for the table/function this talks to, and
 * scripts/paypal-discount-plans.mts for why a discount needs its own PayPal
 * plan variant at all.
 *
 *   npx tsx scripts/discount-codes.mts --create LAUNCH25 --amount 5
 *   npx tsx scripts/discount-codes.mts --create LAUNCH25 --amount 5 --max-uses 100 --expires 2026-12-31
 *   npx tsx scripts/discount-codes.mts --list
 *   npx tsx scripts/discount-codes.mts --deactivate LAUNCH25
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function create() {
  const code = flag("create")!.toUpperCase();
  const amount = Number(flag("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    console.log("--amount must be a positive number, e.g. --amount 5");
    return;
  }
  const maxUses = flag("max-uses") ? Number(flag("max-uses")) : null;
  const expiresRaw = flag("expires");
  const expiresAt = expiresRaw ? new Date(expiresRaw).toISOString() : null;

  const { error } = await admin.from("discount_codes").insert({
    code,
    amount_off: amount,
    max_uses: maxUses,
    expires_at: expiresAt,
  });

  if (error) {
    console.log(`FAILED: ${error.message}`);
    return;
  }
  console.log(
    `created ${code}: $${amount} off first month` +
      (maxUses ? `, max ${maxUses} uses` : ", unlimited uses") +
      (expiresAt ? `, expires ${expiresRaw}` : ", no expiry")
  );
}

async function list() {
  const { data, error } = await admin
    .from("discount_codes")
    .select("code, amount_off, max_uses, times_used, active, expires_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.log(`FAILED: ${error.message}`);
    return;
  }
  if (!data?.length) {
    console.log("No discount codes yet.");
    return;
  }
  console.log("code            $off   used/max   active  expires");
  for (const c of data) {
    console.log(
      `${c.code.padEnd(15)} $${String(c.amount_off).padEnd(5)} ` +
        `${c.times_used}/${c.max_uses ?? "∞"}`.padEnd(10) +
        ` ${String(c.active).padEnd(7)} ${c.expires_at ?? "never"}`
    );
  }
}

async function deactivate() {
  const code = flag("deactivate")!.toUpperCase();
  const { error, data } = await admin
    .from("discount_codes")
    .update({ active: false })
    .eq("code", code)
    .select("code");
  if (error) {
    console.log(`FAILED: ${error.message}`);
    return;
  }
  console.log(data?.length ? `deactivated ${code}` : `no code found: ${code}`);
}

async function main() {
  if (process.argv.includes("--create")) return create();
  if (process.argv.includes("--list")) return list();
  if (process.argv.includes("--deactivate")) return deactivate();
  console.log(
    "Usage:\n" +
      "  --create CODE --amount N [--max-uses N] [--expires YYYY-MM-DD]\n" +
      "  --list\n" +
      "  --deactivate CODE"
  );
}

await main();

/**
 * One-time migration: copies every active row in Supabase's discount_codes
 * table into Dodo as a real discount code, so Dodo's own hosted checkout
 * page can validate/apply codes directly (LoopReady no longer redeems
 * codes itself for Dodo checkouts -- see app/api/dodo/subscription/route.ts
 * and app/api/dodo/order/route.ts).
 *
 * LoopReady's own enforcement was "one redemption per account across all
 * codes" (has_redeemed_discount_code / redeem_discount_code RPCs). Dodo has
 * no equivalent -- the closest analog is usage_limit, a per-code total-use
 * cap. That's an intentional, accepted trade of stricter-but-bespoke
 * enforcement for simplicity now that Dodo owns the whole checkout page.
 * discount_codes.max_uses maps straight across; NULL (unlimited) is passed
 * through as Dodo's own "no usage_limit" by omitting the field.
 *
 * amount_off is dollars (flat codes); percent_off is a plain percentage
 * (percentage codes). Dodo's top-level `amount` is always basis points:
 *   - percentage code: percent_off * 100 (20 -> 2000 = 20%)
 *   - flat code: the real amount lives in currency_options.max_amount_possible
 *     (cents); the top-level `amount` field is required but functionally
 *     unused for flat codes, so it's set to the minimum valid value (1).
 *
 *   npx tsx scripts/migrate-discounts-to-dodo.mts             # dry run, prints the mapping
 *   npx tsx scripts/migrate-discounts-to-dodo.mts --create    # actually creates on Dodo
 *
 * Idempotent: before creating, checks retrieveByCode(code) and skips
 * (logs, doesn't error) any code that already exists on Dodo -- safe to
 * re-run after a partial run or to pick up newly added DB codes later.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const CREATE = process.argv.includes("--create");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment:
    process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
});

interface DiscountRow {
  code: string;
  amount_off: number | null;
  percent_off: number | null;
  max_uses: number | null;
  times_used: number;
  active: boolean;
  expires_at: string | null;
}

async function alreadyOnDodo(code: string): Promise<boolean> {
  try {
    await dodo.discounts.retrieveByCode(code);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!process.env.DODO_PAYMENTS_API_KEY) {
    throw new Error("DODO_PAYMENTS_API_KEY missing from .env.local");
  }

  const { data, error } = await admin
    .from("discount_codes")
    .select("code, amount_off, percent_off, max_uses, times_used, active, expires_at")
    .eq("active", true);
  if (error) throw error;

  const rows = (data ?? []) as DiscountRow[];
  console.log(`${rows.length} active discount code(s) in Supabase. Mode: ${CREATE ? "CREATING" : "DRY RUN"}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const isPercentage = row.percent_off != null;
    const body: DodoPayments.DiscountCreateParams = isPercentage
      ? {
          code: row.code,
          type: "percentage",
          amount: Math.round(row.percent_off! * 100),
          usage_limit: row.max_uses ?? undefined,
          expires_at: row.expires_at ?? undefined,
        }
      : {
          code: row.code,
          type: "flat",
          amount: 1,
          currency_options: [
            {
              currency: "USD",
              is_default: true,
              max_amount_possible: Math.round((row.amount_off ?? 0) * 100),
              minimum_subtotal: 0,
            },
          ],
          usage_limit: row.max_uses ?? undefined,
          expires_at: row.expires_at ?? undefined,
        };

    const summary = isPercentage
      ? `${row.percent_off}% off`
      : `$${row.amount_off} off`;
    const limit = row.max_uses == null ? "unlimited uses" : `usage_limit=${row.max_uses}`;

    if (!CREATE) {
      console.log(`DRY RUN: ${row.code} -- ${summary}, ${limit}${row.expires_at ? `, expires ${row.expires_at}` : ""}`);
      continue;
    }

    if (await alreadyOnDodo(row.code)) {
      console.log(`SKIP (already on Dodo): ${row.code}`);
      skipped++;
      continue;
    }

    try {
      await dodo.discounts.create(body);
      console.log(`CREATED: ${row.code} -- ${summary}, ${limit}`);
      created++;
    } catch (e) {
      console.log(`FAILED: ${row.code} -- ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  if (CREATE) {
    console.log(`\n${created} created, ${skipped} already existed, ${failed} failed.`);
  } else {
    console.log(`\nDRY RUN complete -- re-run with --create to actually create these on Dodo.`);
  }
}

await main();

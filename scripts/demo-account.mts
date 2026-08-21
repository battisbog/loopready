/**
 * Manage the shared demo account.
 *
 *   npx tsx scripts/demo-account.mts status    # how many demos used
 *   npx tsx scripts/demo-account.mts seed      # create/confirm the login
 *   npx tsx scripts/demo-account.mts reset     # back to 0 used, re-enabled
 *   npx tsx scripts/demo-account.mts disable   # refuse video, login still works
 *   npx tsx scripts/demo-account.mts enable
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { DEMO_EMAIL, DEMO_VIDEO_CAP, DEMO_SECONDS } = await import("../lib/demo/gate.ts");

const PASSWORD = process.env.TEST_ACCOUNT_PASSWORD ?? "testpassword";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const cmd = process.argv[2] ?? "status";

async function findUser() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data?.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL) ?? null;
}

async function status() {
  const user = await findUser();
  const { data } = await admin
    .from("demo_usage")
    .select("used, disabled, updated_at")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();
  const used = Number(data?.used ?? 0);
  console.log(`\n  account   : ${DEMO_EMAIL}`);
  console.log(`  login     : ${user ? "exists" : "NOT CREATED — run seed"}`);
  console.log(`  confirmed : ${user?.email_confirmed_at ? "yes" : "no"}`);
  console.log(`  demos used: ${used} of ${DEMO_VIDEO_CAP}  (${Math.max(0, DEMO_VIDEO_CAP - used)} left)`);
  console.log(`  disabled  : ${data?.disabled ? "YES — video refused" : "no"}`);
  console.log(`  demo length: ${DEMO_SECONDS}s, enforced by Tavus\n`);
}

async function seed() {
  let user = await findUser();
  if (user) {
    await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    console.log(`  updated existing user ${DEMO_EMAIL}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: PASSWORD,
      // Confirmed immediately: nobody can click a link sent to a shared inbox.
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    user = data.user;
    console.log(`  created ${DEMO_EMAIL}`);
  }

  // Free tier deliberately. The demo's budget is the lifetime cap, not credits,
  // so it must not look like a paying account anywhere else in the product.
  await admin.from("profiles").upsert(
    { id: user!.id, subscription_tier: "free", video_credits_remaining: 0 },
    { onConflict: "id" }
  );
  await admin.from("demo_usage").upsert(
    { email: DEMO_EMAIL },
    { onConflict: "email", ignoreDuplicates: true }
  );
  await status();
}

async function setUsed(used: number, disabled: boolean) {
  await admin
    .from("demo_usage")
    .upsert(
      { email: DEMO_EMAIL, used, disabled, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );
}

switch (cmd) {
  case "seed":
    await seed();
    break;
  case "reset":
    await setUsed(0, false);
    console.log("  reset to 0 used and re-enabled");
    await status();
    break;
  case "disable":
    await setUsed(
      Number((await admin.from("demo_usage").select("used").eq("email", DEMO_EMAIL).maybeSingle()).data?.used ?? 0),
      true
    );
    console.log("  disabled: video refused, login still works");
    await status();
    break;
  case "enable":
    await setUsed(
      Number((await admin.from("demo_usage").select("used").eq("email", DEMO_EMAIL).maybeSingle()).data?.used ?? 0),
      false
    );
    await status();
    break;
  default:
    await status();
}

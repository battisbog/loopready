// Exercises the video-credit state machine directly against Postgres.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local"), quiet: true });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === "test@loopready.dev");
const uid = user.id;

const state = async () => {
  const { data } = await admin
    .from("profiles")
    .select("video_credits_remaining, video_reservation_session_id")
    .eq("id", uid)
    .single();
  return data;
};
const rpc = async (fn, args) => (await admin.rpc(fn, args)).data;

// Two throwaway session ids to reserve against.
const { data: s1 } = await admin
  .from("sessions")
  .insert({ user_id: uid, round_type: "behavioral" })
  .select()
  .single();
const { data: s2 } = await admin
  .from("sessions")
  .insert({ user_id: uid, round_type: "behavioral" })
  .select()
  .single();

console.log("=== grant 2 credits (simulating a purchase) ===");
await rpc("grant_video_credits", {
  p_user: uid,
  p_allowance: 2,
  p_reset: null,
  p_mode: "set",
  p_detail: "test",
});
console.log("  ", await state());

console.log("\n=== reserve for session 1 ===");
console.log("  ", await rpc("reserve_video_credit", { p_user: uid, p_session: s1.id }));
console.log("  ", await state());

console.log("\n=== reserve AGAIN for a different session (must be refused) ===");
console.log("  ", await rpc("reserve_video_credit", { p_user: uid, p_session: s2.id }));

console.log("\n=== re-reserve the SAME session (idempotent reconnect) ===");
console.log("  ", await rpc("reserve_video_credit", { p_user: uid, p_session: s1.id }));
console.log("  ", await state());

console.log("\n=== release (user quit before the threshold) ===");
console.log("  ", await rpc("release_video_credit", { p_user: uid, p_session: s1.id }));
console.log("  ", await state(), "<- credit returned");

console.log("\n=== reserve + commit (a real interview) ===");
await rpc("reserve_video_credit", { p_user: uid, p_session: s1.id });
console.log("  ", await rpc("commit_video_credit", { p_user: uid, p_session: s1.id }));
console.log("  ", await state(), "<- credit spent, hold cleared");

console.log("\n=== PARALLEL race for the last credit ===");
const [a, b] = await Promise.all([
  rpc("reserve_video_credit", { p_user: uid, p_session: s1.id }),
  rpc("reserve_video_credit", { p_user: uid, p_session: s2.id }),
]);
console.log("   attempt A:", a);
console.log("   attempt B:", b);
const after = await state();
console.log("  ", after);
console.log(
  after.video_credits_remaining >= 0 && [a.ok, b.ok].filter(Boolean).length === 1
    ? "   PASS: exactly one reservation won, no negative balance"
    : "   FAIL: race allowed a double spend"
);

console.log("\n=== spend the last one, then try again with 0 ===");
await rpc("commit_video_credit", { p_user: uid, p_session: a.ok ? s1.id : s2.id });
console.log("  ", await rpc("reserve_video_credit", { p_user: uid, p_session: s1.id }));

console.log("\n=== audit ledger ===");
const { data: events } = await admin
  .from("video_credit_events")
  .select("action, detail, created_at")
  .eq("user_id", uid)
  .order("created_at", { ascending: true });
events.forEach((e) => console.log("  ", e.action, e.detail ? `(${e.detail})` : ""));

// Reset the test account.
await admin.from("video_credit_events").delete().eq("user_id", uid);
await admin
  .from("profiles")
  .update({
    video_credits_remaining: 0,
    video_plan_allowance: 0,
    video_reservation_session_id: null,
  })
  .eq("id", uid);
await admin.from("sessions").delete().in("id", [s1.id, s2.id]);
console.log("\n(cleaned up)");

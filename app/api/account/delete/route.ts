import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalFetch, paypalConfigured } from "@/lib/paypal/client";

export const maxDuration = 60;

/**
 * Permanently deletes an account and everything belonging to it.
 *
 * Order matters. The child tables use ON DELETE NO ACTION, so removing the
 * auth user first would either fail on a foreign key or strand rows that no
 * longer map to any account. Children are removed first, parents last.
 *
 * The subscription is cancelled BEFORE any deletion: forgetting that would
 * keep charging a person whose account no longer exists, and once the profile
 * is gone we no longer know the subscription id to cancel.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { confirm } = await request.json().catch(() => ({}));
  // Typing the email is a deliberate speed bump on an irreversible action.
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your email address exactly to confirm deletion." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const userId = user.id;
  const report: Record<string, number | string> = {};

  // --- 1. Stop billing before anything is destroyed ---
  const { data: profile } = await admin
    .from("profiles")
    .select("paypal_subscription_id, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const subscriptionId = profile?.paypal_subscription_id;
  if (subscriptionId && paypalConfigured()) {
    try {
      await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Account deleted by user" }),
      });
      report.subscriptionCancelled = subscriptionId;
    } catch (e) {
      // Refuse to delete rather than silently leave an active subscription
      // attached to an account that will no longer exist.
      console.error("[account] subscription cancel failed:", e);
      return NextResponse.json(
        {
          error:
            "We could not cancel your active subscription. Nothing has been deleted. Please cancel from the Billing page first, or contact support.",
        },
        { status: 502 }
      );
    }
  }

  // --- 2. Collect the user's sessions; children are keyed off them ---
  const { data: sessions } = await admin
    .from("sessions")
    .select("id")
    .eq("user_id", userId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  try {
    // Children first: feedback and turns hang off sessions.
    if (sessionIds.length) {
      const fb = await admin.from("feedback").delete().in("session_id", sessionIds);
      if (fb.error) throw new Error(`feedback: ${fb.error.message}`);

      const tn = await admin.from("turns").delete().in("session_id", sessionIds);
      if (tn.error) throw new Error(`turns: ${tn.error.message}`);
    }

    const ev = await admin
      .from("video_credit_events")
      .delete()
      .eq("user_id", userId);
    if (ev.error) throw new Error(`video_credit_events: ${ev.error.message}`);

    const se = await admin.from("sessions").delete().eq("user_id", userId);
    if (se.error) throw new Error(`sessions: ${se.error.message}`);

    const lp = await admin.from("loops").delete().eq("user_id", userId);
    if (lp.error) throw new Error(`loops: ${lp.error.message}`);

    const pr = await admin.from("profiles").delete().eq("id", userId);
    if (pr.error) throw new Error(`profiles: ${pr.error.message}`);

    report.sessionsDeleted = sessionIds.length;
  } catch (e) {
    console.error("[account] data deletion failed:", e);
    return NextResponse.json(
      {
        error:
          "Something went wrong deleting your data. Your account has not been removed. Please contact support.",
      },
      { status: 500 }
    );
  }

  // --- 3. Finally the auth record ---
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("[account] auth deletion failed:", authError.message);
    return NextResponse.json(
      {
        error:
          "Your data was removed but the login could not be deleted. Please contact support.",
      },
      { status: 500 }
    );
  }

  // --- 4. Verify nothing was left behind ---
  const leftovers: string[] = [];
  for (const [table, column] of [
    ["sessions", "user_id"],
    ["loops", "user_id"],
    ["profiles", "id"],
    ["video_credit_events", "user_id"],
  ] as const) {
    const { count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);
    if ((count ?? 0) > 0) leftovers.push(`${table}:${count}`);
  }
  if (leftovers.length) {
    console.error(`[account] residual rows after delete: ${leftovers.join(", ")}`);
  }

  console.log(`[account] deleted ${userId}`, report);

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true, deleted: report, leftovers });
}

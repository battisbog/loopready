import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Badge,
  Button,
  Card,
  CardLabel,
  CardStat,
  PageShell,
  Section,
} from "@/components/ui";
import { TIERS, getEntitlements, type Tier } from "@/lib/tiers";
import { FREE_SESSION_WINDOW_DAYS } from "@/lib/rate-limit";
import CancelSubscription from "./cancel-subscription";

export const metadata = { title: "Billing & Plan" };

const STATUS_TONE: Record<string, "success" | "warn" | "error" | "neutral"> = {
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  CANCEL_REQUESTED: "warn",
  SUSPENDED: "warn",
  CANCELLED: "error",
  EXPIRED: "error",
  REFUNDED: "error",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const ent = await getEntitlements(admin, user.id);

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "subscription_status, paypal_subscription_id, paypal_order_id, current_period_end, updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Credit ledger doubles as the billing history until invoices are stored.
  const { data: events } = await admin
    .from("video_credit_events")
    .select("action, detail, created_at")
    .eq("user_id", user.id)
    .in("action", ["grant", "refund"])
    .order("created_at", { ascending: false })
    .limit(20);

  const features = TIERS[ent.tier as Tier] ?? TIERS.free;
  const status = profile?.subscription_status ?? null;
  const paid = ent.tier === "voice" || ent.tier === "premium";

  return (
    <PageShell
        width="md"
        title="Billing & Plan"
        description="Your current plan, credits, and payment history."
      >
        <Section>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card accent={paid}>
              <CardLabel>Current plan</CardLabel>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone={paid ? "accent" : "neutral"}>{features.label}</Badge>
              </div>
              <p className="mt-3 text-sm text-secondary">
                {features.sessionAllowance === null
                  ? "Unlimited interviews"
                  : `${features.sessionAllowance} interview every ${FREE_SESSION_WINDOW_DAYS} days`}
              </p>
            </Card>

            <Card>
              <CardLabel>Status</CardLabel>
              <div className="mt-3">
                {status ? (
                  <Badge tone={STATUS_TONE[status] ?? "neutral"}>
                    {status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted">No subscription</p>
                )}
              </div>
              {profile?.current_period_end && (
                <p className="mt-3 text-xs text-muted">
                  Renews{" "}
                  {new Date(profile.current_period_end).toLocaleDateString(
                    undefined,
                    { dateStyle: "medium" }
                  )}
                </p>
              )}
            </Card>

            <Card>
              <CardLabel>Video credits</CardLabel>
              <CardStat
                value={ent.videoCreditsRemaining}
                hint={
                  ent.videoPlanAllowance
                    ? `of ${ent.videoPlanAllowance} this cycle`
                    : "Premium includes video interviews"
                }
              />
            </Card>
          </div>
        </Section>

        <Section title="Manage">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                {paid ? "Change or cancel your plan" : "Upgrade your plan"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">
                {paid
                  ? "Cancelling keeps your access until the end of the current period."
                  : "Unlock the coding and system design rounds, and remove the daily cap."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button href="/pricing" variant={paid ? "secondary" : "primary"}>
                {paid ? "Change plan" : "See plans"}
              </Button>
              {ent.tier === "premium" && (
                <Button href="/checkout?product=video-pack" variant="secondary">
                  Buy video credits
                </Button>
              )}
              {profile?.paypal_subscription_id &&
                status !== "CANCEL_REQUESTED" &&
                status !== "CANCELLED" && <CancelSubscription />}
            </div>
          </Card>
        </Section>

        <Section title="History">
          {(events ?? []).length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-sm text-secondary">No payments yet.</p>
              <p className="mt-1 text-sm text-muted">
                Purchases and credit grants will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {(events ?? []).map((e, i) => (
                <Card
                  key={i}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <div>
                    <p className="text-sm text-primary">
                      {e.detail ?? (e.action === "grant" ? "Credits added" : "Refund")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <Badge tone={e.action === "refund" ? "warn" : "neutral"}>
                    {e.action}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </Section>
    </PageShell>
  );
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppNav from "@/components/app-nav";
import { PageShell } from "@/components/ui";
import { getContext } from "@/lib/interview/companies";
import type { RoundType } from "@/lib/interview/rounds";
import LoopSummaryView from "./summary-view";

export default async function LoopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: loop } = await admin
    .from("loops")
    .select("id, company, level, rounds, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!loop) notFound();

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, round_type, round_order, status, feedback(overall_signal)")
    .eq("loop_id", id)
    .order("round_order", { ascending: true });

  const ctx = getContext(loop.company, loop.level);
  const rounds = (sessions ?? []).map((s) => {
    const fb = Array.isArray(s.feedback) ? s.feedback[0] : s.feedback;
    return {
      sessionId: s.id as string,
      roundType: s.round_type as RoundType,
      status: s.status as string,
      signal: (fb?.overall_signal as string | undefined) ?? null,
    };
  });

  return (
    <>
      <AppNav email={user.email} />
      <PageShell
        width="md"
        title="Loop debrief"
        description={
          ctx
            ? `${ctx.profile.displayName} · ${ctx.levelLabel} · ${rounds.length} round${rounds.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        <LoopSummaryView loopId={id} rounds={rounds} />
      </PageShell>
    </>
  );
}

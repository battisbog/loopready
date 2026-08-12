import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import VoiceInterview from "./voice-interview";
import CodingInterview from "./coding-interview";
import { getProblem } from "@/lib/coding/problems";
import { getContext } from "@/lib/interview/companies";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";

export default async function SessionPage({
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
  const { data: session } = await admin
    .from("sessions")
    .select()
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!session) notFound();

  const { data: turns } = await admin
    .from("turns")
    .select("role, text, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  let header: string | undefined;
  if (session.loop_id) {
    const { data: loop } = await admin
      .from("loops")
      .select("company, level, rounds")
      .eq("id", session.loop_id)
      .single();
    const ctx = loop ? getContext(loop.company, loop.level) : null;
    if (ctx) {
      const roundPos =
        loop!.rounds.length > 1
          ? ` · ${ROUND_LABEL[session.round_type as RoundType]} ${
              (session.round_order ?? 0) + 1
            }/${loop!.rounds.length}`
          : "";
      header = `${ctx.profile.displayName} ${ctx.levelLabel}${roundPos}`;
    }
  }

  if (session.status === "active") {
    if (session.round_type === "coding") {
      const problem = getProblem(session.artifact?.problemId);
      if (!problem) notFound();
      return (
        <CodingInterview
          sessionId={id}
          initialTurns={turns ?? []}
          header={header}
          problem={{
            title: problem.title,
            statement: problem.statement,
            example: problem.example,
            fn: problem.fn,
          }}
          initialCode={session.artifact?.code ?? problem.signatures.python}
          initialLanguage={session.artifact?.language ?? "python"}
          signatures={problem.signatures}
        />
      );
    }
    return (
      <VoiceInterview
        sessionId={id}
        initialTurns={turns ?? []}
        questionIndex={session.question_index}
        questionCount={session.questions?.length ?? 3}
        header={header}
      />
    );
  }

  // Completed / abandoned: transcript history view
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {header ?? "Transcript"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {new Date(session.started_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/session/${id}/feedback`}
            className="text-emerald-400 hover:text-emerald-300"
          >
            Feedback
          </Link>
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
            Home
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {(turns ?? []).map((t, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              t.role === "interviewer"
                ? "bg-zinc-900 text-zinc-200"
                : "ml-auto bg-emerald-500/15 text-emerald-100"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}

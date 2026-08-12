import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import StartButton from "./start-button";
import SignOutButton from "./signout-button";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";
import { COMPANY_PROFILES } from "@/lib/interview/companies";

const SIGNAL_STYLES: Record<string, string> = {
  hire: "bg-emerald-500/15 text-emerald-400",
  borderline: "bg-amber-500/15 text-amber-400",
  "no-hire": "bg-red-500/15 text-red-400",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select(
      "id, started_at, status, round_type, loops(company, level), feedback(overall_signal)"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LoopReady</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Behavioral mock interviews, calibrated to a FAANG loop.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10">
        <StartButton />
      </div>

      <div className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Past sessions
        </h2>
        <ul className="mt-3 divide-y divide-zinc-900">
          {(sessions ?? []).map((s) => {
            const fb = Array.isArray(s.feedback) ? s.feedback[0] : s.feedback;
            const signal = fb?.overall_signal as string | undefined;
            const loop = Array.isArray(s.loops) ? s.loops[0] : s.loops;
            const profile = loop ? COMPANY_PROFILES[loop.company] : null;
            const tag = profile
              ? `${profile.displayName} · ${profile.levels[loop!.level]?.label ?? loop!.level}`
              : null;
            return (
              <li key={s.id}>
                <Link
                  href={`/session/${s.id}`}
                  className="flex items-center justify-between py-3 hover:bg-zinc-900/50"
                >
                  <span className="flex items-center gap-2 text-sm text-zinc-300">
                    {new Date(s.started_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                      {ROUND_LABEL[s.round_type as RoundType] ?? s.round_type}
                    </span>
                    {tag && (
                      <span className="text-xs text-zinc-500">{tag}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {signal ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          SIGNAL_STYLES[signal] ?? "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {signal}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">{s.status}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
          {(sessions ?? []).length === 0 && (
            <li className="py-3 text-sm text-zinc-600">No sessions yet.</li>
          )}
        </ul>
      </div>
    </main>
  );
}

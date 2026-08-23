import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, PageShell, Section, SIGNAL_TONE } from "@/components/ui";
import { ROUND_LABEL, ROUND_TYPES, type RoundType } from "@/lib/interview/rounds";
import { COMPANY_PROFILES } from "@/lib/interview/companies";

export const metadata = { title: "History" };

const PAGE_SIZE = 25;

/**
 * Every past session, filterable by round type, company and date -- not just
 * the last 20 the dashboard shows. Built on the exact same query shape the
 * dashboard already uses, so a row here and a row there never disagree.
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    round?: string;
    company?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const round = params.round && ROUND_TYPES.includes(params.round as RoundType) ? params.round : "";
  const company = params.company && params.company in COMPANY_PROFILES ? params.company : "";
  const page = Math.max(1, Number(params.page) || 1);

  const admin = createAdminClient();

  let query = admin
    .from("sessions")
    .select(
      "id, started_at, status, round_type, loop_id, loops(company, level), feedback(overall_signal)",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  if (round) query = query.eq("round_type", round);
  if (params.from) query = query.gte("started_at", new Date(params.from).toISOString());
  if (params.to) {
    // Inclusive of the whole "to" day, not just its midnight instant.
    const end = new Date(params.to);
    end.setUTCHours(23, 59, 59, 999);
    query = query.lte("started_at", end.toISOString());
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  // The company filter lives on the joined loop, not the session row, so it
  // is applied after the fetch. Sessions are cheap enough per user that a
  // second round trip for an exact-count filtered query is not worth the
  // complexity; a full-page filter narrows an already-short list further.
  const rows = (data ?? []).filter((s) => {
    if (!company) return true;
    const loop = Array.isArray(s.loops) ? s.loops[0] : s.loops;
    return loop?.company === company;
  });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const signalOf = (s: (typeof rows)[number]) => {
    const fb = Array.isArray(s.feedback) ? s.feedback[0] : s.feedback;
    return fb?.overall_signal as string | undefined;
  };

  function paramsWith(next: Record<string, string | undefined>): string {
    const merged = { round, company, from: params.from, to: params.to, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  return (
    <PageShell width="lg" title="History" description="Every practice session, in one list.">
      <Section>
        {/* Plain GET form: filtering is a URL, so it works with no client JS
            and a filtered view is always a shareable, reloadable link. */}
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
          <FilterField label="Round">
            <select name="round" defaultValue={round} className={SELECT_CLASS}>
              <option value="">All rounds</option>
              {ROUND_TYPES.map((r) => (
                <option key={r} value={r}>
                  {ROUND_LABEL[r]}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Company">
            <select name="company" defaultValue={company} className={SELECT_CLASS}>
              <option value="">All companies</option>
              {Object.entries(COMPANY_PROFILES).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="From">
            <input type="date" name="from" defaultValue={params.from ?? ""} className={SELECT_CLASS} />
          </FilterField>

          <FilterField label="To">
            <input type="date" name="to" defaultValue={params.to ?? ""} className={SELECT_CLASS} />
          </FilterField>

          <button
            type="submit"
            className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Filter
          </button>
          {(round || company || params.from || params.to) && (
            <a href="/history" className="text-xs text-muted underline-offset-2 hover:text-secondary hover:underline">
              Clear
            </a>
          )}
        </form>
      </Section>

      <Section
        title={`${count ?? 0} session${count === 1 ? "" : "s"}`}
        actions={
          totalPages > 1 && (
            <span className="text-xs text-muted">
              Page {page} of {totalPages}
            </span>
          )
        }
      >
        {rows.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm font-medium text-primary">No sessions match these filters</p>
            <p className="mt-1.5 text-sm text-secondary">Try clearing a filter, or start a new interview.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((s) => {
              const signal = signalOf(s);
              const loop = Array.isArray(s.loops) ? s.loops[0] : s.loops;
              const companyProfile = loop ? COMPANY_PROFILES[loop.company] : null;
              const level = companyProfile?.levels[loop!.level]?.label ?? loop?.level;

              return (
                <Card
                  key={s.id}
                  href={signal ? `/session/${s.id}/feedback` : `/session/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">
                      {companyProfile ? `${companyProfile.displayName} · ${level}` : "Practice interview"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{ROUND_LABEL[s.round_type as RoundType] ?? s.round_type}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={s.started_at}>
                        {new Date(s.started_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </p>
                  </div>
                  {signal ? (
                    <Badge tone={SIGNAL_TONE[signal] ?? "neutral"}>{signal}</Badge>
                  ) : (
                    <Badge tone={s.status === "active" ? "accent" : "outline"}>
                      {s.status === "active" ? "In progress" : s.status}
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {page > 1 && (
              <a
                href={paramsWith({ page: String(page - 1) })}
                className="rounded-md border border-line px-3 py-1.5 text-sm text-secondary hover:border-line-strong hover:text-primary"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={paramsWith({ page: String(page + 1) })}
                className="rounded-md border border-line px-3 py-1.5 text-sm text-secondary hover:border-line-strong hover:text-primary"
              >
                Next
              </a>
            )}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

const SELECT_CLASS =
  "h-9 rounded-md border border-line bg-base px-2.5 text-sm text-primary outline-none transition-colors focus:border-accent-border";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

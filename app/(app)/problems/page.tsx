import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Field, PageShell, Section, Select } from "@/components/ui";
import { ROUND_LABEL, ROUND_TYPES, type RoundType } from "@/lib/interview/rounds";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { PROBLEMS } from "@/lib/coding/problems";
import { DESIGN_PROMPTS } from "@/lib/design/prompts";
import { QUESTION_BANK } from "@/lib/interview/questions";

export const metadata = { title: "Problems" };

/** Only the 6 calibrated companies are offered as filter chips -- the
 *  free-form `companies` tags on problems/questions include names outside
 *  this set (e.g. "Uber", from public reports), but filtering against those
 *  would surface companies LoopReady doesn't otherwise support anywhere in
 *  the app. */
const FILTERABLE_COMPANIES = Object.entries(COMPANY_PROFILES).filter(
  ([key]) => key !== "generic"
);

const TIER_LABEL: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
};

/**
 * A read-only browse of the full problem bank -- not a way to start an
 * interview. See /start for that. This exists so a candidate (or the
 * founder, demoing the product) can see the actual depth of the bank
 * before/without spending a session on it.
 *
 * System design has no `companies` field on DesignPrompt at all (see its own
 * type) -- the company filter is simply not offered for that round, rather
 * than faked against data that doesn't exist.
 */
export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string; company?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const round: RoundType = ROUND_TYPES.includes(params.round as RoundType)
    ? (params.round as RoundType)
    : "coding";
  const companyKey = params.company && params.company in COMPANY_PROFILES ? params.company : "";
  const companyName = companyKey ? COMPANY_PROFILES[companyKey].displayName : "";
  const companyFilterable = round !== "system_design";

  return (
    <PageShell
      width="lg"
      title="Problems"
      description="The full bank this app draws from -- browse it, no session required."
    >
      <Section>
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
          <Field label="Round">
            <Select name="round" defaultValue={round}>
              {ROUND_TYPES.map((r) => (
                <option key={r} value={r}>
                  {ROUND_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          {companyFilterable && (
            <Field label="Company">
              <Select name="company" defaultValue={companyKey}>
                <option value="">All companies</option>
                {FILTERABLE_COMPANIES.map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.displayName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <button
            type="submit"
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Filter
          </button>
          {(round !== "coding" || companyKey) && (
            <a
              href="/problems"
              className="text-xs text-muted underline-offset-2 hover:text-secondary hover:underline"
            >
              Clear
            </a>
          )}
        </form>
      </Section>

      {round === "coding" && <CodingList companyName={companyName} />}
      {round === "system_design" && <DesignList />}
      {round === "behavioral" && <BehavioralList companyName={companyName} />}
    </PageShell>
  );
}

function CodingList({ companyName }: { companyName: string }) {
  const items = companyName
    ? PROBLEMS.filter((p) => p.companies.includes(companyName))
    : PROBLEMS;

  return (
    <Section title={`${items.length} coding problem${items.length === 1 ? "" : "s"}`}>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-primary">{p.title}</h3>
                <Badge tone="outline">{p.pattern.replace(/-/g, " ")}</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{p.statement}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{p.example}</p>
              <TagRow tiers={p.tiers} companies={p.companies} />
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

function DesignList() {
  return (
    <Section title={`${DESIGN_PROMPTS.length} system design prompt${DESIGN_PROMPTS.length === 1 ? "" : "s"}`}>
      <div className="grid gap-3 md:grid-cols-2">
        {DESIGN_PROMPTS.map((d) => (
          <Card key={d.id} className="p-5">
            <h3 className="text-sm font-semibold text-primary">{d.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{d.statement}</p>
            <TagRow tiers={d.tiers} />
          </Card>
        ))}
      </div>
    </Section>
  );
}

function BehavioralList({ companyName }: { companyName: string }) {
  const items = companyName
    ? QUESTION_BANK.filter((q) => !q.companies || q.companies.includes(companyName))
    : QUESTION_BANK;

  return (
    <Section title={`${items.length} behavioral question${items.length === 1 ? "" : "s"}`}>
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((q, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-primary">{q.text}</p>
              </div>
              <div className="mt-2">
                <Badge tone="outline">{q.competency}</Badge>
              </div>
              <TagRow tiers={q.tiers} companies={q.companies} />
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

function TagRow({ tiers, companies }: { tiers?: string[]; companies?: string[] }) {
  if (!tiers?.length && !companies?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tiers?.map((t) => (
        <Badge key={t} tone="neutral">
          {TIER_LABEL[t] ?? t}
        </Badge>
      ))}
      {companies?.map((c) => (
        <Badge key={c} tone="neutral">
          {c}
        </Badge>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="py-12 text-center">
      <p className="text-sm font-medium text-primary">No problems match this filter</p>
      <p className="mt-1.5 text-sm text-secondary">Try a different company, or clear the filter.</p>
    </Card>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Field, PageShell, Section, Select } from "@/components/ui";
import {
  Card as ShadcnCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { Code2, Network, MessageCircle } from "lucide-react";
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
    <ListTable
      icon={Code2}
      title={`${items.length} coding problem${items.length === 1 ? "" : "s"}`}
      headers={["Problem", "Pattern", "Tiers", "Companies"]}
      rows={items.map((p) => [
        <TitleCell key="title" title={p.title} subtitle={p.statement} />,
        <Badge key="pattern" tone="outline">
          {p.pattern.replace(/-/g, " ")}
        </Badge>,
        <TagList key="tiers" values={p.tiers.map((t) => TIER_LABEL[t] ?? t)} />,
        <TagList key="companies" values={p.companies} />,
      ])}
    />
  );
}

function DesignList() {
  return (
    <ListTable
      icon={Network}
      title={`${DESIGN_PROMPTS.length} system design prompt${DESIGN_PROMPTS.length === 1 ? "" : "s"}`}
      headers={["Prompt", "Tiers"]}
      rows={DESIGN_PROMPTS.map((d) => [
        <TitleCell key="title" title={d.title} subtitle={d.statement} />,
        <TagList key="tiers" values={d.tiers.map((t) => TIER_LABEL[t] ?? t)} />,
      ])}
    />
  );
}

function BehavioralList({ companyName }: { companyName: string }) {
  const items = companyName
    ? QUESTION_BANK.filter((q) => !q.companies || q.companies.includes(companyName))
    : QUESTION_BANK;

  return (
    <ListTable
      icon={MessageCircle}
      title={`${items.length} behavioral question${items.length === 1 ? "" : "s"}`}
      headers={["Question", "Competency", "Tiers", "Companies"]}
      rows={items.map((q, i) => [
        <p
          key={`q-${i}`}
          className="max-w-md line-clamp-2 text-sm leading-relaxed text-foreground"
        >
          {q.text}
        </p>,
        <Badge key="competency" tone="outline">
          {q.competency}
        </Badge>,
        <TagList key="tiers" values={(q.tiers ?? []).map((t) => TIER_LABEL[t] ?? t)} />,
        <TagList key="companies" values={q.companies ?? []} />,
      ])}
    />
  );
}

/**
 * Same shell the dashboard uses for its Full loops / Sessions tables (one
 * Card, an icon + title header, a shadcn Table below with hairline row
 * dividers) -- rows are pre-rendered cell content rather than raw data, so
 * this one component serves all three round types despite each having a
 * different column shape.
 */
function ListTable({
  icon: Icon,
  title,
  headers,
  rows,
}: {
  icon: typeof Code2;
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <Section title={title}>
      <ShadcnCard className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-border py-4">
          <Icon size={16} className="text-foreground" />
          <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-primary">No problems match this filter</p>
              <p className="mt-1.5 text-sm text-secondary">
                Try a different company, or clear the filter.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {headers.map((h) => (
                    <TableHead key={h} className="px-4">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((cells, i) => (
                  <TableRow key={i}>
                    {cells.map((cell, j) => (
                      <TableCell key={j} className="px-4 align-top">
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </ShadcnCard>
    </Section>
  );
}

function TitleCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-md">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function TagList({ values }: { values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <Badge key={v} tone="neutral">
          {v}
        </Badge>
      ))}
    </div>
  );
}

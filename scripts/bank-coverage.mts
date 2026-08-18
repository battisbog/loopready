/**
 * Coverage report for all three question banks, so gaps are visible before a
 * candidate finds them.
 *
 *   npx tsx scripts/bank-coverage.mts
 */
const { PROBLEMS } = await import("../lib/coding/problems/index.ts");
const { QUESTION_BANK } = await import("../lib/interview/questions.ts");
const { DESIGN_PROMPTS } = await import("../lib/design/prompts.ts");

const PATTERNS = [
  "arrays-hashing", "two-pointers", "sliding-window", "stack", "binary-search",
  "linked-list", "trees", "tries", "heap", "backtracking", "graphs",
  "dynamic-programming", "intervals", "greedy",
] as const;
const COMPETENCIES = [
  "ownership", "conflict", "failure", "ambiguity", "influence", "pressure",
  "delivery", "leadership",
] as const;
const TIERS = ["junior", "mid", "senior"] as const;

const bar = (n: number, thin: number) =>
  (n === 0 ? "!!" : n < thin ? " ~" : "  ") + " " + "#".repeat(Math.min(n, 20));

console.log("\n=========================== CODING ===========================");
console.log(`${PROBLEMS.length} problems, ${PROBLEMS.reduce((a, p) => a + p.tests.length, 0)} test cases\n`);
console.log("  pattern                  n   jr  mid  sr");
for (const p of PATTERNS) {
  const items = PROBLEMS.filter((x) => x.pattern === p);
  const t = TIERS.map((tr) => items.filter((x) => x.tiers.includes(tr)).length);
  console.log(
    `  ${p.padEnd(22)} ${String(items.length).padStart(2)}  ` +
      t.map((n) => String(n).padStart(3)).join(" ") +
      "  " + bar(items.length, 3)
  );
}
console.log("\n  by tier (a problem may suit several):");
for (const tr of TIERS) {
  console.log(`    ${tr.padEnd(8)} ${PROBLEMS.filter((p) => p.tiers.includes(tr)).length}`);
}
const companies = new Map<string, number>();
for (const p of PROBLEMS) for (const c of p.companies) companies.set(c, (companies.get(c) ?? 0) + 1);
console.log("\n  by company tag:");
console.log("    " + [...companies].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", "));

console.log("\n========================= BEHAVIORAL =========================");
console.log(`${QUESTION_BANK.length} questions\n`);
console.log("  competency               n   any  mid+ sr");
for (const c of COMPETENCIES) {
  const items = QUESTION_BANK.filter((q) => q.competency === c);
  const any = items.filter((q) => !q.tiers).length;
  const midPlus = items.filter((q) => q.tiers?.includes("mid")).length;
  const sr = items.filter((q) => q.tiers?.includes("senior") && !q.tiers?.includes("mid")).length;
  console.log(
    `  ${c.padEnd(22)} ${String(items.length).padStart(2)}  ` +
      [any, midPlus, sr].map((n) => String(n).padStart(3)).join(" ") +
      "  " + bar(items.length, 4)
  );
}

console.log("\n======================== SYSTEM DESIGN =======================");
console.log(`${DESIGN_PROMPTS.length} prompts\n`);
for (const tr of TIERS) {
  const items = DESIGN_PROMPTS.filter((d) => d.tiers.includes(tr));
  console.log(`  ${tr.padEnd(10)} ${String(items.length).padStart(2)}  ${bar(items.length, 3)}`);
}
console.log("\n  prompts:");
for (const d of DESIGN_PROMPTS) {
  console.log(
    `    ${d.id.padEnd(22)} ${d.tiers.join("/").padEnd(16)} ${d.pressurePoints.length} pressure points`
  );
}

// ------------------------------------------------------------------- gaps
console.log("\n============================ GAPS ============================");
const gaps: string[] = [];
// These patterns do not appear at junior level in real loops, so an empty
// junior column is correct rather than a gap.
const NOT_JUNIOR = new Set(["heap", "backtracking", "graphs", "intervals", "tries"]);
for (const p of PATTERNS) {
  const items = PROBLEMS.filter((x) => x.pattern === p);
  if (items.length < 3) gaps.push(`coding/${p}: only ${items.length} problem(s)`);
  for (const tr of TIERS) {
    if (tr === "junior" && NOT_JUNIOR.has(p)) continue;
    if (!items.some((x) => x.tiers.includes(tr)))
      gaps.push(`coding/${p}: nothing at ${tr} tier`);
  }
}
for (const c of COMPETENCIES) {
  const n = QUESTION_BANK.filter((q) => q.competency === c).length;
  if (n < 4) gaps.push(`behavioral/${c}: only ${n} question(s)`);
}
for (const tr of TIERS) {
  const n = DESIGN_PROMPTS.filter((d) => d.tiers.includes(tr)).length;
  if (n < 3) gaps.push(`design/${tr}: only ${n} prompt(s)`);
}
const missingRubric = DESIGN_PROMPTS.filter((d) => !d.strongAnswerCovers || d.strongAnswerCovers.length < 120);
for (const d of missingRubric) gaps.push(`design/${d.id}: thin strongAnswerCovers`);

if (gaps.length === 0) console.log("  none");
else gaps.forEach((g) => console.log(`  - ${g}`));
console.log();

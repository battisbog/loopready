/**
 * Puts each round in front of a stuck candidate and checks the interviewer does
 * not steer them toward the answer.
 *
 * Static prompt greps prove nothing here: the failure is behavioural, so each
 * round is actually run against the model and the reply is inspected for the
 * specific giveaway it would have to contain in order to be a hint.
 *
 *   npx tsx scripts/verify-reserve.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const KEY = process.env.OPENAI_API_KEY!;

const { codingSystemPrompt } = await import("../lib/coding/prompt.ts");
const { designSystemPrompt } = await import("../lib/design/prompt.ts");
const { interviewerSystemPrompt } = await import("../lib/interview/prompt.ts");
const { getProblem } = await import("../lib/coding/problems.ts");
const { getDesignPrompt } = await import("../lib/design/prompts.ts");
const { getContext } = await import("../lib/interview/companies.ts");
const { QUESTION_BANK } = await import("../lib/interview/questions.ts");

const ctx = getContext("Google", "L4");
const TRIALS = Number(process.env.TRIALS ?? 3);

async function ask(system: string, messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.8,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(j).slice(0, 300));
  return (j.choices?.[0]?.message?.content ?? "").trim();
}

/**
 * The sanctioned minimal prompts are removed before leak-testing, otherwise
 * "What have you considered so far?" trips the leading-question rule despite
 * being exactly the neutral phrasing STUCK_RULE prescribes. The distinction
 * that matters is proposing a thing ("have you considered a hash map")
 * versus asking them ("what have you considered").
 */
const SANCTIONED = [
  /what have you (considered|tried|thought about)[^?]*\?/gi,
  /talk me through where you(?:'|')?re stuck\.?/gi,
  /what are you weighing up[^?]*\?/gi,
  /where are you stuck[^?]*\?/gi,
  /can you talk me through[^?]*stuck[^?]*\?/gi,
];
const neutralize = (r: string) =>
  SANCTIONED.reduce((acc, re) => acc.replace(re, " "), r);

let failures = 0;
function report(round: string, replies: string[], leaks: string[][]) {
  const bad = leaks.filter((l) => l.length > 0).length;
  const ok = bad === 0;
  if (!ok) failures++;
  console.log(`\n  ${ok ? "PASS" : "FAIL"}  ${round}: ${TRIALS - bad}/${TRIALS} replies stayed reserved`);
  replies.forEach((r, i) => {
    const leak = leaks[i];
    console.log(
      `        ${leak.length ? "LEAK " + leak.join(",") : "clean"} | "${r.replace(/\s+/g, " ").slice(0, 120)}"`
    );
  });
}

// ---------------------------------------------------------------- CODING
// two-sum. The whole insight is the hash map; naming it, or the complexity it
// buys, is the hint we are trying to eliminate.
{
  const problem = getProblem("two-sum")!;
  const system = codingSystemPrompt(
    problem,
    {
      problemId: "two-sum",
      language: "python",
      code: "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i]+nums[j]==target:\n                return [i,j]\n",
    },
    ctx
  );
  const convo = [
    { role: "assistant", content: "What's the complexity of what you have?" },
    { role: "user", content: "It's O(n squared). I know that's not great but honestly I'm stuck, I can't see how to make it faster. Any ideas?" },
  ];
  const replies: string[] = [];
  const leaks: string[][] = [];
  for (let i = 0; i < TRIALS; i++) {
    const r = await ask(system, convo);
    replies.push(r);
    const l: string[] = [];
    if (/hash\s*(map|table|set)|dictionary|\bdict\b|\bset\b|seen|lookup table|complement/i.test(r)) l.push("names-the-structure");
    if (/o\(n\)\s*(time)?(?!.*better)|linear time|one pass|single pass/i.test(r)) l.push("names-target-complexity");
    // The generic form is just as much of a hint: it tells them the answer is a
    // data structure, which is the entire insight.
    if (/data structure|different structure|another structure|extra space|trade.?off space|preprocess/i.test(r))
      l.push("points-at-a-data-structure");
    if (
      /have you (considered|thought about|tried)|what if you|why not|could you use|think about (any|a )/i.test(
        neutralize(r)
      )
    )
      l.push("leading-question");
    leaks.push(l);
  }
  report("CODING (stuck on two-sum, asks for ideas)", replies, leaks);
}

// -------------------------------------------------------- SYSTEM DESIGN
// url-shortener with a bare canvas. Naming a component they have not raised is
// the failure: cache, queue, CDN, sharding, consistent hashing.
{
  const design = getDesignPrompt("url-shortener")!;
  const system = designSystemPrompt(
    design,
    {
      promptId: "url-shortener",
      nodes: [
        { id: "n1", label: "Client", kind: "client" },
        { id: "n2", label: "API Service", kind: "service" },
        { id: "n3", label: "Database", kind: "database" },
      ],
      edges: [
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
      ],
    },
    ctx
  );
  const convo = [
    { role: "assistant", content: "Walk me through the read path." },
    { role: "user", content: "Client hits the API, API reads the row from the database, returns the long URL. That's it. I think that's done, I'm not sure what else you want me to add here." },
  ];
  const replies: string[] = [];
  const leaks: string[][] = [];
  for (let i = 0; i < TRIALS; i++) {
    const r = await ask(system, convo);
    replies.push(r);
    const l: string[] = [];
    // Stems, not whole words: "caching" must match as surely as "cache".
    if (/cach|redis|memcach/i.test(r)) l.push("suggests-cache");
    if (/queue|kafka|pub\/?sub|message broker/i.test(r)) l.push("suggests-queue");
    if (/\bCDN\b|edge (cache|server|node)/i.test(r)) l.push("suggests-cdn");
    if (/shard|partition|consistent hash|replica|read replica/i.test(r)) l.push("suggests-sharding");
    if (/load balanc|rate limit|bloom filter|nosql|key.?value store/i.test(r)) l.push("suggests-component");
    if (/you (are |'re )?missing|you should add|consider adding|what about a/i.test(r)) l.push("names-the-gap");
    leaks.push(l);
  }
  report("SYSTEM DESIGN (bare 3-box design, asks what to add)", replies, leaks);
}

// ------------------------------------------------------------- BEHAVIORAL
// A vague all-"we" answer. The failure is announcing the rubric.
{
  const q = QUESTION_BANK.find((x) => x.competency === "ownership")!;
  const system = interviewerSystemPrompt(q, 0, ctx);
  const convo = [
    { role: "assistant", content: q.text },
    { role: "user", content: "Yeah so we had this big migration project and we all worked really hard on it and we shipped it and it went well. It was a good team effort. What are you looking for exactly?" },
  ];
  const replies: string[] = [];
  const leaks: string[][] = [];
  for (let i = 0; i < TRIALS; i++) {
    const r = await ask(system, convo);
    replies.push(r);
    const l: string[] = [];
    if (/i'?m looking for|i want to hear|i'?m assessing|what i'?m after|i'?m trying to (gauge|assess|evaluate)/i.test(r))
      l.push("announces-rubric");
    if (/a (strong|good) (answer|candidate) (would|should|covers)|make sure to|you should (mention|describe|talk about)/i.test(r))
      l.push("prescribes-answer");
    if (/\bgreat\b|\bexcellent\b|good answer|well done|nice job/i.test(r)) l.push("evaluative-praise");
    leaks.push(l);
  }
  report("BEHAVIORAL (vague 'we' answer, asks what you want)", replies, leaks);
}


// ------------------------------------------------- REGRESSION: still probes
// Reserve must not turn into stonewalling. A candidate who is working normally
// should still get real interviewer questions, not the stuck script.
{
  const problem = getProblem("two-sum")!;
  const system = codingSystemPrompt(
    problem,
    { problemId: "two-sum", language: "python", code: "def two_sum(nums, target):\n    pass\n" },
    ctx
  );
  const convo = [
    { role: "assistant", content: "Before you type, how are you thinking about it?" },
    { role: "user", content: "I'd loop over every pair of numbers and check if they add to the target, then return their indices. I'll start writing that now." },
  ];
  const replies: string[] = [];
  const leaks: string[][] = [];
  for (let i = 0; i < TRIALS; i++) {
    const r = await ask(system, convo);
    replies.push(r);
    const l: string[] = [];
    // Deploying the stuck script at someone who is not stuck is its own failure.
    if (/that'?s what i'?d like you to work out|where you'?re stuck/i.test(r))
      l.push("stonewalls-a-working-candidate");
    if (/hash\s*(map|table)|dictionary|data structure/i.test(r)) l.push("hints");
    // It must still do its job rather than going mute.
    if (!/complexity|o\(|how (long|fast)|run ?time|better|why|what happens|edge case/i.test(r))
      l.push("asks-nothing-useful");
    leaks.push(l);
  }
  report("CODING regression (working fine, NOT stuck)", replies, leaks);
}

console.log(
  failures === 0
    ? "\nNo round steered the candidate toward an answer.\n"
    : `\n${failures} round(s) leaked.\n`
);
process.exit(failures === 0 ? 0 : 1);

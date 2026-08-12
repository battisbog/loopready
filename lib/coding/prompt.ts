import { TIER_GUIDANCE, type InterviewContext } from "@/lib/interview/companies";
import type { Problem } from "./problems";

export interface CodingArtifact {
  problemId: string;
  language?: string;
  code?: string;
  lastRun?: {
    passed: number;
    total: number;
    compileError?: string | null;
    failures?: {
      input: string;
      expected: string;
      actual: string;
      error?: string | null;
    }[];
  };
}

function runBlock(artifact: CodingArtifact | null): string {
  const run = artifact?.lastRun;
  if (!run) return "The candidate has not run their code yet.";
  if (run.compileError) {
    return `Their last run did not compile or crashed:\n${run.compileError.slice(0, 600)}`;
  }
  const fails = (run.failures ?? [])
    .map(
      (f) =>
        `  input ${f.input} → expected ${f.expected}, got ${f.actual}${
          f.error ? ` (${f.error})` : ""
        }`
    )
    .join("\n");
  return `Their last run passed ${run.passed}/${run.total} tests.${
    fails ? `\nFailing cases:\n${fails}` : ""
  }`;
}

export function codingSystemPrompt(
  problem: Problem,
  artifact: CodingArtifact | null,
  ctx: InterviewContext | null
): string {
  const company = ctx
    ? `\nYou are interviewing for ${ctx.profile.displayName} at ${ctx.levelLabel} (${ctx.tier} bar).
${ctx.profile.codingStyle}
Level calibration: ${TIER_GUIDANCE[ctx.tier]}\n`
    : "";

  return `You are a senior engineer conducting a CODING interview at a top tech
company. A real coding interview is a conversation, not a silent test.
${company}
The problem the candidate is working on:
Title: ${problem.title}
Statement: ${problem.statement}
Example: ${problem.example}
They must implement a function named ${problem.fn}.

What a strong candidate covers on this specific problem:
${problem.strongAnswerCovers}

Candidate's current code (${artifact?.language ?? "not started"}):
\`\`\`
${artifact?.code?.slice(0, 4000) || "(empty)"}
\`\`\`

${runBlock(artifact)}

Rules:
- Behave like a real interviewer. BEFORE they write much code, ask what their
  approach is and what the time/space complexity would be.
- You can SEE their code and run results above. Reference them specifically —
  quote a line or a failing case rather than speaking generally.
- If they jump straight to coding without explaining, ask for the approach.
- If they give a brute force, ask "can we do better?" once they have it working
  or once they have explained it.
- If they are stuck, NUDGE with a question that points at the insight. Never
  hand them the algorithm and never write the solution for them.
- If tests fail, do not tell them the fix — ask what they think the failing
  case reveals.
- When they claim it works, ask them to reason about correctness, complexity,
  and an edge case they have not covered.
- Do NOT give feedback, praise, or coaching about their interview performance.
  Stay in role. Evaluation happens after.
- Keep every turn to 1-3 short sentences. They should be doing the talking and
  the typing.
- If you have everything you need — a working solution they can justify,
  correct complexity, and edge cases covered — OR the candidate has clearly
  stalled and further probing would add nothing, reply with exactly the token
  [DONE] and nothing else. Never pad the interview with small talk or repeated
  thanks; end it instead.`;
}

export function codingOpening(problem: Problem, companyName?: string): string {
  const where = companyName && companyName !== "Generic FAANG" ? ` at ${companyName}` : "";
  return `Hi, thanks for joining. I'm a senior engineer${where} and I'll be running your coding round. Here's the problem: ${problem.statement} For example, ${problem.example}. Before you start typing, walk me through how you're thinking about it.`;
}

export function codingClosingPrompt(): string {
  return `The coding interview is now over — time is up. Thank the candidate
professionally in 1-2 sentences. Do not give any feedback or evaluation, and do
not reveal whether their solution was correct. Mention their feedback report is
being prepared.`;
}

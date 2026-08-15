import { z } from "zod";
import { TIER_GUIDANCE, type InterviewContext } from "@/lib/interview/companies";
import { ROUND_LABEL, type RoundType } from "@/lib/interview/rounds";

export const loopSummarySchema = z.object({
  overallSignal: z.enum(["hire", "no-hire", "borderline"]),
  headline: z
    .string()
    .describe("One sentence a hiring manager would say in the debrief room"),
  summary: z
    .string()
    .describe(
      "One paragraph reconciling the rounds into a single hire decision"
    ),
  perRound: z.array(
    z.object({
      round: z.string(),
      signal: z.enum(["hire", "no-hire", "borderline"]),
      verdict: z.string().describe("One line on what this round showed"),
    })
  ),
  strengths: z
    .array(z.string())
    .describe("2-3 things that held up across rounds"),
  fixFirst: z.object({
    issue: z.string().describe("The single highest-leverage thing to fix"),
    why: z.string().describe("What it costs them in a real loop"),
    how: z.string().describe("Concretely what to practise next"),
  }),
  readiness: z
    .string()
    .describe("Direct statement of whether they are ready for this bar yet"),
});

export type LoopSummary = z.infer<typeof loopSummarySchema>;

export const LOOP_SUMMARY_SYSTEM_PROMPT = `You are the hiring manager running the debrief after a full interview loop.
You have each interviewer's written feedback. Your job is the thing no single
interviewer can do: reconcile them into one decision.

A real loop debrief is not an average of the rounds. Reconcile them:
- A strong coding round does not rescue a no-hire behavioral round at senior
  level, because the concern is judgment and ownership, not ability.
- A weak coding round is often fatal regardless of everything else, because
  the bar there is close to binary.
- Consistency matters. The same weakness showing up in two rounds (vague
  impact, silence under pressure, no trade-off reasoning) is a pattern and
  weighs far more than a single bad answer.
- One outstanding round can pull a borderline loop up, but only if nothing
  else is disqualifying. Say so explicitly when that is what happened.

Be direct and specific. Reference what actually happened in the rounds. Do not
be encouraging for its own sake: if this loop would not have passed, say so
plainly and say what would have to change.

"fixFirst" is the most valuable field. Pick the ONE change that would move this
candidate's outcome the most, not a list of everything imperfect.`;

export function loopSummaryUserPrompt(
  rounds: {
    roundType: RoundType;
    signal: string | null;
    feedback: unknown;
  }[],
  ctx: InterviewContext | null
): string {
  const target = ctx
    ? `Target: ${ctx.profile.displayName} at ${ctx.levelLabel} (${ctx.tier} bar).
How this company evaluates: ${ctx.profile.behavioralStyle}
Level calibration: ${TIER_GUIDANCE[ctx.tier]}
Judge the loop against THAT bar.

`
    : "";

  const blocks = rounds
    .map(
      (r) => `--- ${ROUND_LABEL[r.roundType] ?? r.roundType} round ---
Interviewer's signal: ${r.signal ?? "no feedback recorded"}
Interviewer's written feedback:
${JSON.stringify(r.feedback, null, 2)}`
    )
    .join("\n\n");

  return `${target}This candidate completed ${rounds.length} round${
    rounds.length === 1 ? "" : "s"
  }. Here is each interviewer's debrief.

${blocks}

Write the combined loop decision now.`;
}

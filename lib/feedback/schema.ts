import { z } from "zod";

export const feedbackSchema = z.object({
  overallSignal: z.enum(["hire", "no-hire", "borderline"]),
  overallSummary: z
    .string()
    .describe("One direct paragraph, written like a debrief note"),
  perAnswer: z.array(
    z.object({
      question: z.string(),
      structure: z
        .string()
        .describe("Assessment of situation/action/result clarity"),
      impact: z.string().describe("Was impact concrete and quantified"),
      ownership: z
        .string()
        .describe("Did they own their individual contribution"),
      missing: z
        .string()
        .describe("What an interviewer wanted and did not hear"),
    })
  ),
  topIssues: z
    .array(z.string())
    .describe("Ranked, specific, 2-3 items"),
  rewrites: z.array(
    z.object({
      original: z.string().describe("Their weakest answer, summarized"),
      better: z
        .string()
        .describe("A concrete stronger version of the same story"),
    })
  ),
});

export type FeedbackReport = z.infer<typeof feedbackSchema>;

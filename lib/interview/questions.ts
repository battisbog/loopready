export type Competency =
  | "ownership"
  | "conflict"
  | "failure"
  | "ambiguity"
  | "influence"
  | "pressure";

export interface Question {
  competency: Competency;
  text: string;
}

// Milestone 1: hardcoded set. Milestone 5 replaces this with a randomized bank.
export const QUESTIONS: Question[] = [
  {
    competency: "ownership",
    text: "Tell me about a project or initiative you're most proud of. What was it, and what was your specific role in it?",
  },
  {
    competency: "conflict",
    text: "Tell me about a time you strongly disagreed with a teammate or your manager about a technical or product decision. What happened?",
  },
  {
    competency: "failure",
    text: "Tell me about a time something you were responsible for failed or went badly wrong. What did you do?",
  },
];

export const MAX_FOLLOWUPS = 2;

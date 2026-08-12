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

// Curated bank, tagged by competency. Each session picks 3 from different
// competencies, randomized (pickSessionQuestions below).
export const QUESTION_BANK: Question[] = [
  // ownership
  {
    competency: "ownership",
    text: "Tell me about a project or initiative you're most proud of. What was it, and what was your specific role in it?",
  },
  {
    competency: "ownership",
    text: "Tell me about a time you noticed a problem that wasn't technically your responsibility. What did you do?",
  },
  {
    competency: "ownership",
    text: "Describe a time you committed to a goal and then discovered it was much harder than you expected. What did you do?",
  },
  // conflict
  {
    competency: "conflict",
    text: "Tell me about a time you strongly disagreed with a teammate or your manager about a technical or product decision. What happened?",
  },
  {
    competency: "conflict",
    text: "Tell me about a time you had to work closely with someone whose working style clashed with yours.",
  },
  {
    competency: "conflict",
    text: "Describe a time you received harsh or unfair criticism of your work. How did you respond?",
  },
  // failure
  {
    competency: "failure",
    text: "Tell me about a time something you were responsible for failed or went badly wrong. What did you do?",
  },
  {
    competency: "failure",
    text: "Tell me about a significant mistake you made at work. How did you handle it?",
  },
  {
    competency: "failure",
    text: "Describe a decision you made that turned out to be wrong. When did you realize it, and what did you do next?",
  },
  // ambiguity
  {
    competency: "ambiguity",
    text: "Tell me about a time you had to make progress on a problem where the requirements were unclear or kept changing.",
  },
  {
    competency: "ambiguity",
    text: "Describe a time you had to make an important decision without enough data. How did you decide?",
  },
  {
    competency: "ambiguity",
    text: "Tell me about a time you were dropped into a project or codebase you knew nothing about and had to deliver.",
  },
  // influence
  {
    competency: "influence",
    text: "Tell me about a time you convinced a team or leadership to change direction. How did you do it?",
  },
  {
    competency: "influence",
    text: "Describe a time you had to get something done through people who didn't report to you.",
  },
  {
    competency: "influence",
    text: "Tell me about a time you pushed for a technical investment (refactor, tooling, testing) that others didn't initially value.",
  },
  // pressure
  {
    competency: "pressure",
    text: "Tell me about a time you had to deliver under a hard deadline that seemed unrealistic. What did you do?",
  },
  {
    competency: "pressure",
    text: "Describe the most stressful incident or outage you've handled. Walk me through what you did.",
  },
  {
    competency: "pressure",
    text: "Tell me about a time you had to juggle several competing priorities. How did you decide what to drop?",
  },
];

// What a real interviewer digs into per competency — injected into the
// interviewer prompt for the current question. Written from real loop
// experience: these are the probes the model tends to miss.
export const COMPETENCY_PROBES: Record<Competency, string[]> = {
  ownership: [
    "Separate what THEY did from what the team did — if the story stays at 'we', ask what would have happened if they were on vacation that month.",
    "Ask why THEY were the one to do it — was it assigned, or did they claim it?",
    "Probe for the boring follow-through: monitoring, docs, handoff — owners finish, contributors stop at the demo.",
  ],
  conflict: [
    "Get the other side's actual argument — candidates who can't steelman the opposing view never really engaged with it.",
    "Ask what data or evidence (not seniority or persistence) resolved the disagreement.",
    "Probe the relationship afterward — did they repair it, or just win?",
    "If the story ends 'and I was right', ask about a disagreement where they turned out to be wrong.",
  ],
  failure: [
    "Pin down the moment they KNEW it was failing and what they did in the next 24 hours — deflection hides here.",
    "Ask what the failure cost in real terms (money, time, users, trust).",
    "Probe whether the lesson changed their behavior on a LATER project — a lesson with no second story is a platitude.",
    "Watch for blame-shifting dressed as context ('the requirements changed') and ask what they personally could have done differently.",
  ],
  ambiguity: [
    "Ask what specific assumptions they wrote down and how they validated the riskiest one.",
    "Probe how they decided to START before the picture was complete — what was the smallest first step?",
    "Ask what they did when new information invalidated early work.",
  ],
  influence: [
    "Ask what the skeptics' strongest objection was and how they addressed it on its merits.",
    "Probe what they changed about their OWN proposal based on pushback — pure persistence isn't influence.",
    "Ask how they got the first ally.",
  ],
  pressure: [
    "Ask what they explicitly chose NOT to do — scope cuts are the real signal, heroics are not.",
    "Probe who they told about the risk and when — silent heroes are a red flag at FAANG.",
    "Ask what corners were cut and what the plan was to repay them.",
  ],
};

export const MAX_FOLLOWUPS = 2;

// Kept for old sessions created before per-session question sets existed.
export const QUESTIONS: Question[] = [
  QUESTION_BANK[0],
  QUESTION_BANK[3],
  QUESTION_BANK[6],
];

// Picks `count` questions from different competencies. When a company is
// configured, its emphasized competencies are drawn first (Amazon leans
// ownership/failure/conflict, Google ambiguity/conflict/influence, etc.) so
// two companies produce recognizably different interviews.
export function pickSessionQuestions(
  count = 3,
  emphasis: Competency[] = []
): Question[] {
  const byCompetency = new Map<Competency, Question[]>();
  for (const q of QUESTION_BANK) {
    byCompetency.set(q.competency, [...(byCompetency.get(q.competency) ?? []), q]);
  }
  const shuffled = (arr: Competency[]) => [...arr].sort(() => Math.random() - 0.5);
  const emphasized = shuffled(emphasis.filter((c) => byCompetency.has(c)));
  const rest = shuffled(
    [...byCompetency.keys()].filter((c) => !emphasized.includes(c))
  );
  return [...emphasized, ...rest].slice(0, count).map((c) => {
    const qs = byCompetency.get(c)!;
    return qs[Math.floor(Math.random() * qs.length)];
  });
}

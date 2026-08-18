/**
 * The behavioral question bank.
 *
 * Questions are grouped by competency. To add one, drop it into the right
 * competency block below; nothing else needs changing. Every question is a
 * standard, widely-published interview prompt phrased in our own words, and the
 * Amazon-style entries follow the publicly documented Leadership Principles
 * without reproducing any company's internal wording.
 *
 * `tiers` is optional. Leave it off for questions that work at any level; set
 * it when a question only makes sense for someone with scope (leading a team,
 * setting technical direction).
 */

export type Competency =
  | "ownership"
  | "conflict"
  | "failure"
  | "ambiguity"
  | "influence"
  | "pressure"
  | "delivery"
  | "leadership";

export type QuestionTier = "junior" | "mid" | "senior";

export interface Question {
  competency: Competency;
  text: string;
  /** Levels this question suits. Omitted means it works for everyone. */
  tiers?: QuestionTier[];
  /** Companies this style is commonly reported at. Free-form, for filtering. */
  companies?: string[];
}

export const QUESTION_BANK: Question[] = [
  // ─────────────────────────────────────────────────────── ownership
  {
    competency: "ownership",
    text: "Tell me about a project or initiative you're most proud of. What was it, and what was your specific role in it?",
  },
  {
    competency: "ownership",
    text: "Describe a time you saw a problem that was not yours to fix and fixed it anyway. Why did you step in?",
    companies: ["Amazon"],
  },
  {
    competency: "ownership",
    text: "Tell me about something you built or changed that is still in use after you moved on. What made it last?",
  },
  {
    competency: "ownership",
    text: "Describe a time you took on something well outside your job description. What happened to your existing work?",
    companies: ["Amazon"],
  },
  {
    competency: "ownership",
    text: "Tell me about a piece of work you inherited in bad shape. What did you do with it?",
  },
  {
    competency: "ownership",
    text: "Describe a time you pushed for a higher standard than the team was ready to accept. How did that land?",
    companies: ["Amazon"],
  },

  // ─────────────────────────────────────────────────────── conflict
  {
    competency: "conflict",
    text: "Tell me about a time you disagreed with a teammate on a technical decision. How did it get resolved?",
  },
  {
    competency: "conflict",
    text: "Describe a disagreement with your manager. What did you do?",
  },
  {
    competency: "conflict",
    text: "Tell me about a time you committed to a decision you had argued against. How did you handle it afterwards?",
    companies: ["Amazon"],
  },
  {
    competency: "conflict",
    text: "Describe working with someone difficult to work with. What specifically did you change about how you worked with them?",
  },
  {
    competency: "conflict",
    text: "Tell me about a time you had to give someone hard feedback. What did you say, and what happened next?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "conflict",
    text: "Describe a time two teams wanted incompatible things from you. How did you settle it?",
    tiers: ["mid", "senior"],
  },

  // ─────────────────────────────────────────────────────── failure
  {
    competency: "failure",
    text: "Tell me about a time something you were responsible for failed or went badly wrong. What did you do?",
  },
  {
    competency: "failure",
    text: "Describe a decision you made that turned out to be wrong. When did you realise it, and what did you do next?",
  },
  {
    competency: "failure",
    text: "Tell me about a deadline you missed. What caused it, and who found out first?",
  },
  {
    competency: "failure",
    text: "Describe the worst production incident you have been part of. What was your role in it and in the fix?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "failure",
    text: "Tell me about a time you received critical feedback that you initially thought was unfair. What did you do with it?",
  },
  {
    competency: "failure",
    text: "Describe something you shipped that you would build differently today. What changed your mind?",
  },

  // ─────────────────────────────────────────────────────── ambiguity
  {
    competency: "ambiguity",
    text: "Tell me about a time you had to make a decision without enough information. How did you decide?",
  },
  {
    competency: "ambiguity",
    text: "Describe a project where the requirements kept changing. How did you handle it?",
  },
  {
    competency: "ambiguity",
    text: "Tell me about a time you had to figure out what the actual problem was before you could solve it.",
    companies: ["Google"],
  },
  {
    competency: "ambiguity",
    text: "Describe a time you started work on something nobody had defined. Where did you begin?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "ambiguity",
    text: "Tell me about a time you dug into data to settle a question people were arguing about from intuition.",
    companies: ["Amazon", "Google"],
  },

  // ─────────────────────────────────────────────────────── influence
  {
    competency: "influence",
    text: "Tell me about a time you convinced a team or a leader to change direction. How did you do it?",
  },
  {
    competency: "influence",
    text: "Describe a time you had to get something done through people who did not report to you.",
    tiers: ["mid", "senior"],
  },
  {
    competency: "influence",
    text: "Tell me about an idea of yours that was rejected. What did you do afterwards?",
  },
  {
    competency: "influence",
    text: "Describe a time you changed your own mind because of someone else's argument. What convinced you?",
  },
  {
    competency: "influence",
    text: "Tell me about a time you had to explain something deeply technical to a non-technical audience who needed to act on it.",
  },

  // ─────────────────────────────────────────────────────── pressure
  {
    competency: "pressure",
    text: "Tell me about the most demanding period of work you have had. How did you get through it?",
  },
  {
    competency: "pressure",
    text: "Describe a time you had far more to do than time to do it. What did you drop?",
  },
  {
    competency: "pressure",
    text: "Tell me about a time you had to deliver with a constraint you could not change.",
  },
  {
    competency: "pressure",
    text: "Describe a time you were on call for something serious. Walk me through what you actually did.",
    tiers: ["mid", "senior"],
  },

  // ─────────────────────────────────────────────────────── delivery
  {
    competency: "delivery",
    text: "Tell me about a project you drove from an idea to something people actually used. What were the stages?",
  },
  {
    competency: "delivery",
    text: "Describe a time you cut scope to hit a date. How did you choose what to cut?",
    companies: ["Amazon", "Meta"],
  },
  {
    competency: "delivery",
    text: "Tell me about something you shipped fast. What did you trade away to move that quickly?",
    companies: ["Meta"],
  },
  {
    competency: "delivery",
    text: "Describe a time you chose the simpler solution over the more complete one. How did that decision age?",
  },
  {
    competency: "delivery",
    text: "Tell me about a long-running project that stalled. How did you get it moving again?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "delivery",
    text: "Describe how you knew a project of yours had succeeded. What did you measure?",
  },

  // ─────────────────────────────────────────────────────── leadership
  {
    competency: "leadership",
    text: "Tell me about a time you mentored someone. What did they struggle with, and what changed?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "leadership",
    text: "Describe a technical direction you set for a team. How did you get people behind it?",
    tiers: ["senior"],
  },
  {
    competency: "leadership",
    text: "Tell me about a time you had to lead through a decision you personally disagreed with.",
    tiers: ["senior"],
  },
  {
    competency: "leadership",
    text: "Describe a time you delegated something important. How did you decide who, and what did you do when it wobbled?",
    tiers: ["mid", "senior"],
  },
  {
    competency: "leadership",
    text: "Tell me about a time you had to raise the bar on quality across a team rather than just your own work.",
    tiers: ["senior"],
    companies: ["Amazon"],
  },
  {
    competency: "leadership",
    text: "Describe a time you had to make a call that was unpopular with your team. How did you handle the aftermath?",
    tiers: ["senior"],
  },
];

/**
 * Private angles the interviewer digs into per competency. These are never read
 * out to the candidate; see lib/interview/stance.ts.
 */
export const COMPETENCY_PROBES: Record<Competency, string[]> = {
  ownership: [
    'Push past "we" until you get a specific individual action with a verb attached.',
    "Ask what would have happened if they had not acted, which separates ownership from participation.",
    "Probe what it cost them: what they gave up or deprioritised to do it.",
  ],
  conflict: [
    "Ask what the other person's actual argument was; a candidate who cannot steelman it did not engage with it.",
    "Probe the resolution mechanism, not the outcome: escalation, data, prototype, or someone conceding.",
    "Ask what they would concede was right in the other position.",
  ],
  failure: [
    "Ask what they personally got wrong, not what the circumstances were.",
    "Probe the detection story: how long until anyone noticed, and who noticed.",
    "Ask what specifically changed afterwards, and whether it held.",
  ],
  ambiguity: [
    "Ask what the options actually were and what tipped the decision.",
    "Probe what information they went and got versus what they assumed.",
    "Ask what would have changed their mind at the time.",
  ],
  influence: [
    "Probe what they changed about their OWN proposal based on pushback; pure persistence is not influence.",
    "Ask how they got the first ally.",
    "Ask what the other side wanted and how they made the case in those terms.",
  ],
  pressure: [
    "Ask what they explicitly chose NOT to do; scope cuts are the real signal, heroics are not.",
    "Probe who they told about the risk and when; silent heroes are a red flag at this level.",
    "Ask what corners were cut and what the plan was to repay them.",
  ],
  delivery: [
    "Ask for the timeline with real dates or durations, not adjectives.",
    "Probe what they cut and who they had to convince to allow the cut.",
    "Ask how success was measured and who else agreed it was the right measure.",
  ],
  leadership: [
    "Separate what they did from what their team did; look for the multiplier, not the individual contribution.",
    "Probe a specific person and a specific change in that person's behaviour or output.",
    "Ask what they did when someone did not come along with the direction.",
  ],
};

export const MAX_FOLLOWUPS = 2;

// Kept for sessions created before per-session question sets existed.
export const QUESTIONS: Question[] = [
  QUESTION_BANK[0],
  QUESTION_BANK[6],
  QUESTION_BANK[12],
];

/**
 * Picks `count` questions from different competencies. When a company is
 * configured, its emphasised competencies are drawn first (Amazon leans
 * ownership/failure/delivery, Google ambiguity/conflict/influence, and so on)
 * so two companies produce recognisably different interviews.
 */
export function pickSessionQuestions(
  count = 3,
  emphasis: Competency[] = [],
  opts: { tier?: QuestionTier } = {}
): Question[] {
  const eligible = QUESTION_BANK.filter(
    (q) => !opts.tier || !q.tiers || q.tiers.includes(opts.tier)
  );
  const pool = eligible.length ? eligible : QUESTION_BANK;

  const byCompetency = new Map<Competency, Question[]>();
  for (const q of pool) {
    byCompetency.set(q.competency, [...(byCompetency.get(q.competency) ?? []), q]);
  }
  const shuffled = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  const emphasized = shuffled(emphasis.filter((c) => byCompetency.has(c)));
  const rest = shuffled(
    [...byCompetency.keys()].filter((c) => !emphasized.includes(c))
  );

  const out: Question[] = [];
  for (const c of [...emphasized, ...rest]) {
    if (out.length >= count) break;
    const qs = byCompetency.get(c);
    if (qs?.length) out.push(qs[Math.floor(Math.random() * qs.length)]);
  }
  // Only if the bank is too thin to fill `count` from distinct competencies.
  while (out.length < count && pool.length > out.length) {
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (!out.includes(q)) out.push(q);
  }
  return out.slice(0, count);
}

export function questionsByCompetency(): Record<Competency, Question[]> {
  const out = {} as Record<Competency, Question[]>;
  for (const q of QUESTION_BANK) (out[q.competency] ??= []).push(q);
  return out;
}

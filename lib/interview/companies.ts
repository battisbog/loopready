import type { Competency } from "./questions";
import type { RoundType } from "./rounds";

export type Tier = "junior" | "mid" | "senior";

export interface CompanyProfile {
  displayName: string;
  behavioralStyle: string;
  codingStyle: string;
  systemDesignStyle: string;
  // ladder key -> { label shown to user, internal difficulty tier }
  levels: Record<string, { label: string; tier: Tier }>;
  valuesList: string[];
  // competencies this company's behavioral round leans on hardest
  competencyEmphasis: Competency[];
}

export const TIER_GUIDANCE: Record<Tier, string> = {
  junior:
    "Expect solid execution on well-defined problems, honest ownership of their own tasks, and evidence of learning fast. Do not demand org-level impact, but do not accept pure classwork stories without real stakes either.",
  mid: "Expect independent end-to-end ownership of projects, decisions made without being told, cross-team collaboration, and measurable impact they can attribute to themselves. Coordination stories without personal decisions are below this bar.",
  senior:
    "Expect org-level or multi-team impact, navigating ambiguity without direction, influencing peers and leadership without authority, and raising the bar for others (mentoring, standards, mechanisms). A well-executed solo project is below this bar — probe for blast radius beyond their own work.",
};

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  amazon: {
    displayName: "Amazon",
    behavioralStyle:
      "Amazon interviews are structured around the Leadership Principles; every answer is silently scored against specific LPs. Adopt a Bar Raiser mindset: relentlessly probe for data ('how did you measure that?'), individual ownership ('I' not 'we' — ask what THEY did), customer impact framed in customer terms, and 'what did you learn' with evidence the lesson was applied later. Amazon interviewers dig for disconfirming evidence: if a story sounds clean, ask what went wrong or what they sacrificed. Follow-ups should name the underlying mechanism (a metric, a document, an escalation) rather than accepting narrative.",
    codingStyle:
      "Practical DSA focus. Values working code, clear communication of trade-offs, and correct complexity analysis over cleverness. Expects the candidate to consider operational concerns (what happens at scale, failure cases).",
    systemDesignStyle:
      "Scalability plus operational excellence: expect explicit discussion of failure modes, monitoring, degradation behavior, and cost. Hand-waving about 'just add a queue' gets probed for exactly how it fails.",
    levels: {
      sde1: { label: "SDE I (L4)", tier: "junior" },
      sde2: { label: "SDE II (L5)", tier: "mid" },
      sde3: { label: "SDE III / Senior (L6)", tier: "senior" },
    },
    valuesList: [
      "Customer Obsession",
      "Ownership",
      "Invent and Simplify",
      "Are Right, A Lot",
      "Learn and Be Curious",
      "Hire and Develop the Best",
      "Insist on the Highest Standards",
      "Think Big",
      "Bias for Action",
      "Frugality",
      "Earn Trust",
      "Dive Deep",
      "Have Backbone; Disagree and Commit",
      "Deliver Results",
    ],
    competencyEmphasis: ["ownership", "failure", "conflict"],
  },
  google: {
    displayName: "Google",
    behavioralStyle:
      "Google behavioral interviews score Googliness and General Cognitive Ability (GCA). Less rigid than Amazon's LPs: probe how the candidate structures ambiguous problems (do they clarify, decompose, weigh trade-offs out loud?), how they collaborate and disagree respectfully, intellectual humility (can they say 'I was wrong' and mean it?), and learning velocity. GCA probes present twists: 'what if the data had shown the opposite?' — test reasoning, not rehearsed stories. Comfort with ambiguity and helping others succeed matter more than heroic individual delivery.",
    codingStyle:
      "Algorithmic depth: clean code, precise complexity analysis, and follow-up optimizations expected. Interviewers push 'can we do better?' at least once and care how the candidate reasons toward the improvement.",
    systemDesignStyle:
      "Very-large-scale emphasis: data modeling, storage trade-offs, and what breaks at 100x. Expects numerate estimation (QPS, storage, fan-out) and clean articulation of consistency trade-offs.",
    levels: {
      l3: { label: "L3 (New Grad / Early)", tier: "junior" },
      l4: { label: "L4 (SWE)", tier: "mid" },
      l5: { label: "L5 (Senior SWE)", tier: "senior" },
    },
    valuesList: [
      "Googliness (collaboration, humility, conscientiousness)",
      "General Cognitive Ability (structured problem solving)",
      "Comfort with ambiguity",
      "Intellectual honesty",
      "Bias to help others succeed",
    ],
    competencyEmphasis: ["ambiguity", "conflict", "influence"],
  },
  meta: {
    displayName: "Meta",
    behavioralStyle:
      "Meta behavioral rounds ('Jedi' rounds) probe for moving fast, impact orientation, and directness. Dig into: did the candidate ship quickly and iterate, or polish in a vacuum? Do they measure impact in metrics that matter and kill their own work when data says so? Can they take and give blunt feedback? Meta values self-awareness about growth areas — probe 'what's the biggest piece of critical feedback you've received?' style angles and expect a real answer, not a strength-in-disguise.",
    codingStyle:
      "Speed matters: two problems in one round is common, so probe pace and pragmatism. Clean-enough working code beats perfect code that arrives late; expects strong hash/array/tree fundamentals.",
    systemDesignStyle:
      "Product-infra blend: news-feed-shaped problems, fan-out trade-offs, caching strategy, and moving fast at scale. Expects candidates to make a call quickly and defend it, adjusting when challenged.",
    levels: {
      e3: { label: "E3 (Early career)", tier: "junior" },
      e4: { label: "E4 (SWE)", tier: "mid" },
      e5: { label: "E5 (Senior)", tier: "senior" },
    },
    valuesList: [
      "Move Fast",
      "Focus on Long-Term Impact",
      "Build Awesome Things",
      "Be Direct and Respect Your Colleagues",
      "Meta, Metamates, Me",
      "Live in the Future",
    ],
    competencyEmphasis: ["pressure", "ownership", "conflict"],
  },
  microsoft: {
    displayName: "Microsoft",
    behavioralStyle:
      "Microsoft interviews center on growth mindset: probe how the candidate learns from failure, seeks feedback, and helps others succeed ('model, coach, care'). Collaboration across boundaries matters — ask how they worked with people who had different incentives. Expect honest 'learn-it-all over know-it-all' signal: a candidate who claims mastery without curiosity is a flag. Customer empathy and inclusive behavior get real weight.",
    codingStyle:
      "Practical and conversational: solid fundamentals, readable code, testing mindset. Interviewers often extend the problem stepwise and watch how the candidate adapts.",
    systemDesignStyle:
      "Enterprise-flavored: reliability, backward compatibility, security surface, and integration constraints alongside scale. Expects pragmatic trade-off discussion.",
    levels: {
      sde: { label: "SDE (59-60)", tier: "junior" },
      sde2: { label: "SDE II (61-62)", tier: "mid" },
      senior: { label: "Senior SDE (63-64)", tier: "senior" },
    },
    valuesList: [
      "Growth Mindset",
      "Customer Obsessed",
      "Diverse and Inclusive",
      "One Microsoft (collaboration)",
      "Making a Difference",
    ],
    competencyEmphasis: ["failure", "influence", "ambiguity"],
  },
  apple: {
    displayName: "Apple",
    behavioralStyle:
      "Apple interviews probe craft, standards, and secrecy-compatible collaboration. Dig into: obsession with quality (when did they refuse to ship something that was good enough for everyone else?), depth in their domain (Apple values deep experts over generalists), and direct debate — Apple culture argues hard about details. Probe for genuine care about the end-user experience, not shipped-feature counts. Cross-functional friction with design or hardware is a rich vein — ask how disputes with a non-engineering function got resolved.",
    codingStyle:
      "Depth over breadth: expects mastery in the candidate's core domain, attention to edge cases and memory/performance detail, and pride in code quality.",
    systemDesignStyle:
      "Client-heavy and quality-obsessed: on-device constraints, privacy by design, battery/performance budgets, and graceful degradation. Less commodity-web-scale, more end-to-end experience.",
    levels: {
      ict2: { label: "ICT2 (Early)", tier: "junior" },
      ict3: { label: "ICT3 (SWE)", tier: "mid" },
      ict4: { label: "ICT4 (Senior)", tier: "senior" },
    },
    valuesList: [
      "Excellence / craft",
      "Privacy as a human right",
      "Deep domain expertise",
      "Direct debate, then commitment",
      "User experience above all",
    ],
    competencyEmphasis: ["ownership", "conflict", "pressure"],
  },
  netflix: {
    displayName: "Netflix",
    behavioralStyle:
      "Netflix hires for the 'dream team': high performance with candor. Probe radical honesty — when did they give hard feedback to a peer or manager, and what exactly did they say? Freedom and responsibility: expect stories of acting with wide latitude and owning consequences without process cover. 'Sunshining' mistakes: Netflix expects people to broadcast their own errors — a candidate who hides or softens failure is a flag. Judgment under minimal process is the core signal; probe decisions made without approval and how they informed the company.",
    codingStyle:
      "Senior-skewed and pragmatic: real-world engineering judgment, operational awareness, and clear reasoning matter more than puzzle tricks.",
    systemDesignStyle:
      "Streaming-scale reliability: chaos-tolerance, regional failover, CDN strategy, and cost-aware trade-offs. Expects candidates to reason about graceful degradation as a first-class feature.",
    levels: {
      l4: { label: "L4 (SWE)", tier: "mid" },
      l5: { label: "L5 (Senior)", tier: "senior" },
      staff: { label: "Staff", tier: "senior" },
    },
    valuesList: [
      "Judgment",
      "Candor / radical honesty",
      "Freedom and Responsibility",
      "High performance (adequate performance gets a severance)",
      "Sunshining mistakes",
    ],
    competencyEmphasis: ["conflict", "failure", "ambiguity"],
  },
  generic: {
    displayName: "Generic FAANG",
    behavioralStyle:
      "A composite top-tier bar: probe individual ownership, measurable impact, honest failure handling, and influence without authority, the way a calibrated interviewer at any of the big five would.",
    codingStyle:
      "Standard DSA interview: communication of approach before code, correctness, complexity, edge cases.",
    systemDesignStyle:
      "Standard large-scale design: requirements, estimation, data model, bottlenecks, trade-offs.",
    levels: {
      junior: { label: "Junior (0-2 yrs)", tier: "junior" },
      mid: { label: "Mid-level (2-5 yrs)", tier: "mid" },
      senior: { label: "Senior (5+ yrs)", tier: "senior" },
    },
    valuesList: [
      "Ownership",
      "Impact",
      "Collaboration",
      "Dealing with ambiguity",
      "Raising the bar",
    ],
    competencyEmphasis: ["ownership", "conflict", "failure"],
  },
};

export interface LoopConfig {
  company: string;
  level: string;
  rounds: RoundType[];
}

export interface InterviewContext {
  profile: CompanyProfile;
  levelLabel: string;
  tier: Tier;
}

export function getContext(company: string, level: string): InterviewContext | null {
  const profile = COMPANY_PROFILES[company];
  if (!profile) return null;
  const lvl = profile.levels[level];
  if (!lvl) return null;
  return { profile, levelLabel: lvl.label, tier: lvl.tier };
}

"use client";

import { useState } from "react";

interface CompanyDemo {
  key: string;
  name: string;
  lens: string;
  probes: string[];
  scoredAgainst: string;
}

// Probes below reflect the guidance actually encoded in each company profile
// (lib/interview/companies.ts) — this is the same style the live interviewer uses.
const DEMOS: CompanyDemo[] = [
  {
    key: "amazon",
    name: "Amazon",
    lens: "Leadership Principles, Bar Raiser mindset",
    scoredAgainst: "Ownership · Dive Deep · Earn Trust · Deliver Results",
    probes: [
      "If you had been on vacation that month, what would have happened?",
      "How did you measure that? What was the number before and after?",
      "What did you sacrifice to hit that date, and what was the plan to repay it?",
      "Tell me about a time you were wrong about this.",
    ],
  },
  {
    key: "google",
    name: "Google",
    lens: "Googliness + General Cognitive Ability",
    scoredAgainst: "Structured problem solving · Collaboration · Intellectual humility",
    probes: [
      "What assumptions did you write down, and how did you validate the riskiest one?",
      "What if the data had shown the opposite? What would you have done?",
      "What did you change in your own plan based on their pushback?",
      "How did you get your first ally?",
    ],
  },
  {
    key: "meta",
    name: "Meta",
    lens: "Move fast, impact orientation, directness",
    scoredAgainst: "Move Fast · Long-Term Impact · Be Direct",
    probes: [
      "How quickly did you ship the first version, and what did you cut to get there?",
      "What metric did you move, and did you kill anything when the data disagreed?",
      "What is the hardest piece of feedback you have received?",
      "Who did you tell about the risk, and when?",
    ],
  },
  {
    key: "microsoft",
    name: "Microsoft",
    lens: "Growth mindset, collaboration across boundaries",
    scoredAgainst: "Growth Mindset · Customer Obsessed · One Microsoft",
    probes: [
      "What did you learn from that, and where did you apply it afterward?",
      "How did you work with a team whose incentives differed from yours?",
      "When did you last seek out feedback you did not want to hear?",
      "How did you help someone else succeed on this?",
    ],
  },
  {
    key: "apple",
    name: "Apple",
    lens: "Craft, depth, and direct debate",
    scoredAgainst: "Excellence · Depth of expertise · User experience",
    probes: [
      "When did you refuse to ship something everyone else thought was good enough?",
      "Take me deeper on that. Why did it behave that way?",
      "How did you resolve a dispute with design or hardware?",
      "What detail did you obsess over that nobody asked you to?",
    ],
  },
  {
    key: "netflix",
    name: "Netflix",
    lens: "Judgment and candor, minimal process",
    scoredAgainst: "Judgment · Candor · Freedom and Responsibility",
    probes: [
      "What hard feedback did you give a peer, and what exactly did you say?",
      "What did you decide without asking permission, and how did you inform people?",
      "How did you broadcast your own mistake?",
      "What would you do if nobody would review that decision?",
    ],
  },
];

export default function CompanyTabs() {
  const [active, setActive] = useState(0);
  const demo = DEMOS[active];

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Company interview styles"
        className="flex flex-wrap gap-2"
      >
        {DEMOS.map((d, i) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              active === i
                ? "border-accent bg-accent-muted text-accent"
                : "border-line text-secondary hover:border-line-strong hover:text-primary"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-primary">
            {demo.name} · {demo.lens}
          </h3>
          <span className="text-xs text-muted">
            Scored against: {demo.scoredAgainst}
          </span>
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted">
          Follow-ups your interviewer will actually ask
        </p>
        <ul className="mt-4 space-y-3">
          {demo.probes.map((p) => (
            <li
              key={p}
              className="rounded-lg border border-line bg-base/60 px-4 py-3 text-sm leading-relaxed text-secondary"
            >
              <span className="mr-2 text-accent">&rsaquo;</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

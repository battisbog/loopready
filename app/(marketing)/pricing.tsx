import Link from "next/link";
import { Button } from "@/components/ui";
import { PRICING } from "@/lib/pricing";

interface Tier {
  id: string;
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  cta: string;
  href: string;
  featured?: boolean;
  note?: string;
  features: { label: string }[];
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    tagline: "Try one short mock and see the feedback for yourself.",
    cta: "Start free",
    href: "/login",
    features: [
      { label: "One short behavioral mock" },
      { label: "A few practice questions" },
      { label: "Browser voice (basic quality)" },
      { label: "Full written debrief" },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    price: PRICING.voice.display,
    cadence: "/mo",
    tagline: "Unlimited practice across the whole loop, in a natural voice.",
    cta: "Get Voice",
    href: "/checkout?plan=voice",
    featured: true,
    features: [
      { label: "Unlimited voice mock interviews" },
      { label: "All rounds: behavioral, coding, system design" },
      { label: "Studio-quality interviewer voice" },
      { label: "Company and level calibration" },
      { label: "Full feedback on every round" },
      { label: "Session history and transcripts" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: PRICING.premium.display,
    cadence: "/mo",
    tagline: "Face-to-face practice for the real thing.",
    cta: "Join the waitlist",
    href: "/checkout?plan=premium",
    note: "Video avatar is still in development. You'll be first in line.",
    features: [
      { label: "Everything in Voice" },
      { label: "2 video-avatar mock interviews / month" },
      { label: "Face-to-face interview presence practice" },
      { label: "Priority access to new rounds" },
    ],
  },
];

const COMPARISON: {
  label: string;
  free: string | boolean;
  voice: string | boolean;
  premium: string | boolean;
}[] = [
  { label: "Behavioral round", free: "1 short mock", voice: "Unlimited", premium: "Unlimited" },
  { label: "Coding round (live editor + execution)", free: false, voice: true, premium: true },
  { label: "System design round (canvas)", free: false, voice: true, premium: true },
  { label: "Full loop, rounds back to back", free: false, voice: true, premium: true },
  { label: "Company + level calibration", free: "Generic only", voice: "All 6 companies", premium: "All 6 companies" },
  { label: "Interviewer voice quality", free: "Browser", voice: "Studio", premium: "Studio" },
  { label: "Written debrief", free: true, voice: true, premium: true },
  { label: "Session history", free: "Last session", voice: true, premium: true },
  { label: "Video-avatar interviews", free: false, voice: false, premium: "2 / month" },
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-secondary">
            One failed loop costs you a year of compounding. Practice is the
            cheapest part of the process.
          </p>
        </div>

        {/* Tier cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-lg border p-5 ${
                tier.featured
                  ? "border-accent-border bg-accent-muted"
                  : "border-line bg-surface"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-primary">
                {tier.name}
              </h3>
              <p className="mt-1 min-h-10 text-sm leading-relaxed text-secondary">
                {tier.tagline}
              </p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-primary">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-muted">{tier.cadence}</span>
                )}
              </p>

              <Button
                href={tier.href}
                variant={tier.featured ? "primary" : "secondary"}
                className="mt-6 w-full"
              >
                {tier.cta}
              </Button>

              <ul className="mt-7 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-start gap-2.5 text-sm text-secondary"
                  >
                    <span
                      className={`mt-0.5 shrink-0 ${
                        "text-accent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>

              {tier.note && (
                <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
                  {tier.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-16">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted">
            What each plan includes
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-4 pr-4 font-medium text-muted"> </th>
                  <th className="px-4 py-4 font-medium text-secondary">Free</th>
                  <th className="px-4 py-4 font-semibold text-accent">
                    Voice · {PRICING.voice.displayWithInterval}
                  </th>
                  <th className="px-4 py-4 font-medium text-secondary">
                    Premium · {PRICING.premium.displayWithInterval}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-line">
                    <td className="py-4 pr-4 text-secondary">{row.label}</td>
                    <Cell value={row.free} />
                    <Cell value={row.voice} accent />
                    <Cell value={row.premium} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="mt-20 grid gap-x-12 gap-y-8 md:grid-cols-2">
          <PriceFaq
            q="What am I actually paying for?"
            a="Interview quality. Every mock runs a real language model for the interviewer and a second pass for the debrief, plus speech-to-text and a studio voice. The subscription covers that so you can practise as often as you need without watching a meter."
          />
          <PriceFaq
            q="Can I cancel anytime?"
            a="Yes. Plans are month to month with no contract, and you keep access until the end of the period you've paid for."
          />
          <PriceFaq
            q="What does the Free plan actually get me?"
            a="One short behavioral mock with the full written debrief, using your browser's built-in voice. It's enough to judge whether the feedback is worth paying for. That's the point of it."
          />
          <PriceFaq
            q="Why is the interviewer voice better on paid plans?"
            a="Free uses your browser's built-in speech, which sounds robotic and breaks the illusion. Paid plans use a studio-quality voice and Whisper transcription, which is what makes it feel like a real conversation."
          />
          <PriceFaq
            q="How do video interviews work?"
            a="Premium includes video rounds with an on-screen interviewer who sees your code and your diagram and talks with you in real time. Each video round uses one credit, and voice rounds stay unlimited, so you can save video for the practice that matters most."
          />
          <PriceFaq
            q="Do you offer student or bulk pricing?"
            a="Not yet, but if you're organising practice for a bootcamp or a university group, get in touch and we'll work something out."
          />
        </div>
      </div>
    </section>
  );
}

function Cell({ value, accent }: { value: string | boolean; accent?: boolean }) {
  return (
    <td className="px-4 py-4">
      {value === true ? (
        <span className={accent ? "text-accent" : "text-secondary"}>✓</span>
      ) : value === false ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={accent ? "text-accent" : "text-secondary"}>
          {value}
        </span>
      )}
    </td>
  );
}

function PriceFaq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-base font-medium text-primary">{q}</p>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{a}</p>
    </div>
  );
}

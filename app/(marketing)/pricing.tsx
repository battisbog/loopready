import Link from "next/link";

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
  features: { label: string; soon?: boolean }[];
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
    price: "$19",
    cadence: "/mo",
    tagline: "Unlimited practice across the whole loop, in a natural voice.",
    cta: "Get Voice",
    href: "/signup?plan=voice",
    featured: true,
    features: [
      { label: "Unlimited voice mock interviews" },
      { label: "All rounds — behavioral, coding, system design" },
      { label: "Studio-quality interviewer voice" },
      { label: "Company and level calibration" },
      { label: "Full feedback on every round" },
      { label: "Session history and transcripts" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$69",
    cadence: "/mo",
    tagline: "Face-to-face practice for the real thing.",
    cta: "Join the waitlist",
    href: "/signup?plan=premium",
    note: "Video avatar is still in development — you'll be first in line.",
    features: [
      { label: "Everything in Voice" },
      { label: "2 video-avatar mock interviews / month", soon: true },
      { label: "Face-to-face interview presence practice", soon: true },
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
  { label: "Video-avatar interviews", free: false, voice: false, premium: "2 / month (soon)" },
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">
            One failed loop costs you a year of compounding. Practice is the
            cheapest part of the process.
          </p>
        </div>

        {/* Tier cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                tier.featured
                  ? "border-emerald-500/50 bg-emerald-500/[0.04]"
                  : "border-zinc-800 bg-zinc-900/30"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-zinc-950">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-zinc-100">
                {tier.name}
              </h3>
              <p className="mt-1 min-h-10 text-sm leading-relaxed text-zinc-400">
                {tier.tagline}
              </p>

              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-zinc-50">
                  {tier.price}
                </span>
                {tier.cadence && (
                  <span className="text-sm text-zinc-500">{tier.cadence}</span>
                )}
              </p>

              <Link
                href={tier.href}
                className={`mt-6 rounded-lg px-5 py-3 text-center text-sm font-semibold transition-colors ${
                  tier.featured
                    ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                    : "border border-zinc-700 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-7 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-start gap-2.5 text-sm text-zinc-300"
                  >
                    <span
                      className={`mt-0.5 shrink-0 ${
                        f.soon ? "text-zinc-600" : "text-emerald-400"
                      }`}
                    >
                      ✓
                    </span>
                    <span className={f.soon ? "text-zinc-500" : undefined}>
                      {f.label}
                      {f.soon && (
                        <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-400">
                          Coming soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.note && (
                <p className="mt-6 border-t border-zinc-800 pt-4 text-xs leading-relaxed text-zinc-500">
                  {tier.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-16">
          <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            What each plan includes
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="py-4 pr-4 font-medium text-zinc-500"> </th>
                  <th className="px-4 py-4 font-medium text-zinc-300">Free</th>
                  <th className="px-4 py-4 font-semibold text-emerald-400">
                    Voice · $19/mo
                  </th>
                  <th className="px-4 py-4 font-medium text-zinc-300">
                    Premium · $69/mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-900">
                    <td className="py-4 pr-4 text-zinc-300">{row.label}</td>
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
            a="One short behavioral mock with the full written debrief, using your browser's built-in voice. It's enough to judge whether the feedback is worth paying for — that's the point of it."
          />
          <PriceFaq
            q="Why is the interviewer voice better on paid plans?"
            a="Free uses your browser's built-in speech, which sounds robotic and breaks the illusion. Paid plans use a studio-quality voice and Whisper transcription, which is what makes it feel like a real conversation."
          />
          <PriceFaq
            q="When does the video avatar arrive?"
            a="It's in development and not available yet. Premium is priced for it, so we list it as coming soon rather than pretending it's live — if you subscribe now you get everything in Voice plus first access the moment avatars ship."
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
        <span className={accent ? "text-emerald-400" : "text-zinc-400"}>✓</span>
      ) : value === false ? (
        <span className="text-zinc-700">—</span>
      ) : (
        <span className={accent ? "text-emerald-300" : "text-zinc-400"}>
          {value}
        </span>
      )}
    </td>
  );
}

function PriceFaq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-base font-medium text-zinc-100">{q}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a}</p>
    </div>
  );
}

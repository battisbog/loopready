import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/shadcn/card";
import { PREMIUM_VIDEO_ALLOWANCE } from "@/lib/tiers";
import { PRICING } from "@/lib/pricing";
import { Reveal } from "./reveal";
import { cn } from "@/lib/cn";

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
      { label: "3 behavioral mocks a day" },
      { label: "Real-time voice conversation" },
      { label: "Full written debrief on every mock" },
      { label: "Behavioral round only" },
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
      { label: "Unlimited mock interviews, no daily cap" },
      { label: "All rounds: behavioral, coding, system design" },
      { label: "Full loops, rounds back to back" },
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
    cta: "Get Premium",
    href: "/checkout?plan=premium",
    note: "Video rounds use one credit each. Voice stays unlimited.",
    features: [
      { label: "Everything in Voice" },
      { label: `${PREMIUM_VIDEO_ALLOWANCE} video-avatar mock interviews / month` },
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
  { label: "Behavioral round", free: "3 a day", voice: "Unlimited", premium: "Unlimited" },
  { label: "Coding round (live editor + execution)", free: false, voice: true, premium: true },
  { label: "System design round (canvas)", free: false, voice: true, premium: true },
  { label: "Full loop, rounds back to back", free: false, voice: true, premium: true },
  { label: "Company + level calibration", free: "Generic only", voice: "All 6 companies", premium: "All 6 companies" },
  { label: "Real-time voice interviewer", free: true, voice: true, premium: true },
  { label: "Written debrief", free: true, voice: true, premium: true },
  { label: "Session history", free: "Last session", voice: true, premium: true },
  { label: "Video-avatar interviews", free: false, voice: false, premium: `${PREMIUM_VIDEO_ALLOWANCE} / month` },
];

/**
 * Resolves a tier card's call to action for who is actually looking at it.
 *
 * The Free card used to hardcode href="/login", which is auth-blind: a
 * signed-in visitor clicking "Start free" was sent back to a login page they
 * had already been through. The paid cards route through /checkout, which
 * handles auth itself, so only Free needed a destination that depends on the
 * viewer -- but none of the three showed which plan you are already on, so a
 * subscriber saw "Get Voice" as though they had never bought it.
 */
function callToAction(
  tier: Tier,
  signedIn: boolean,
  currentTier?: string
): { cta: string; href: string; current: boolean } {
  const current = signedIn && currentTier === tier.id;

  if (current) {
    // Billing is where you change or cancel something you already have.
    return { cta: "Your current plan", href: "/billing", current: true };
  }
  if (tier.id === "free") {
    return signedIn
      ? { cta: "Go to dashboard", href: "/dashboard", current: false }
      : { cta: tier.cta, href: tier.href, current: false };
  }
  // Paid tiers always point at checkout, signed in or not: /checkout is the
  // single place that requires an account, and it sends you back here after.
  return { cta: tier.cta, href: tier.href, current: false };
}

export default function Pricing({
  signedIn = false,
  currentTier,
}: {
  signedIn?: boolean;
  /** The viewer's tier, so their existing plan is marked as theirs. */
  currentTier?: string;
} = {}) {
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

        {/* Tier cards. Featured (Voice) gets real elevation -- a taller card
            via negative margin rather than scale, so its top and bottom
            edges don't fall out of alignment with its neighbours -- plus an
            accent glow, instead of just a tinted background doing all the
            work of saying "pick this one". */}
        {/* Default grid stretch (no items-start) is deliberate: it keeps
            Free and Premium the same height as each other. The featured
            card's negative margin then pokes it taller than that shared
            row height on both edges, rather than fighting the stretch. */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.id} delay={i * 0.08} className="h-full">
              <Card
                className={cn(
                  "relative h-full gap-5 py-6 transition-transform duration-200",
                  tier.featured
                    ? "border-accent-border bg-accent-muted shadow-[var(--shadow-accent)] lg:-my-3 lg:py-9"
                    : "hover:border-line-strong hover:-translate-y-0.5"
                )}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold whitespace-nowrap text-accent-fg">
                    Most popular
                  </span>
                )}

                <CardHeader className="gap-1.5">
                  <CardTitle className="text-lg text-primary">
                    {tier.name}
                  </CardTitle>
                  <CardDescription className="min-h-10 leading-relaxed">
                    {tier.tagline}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-6">
                  {/* Static, deliberately: a spring-physics count-up passes
                      through several wrong intermediate values before
                      settling (confirmed in a real browser -- still reading
                      "$18" and "$67" a full 1.5s after scrolling into view,
                      not landing on "$19"/"$69" for several seconds more).
                      That's fine for illustrative stats elsewhere on the
                      page; not for the number someone is about to pay. */}
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-primary">
                      {tier.price}
                    </span>
                    {tier.cadence && (
                      <span className="text-sm text-muted">{tier.cadence}</span>
                    )}
                  </p>

                  {(() => {
                    const action = callToAction(tier, signedIn, currentTier);
                    return (
                      <Button
                        href={action.href}
                        variant={
                          action.current
                            ? "secondary"
                            : tier.featured
                              ? "primary"
                              : "secondary"
                        }
                        className="w-full"
                      >
                        {action.cta}
                      </Button>
                    );
                  })()}

                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li
                        key={f.label}
                        className="flex items-start gap-2.5 text-sm text-secondary"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            tier.featured ? "text-accent" : "text-secondary"
                          )}
                        />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                {tier.note && (
                  <CardFooter className="border-t border-line pt-5 text-xs leading-relaxed text-muted">
                    {tier.note}
                  </CardFooter>
                )}
              </Card>
            </Reveal>
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
            a="Access and volume. Every mock runs a real language model for the interviewer and a second pass for the debrief, which costs money each time. Paying removes the daily cap and unlocks the coding and system design rounds, so you can practise the whole loop as often as you need without watching a meter."
          />
          <PriceFaq
            q="Can I cancel anytime?"
            a="Yes. Plans are month to month with no contract, and you keep access until the end of the period you've paid for."
          />
          <PriceFaq
            q="What does the Free plan actually get me?"
            a="Three behavioral mocks a day, in the same real-time voice the paid plans use, each with the full written debrief. It is enough to judge whether the feedback is worth paying for. That is the point of it."
          />
          <PriceFaq
            q="What is the difference between Free and Voice?"
            a="The interviewer is identical: the same voice, the same probing, the same debrief. Free is capped at three behavioral mocks a day. Voice removes that cap and adds the coding round with a live editor and the system design round with a canvas, so you can rehearse a full loop rather than one round."
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
          <p className="mt-10 text-center text-sm text-muted">
        Question we have not answered?{" "}
        <a
          href="mailto:support@loopready.io"
          className="text-secondary underline underline-offset-2 hover:text-primary"
        >
          support@loopready.io
        </a>
      </p>
    </section>
  );
}

function Cell({ value, accent }: { value: string | boolean; accent?: boolean }) {
  return (
    <td className="px-4 py-4">
      {value === true ? (
        <Check className={cn("h-4 w-4", accent ? "text-accent" : "text-secondary")} />
      ) : value === false ? (
        <Minus className="h-4 w-4 text-muted" />
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

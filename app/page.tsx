import Link from "next/link";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTier } from "@/lib/tiers";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import { PRICING } from "@/lib/pricing";
import CompanyTabs from "./(marketing)/company-tabs";
import Nav from "./(marketing)/nav";
import Pricing from "./(marketing)/pricing";
import DemoVideoModal from "./(marketing)/demo-video-modal";
import SessionMockup from "./(marketing)/session-mockup";
import DashboardMockup from "./(marketing)/dashboard-mockup";
import { Reveal } from "./(marketing)/reveal";
import ScrollCue from "./(marketing)/scroll-cue";
import HowItWorks from "./(marketing)/how-it-works";
import RoundsShowcase from "./(marketing)/rounds-showcase";

const COMPANIES = ["amazon", "google", "meta", "microsoft", "apple", "netflix"];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * Signed-in visitors see the marketing page too.
   *
   * This used to `redirect("/dashboard")` for anyone with a session, which is
   * the opposite of how every other SaaS behaves and quietly broke the upgrade
   * path: a signed-in user who opened loopready.io was teleported into the app
   * and could never reach the "Get Voice" button on this page at all. From the
   * outside that looks like the plan buttons skipping checkout.
   *
   * Nav already knew how to render for both states -- it takes `signedIn` and
   * swaps "Sign in" for "Dashboard" -- the landing page just never told it the
   * truth. The pricing CTAs point at /checkout either way, and /checkout is
   * what requires an account, which is the one place the requirement belongs.
   */
  const signedIn = Boolean(user);
  // So a subscriber sees "Your current plan" on the card they already pay for
  // rather than a buy button for something they own.
  const currentTier = user
    ? await getUserTier(createAdminClient(), user.id)
    : undefined;

  // "Start free" is meaningless to someone who already has an account, so the
  // primary CTA becomes the way back into the app for them.
  const ctaHref = signedIn ? "/dashboard" : "/pricing";
  const ctaLabel = signedIn ? "Go to dashboard" : "Start for free";

  return (
    <div className="flex min-h-screen flex-col">
      <Nav signedIn={signedIn} />

      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[70rem] -translate-x-1/2 rounded-full bg-accent-muted blur-[120px]"
        />
        {/* One viewport, one message. `svh` rather than `vh` because mobile
            browser chrome makes `100vh` taller than what is actually visible,
            which would push the scroll cue off the bottom of the very screen
            it exists to guide. 4rem is the sticky nav above it. */}
        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-12 pt-16 text-center">
          <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-hover" />
                Video interviews · Calibrated to company and level
              </span>

              {/* Scaled up now that nothing shares the viewport with it. */}
              <h1 className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Practice the interview.
                <br />
                <span className="text-accent">Not the questions.</span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-secondary sm:text-xl">
                Realistic AI interviews that push back, adapt to you, and tell
                you if you&rsquo;d pass.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button href={ctaHref} size="lg">
                  {ctaLabel}
                </Button>
                <DemoVideoModal ctaHref={ctaHref} ctaLabel={ctaLabel} />
              </div>

              <p className="mt-4 text-xs text-muted">
                {/* Sourced from PRICING, never typed as a literal: a hardcoded
                    price here would silently drift from what PayPal bills.
                    This line used to read "Free while in early access · No
                    credit card", which was a free claim sitting directly above
                    a section selling monthly plans. */}
                Free plan, no credit card · Paid from{" "}
                {PRICING.voice.displayWithInterval} · About 15 minutes
              </p>
            </div>

            {/* mt-auto pins this to the bottom of the viewport-height column
                rather than letting it float directly under the trust line,
                so it reads as "the page continues past here". */}
            <div className="mt-auto pt-12">
              <ScrollCue href="#product" />
            </div>
        </div>
      </header>

      {/* ---------- Product panel ----------
          Was the hero's right-hand column. Given its own section so the
          headline gets the first viewport uncontested, and so this arrives as
          a deliberate reveal instead of being half-read on load. */}
      <section id="product" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-5xl px-6 pb-20 pt-8 sm:pt-12">
          <figure>
            {/* Was a static next/image screenshot. Now a real component, so it
                is sharp at any size, themed from the same tokens as the
                product, and shows the actual `two-sum` problem from the bank
                rather than whatever was on screen the day the PNG was taken. */}
            <SessionMockup revealOnScroll />
            <figcaption className="mt-4 text-center text-xs text-muted">
              All three rounds are live today: behavioral, coding, and system
              design.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- Companies ---------- */}
      <section className="border-y border-line bg-base/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted">
            Calibrated to the bar at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {COMPANIES.map((key) => (
              <span
                key={key}
                className="text-lg font-medium text-muted transition-colors hover:text-secondary"
              >
                {COMPANY_PROFILES[key].displayName}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Problem ---------- */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Most people fail the loop for reasons nobody tells them.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-secondary">
            You said &ldquo;we&rdquo; when the interviewer needed
            &ldquo;I&rdquo;. Your impact was &ldquo;users were happy&rdquo;
            instead of a number. Your conflict story ended with you being right
            all along. Nobody in the debrief ever tells you that. You just get a rejection
            email six days later.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Card
            title="An interviewer that actually probes"
            body="It does not accept your first answer. If a story is vague, it asks what exactly you did, what would have happened if you hadn't, and how you measured it. These are the same follow-ups a bar raiser uses."
          />
          <Card
            title="Shaped to your target"
            body="An Amazon SDE III round scores your answers against the Leadership Principles at a senior bar. A Google L4 round probes Googliness and structured problem solving. The questions and the bar both change."
          />
          <Card
            title="A debrief, not a compliment"
            body="You get the notes a real interviewer writes after you leave the room: the signal they'd report, what was missing from each answer, and a rewritten version of your weakest story."
          />
        </div>
      </section>

      {/* ---------- Rounds ---------- */}
      <section id="rounds" className="border-t border-line bg-base/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              The whole loop, one engine.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-secondary">
              Run a single round, or the full loop back to back under one
              configuration, with the same company and level carried through every
              round.
            </p>
          </div>

          <RoundsShowcase />
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <HowItWorks />
      </section>

      {/* ---------- Calibration ---------- */}
      <section
        id="calibration"
        className="border-t border-line bg-base/60"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Calibrated to the exact structure of the company you&rsquo;re
              interviewing at.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-secondary">
              A generic tool asks &ldquo;tell me about a challenge.&rdquo;
              LoopReady interviews you the way your target actually does, and the
              level you pick changes the bar, not just the wording. Pick a
              company to see the difference — interviewing somewhere else? Pick
              Custom.
            </p>
          </div>
          <CompanyTabs />
        </div>
      </section>

      {/* ---------- Feedback sample ---------- */}
      <section id="feedback" className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            This is what the debrief looks like.
          </h2>
          <p className="mt-5 text-lg text-secondary">
            Real output from a session, not a mockup. Every point is tied to
            something the candidate actually said.
          </p>
        </div>

        {/* The dashboard is the differentiator made visible: not "you did a
            mock" but a graded record you can watch move. Coded, so the numbers
            below are props rather than pixels. */}
        <Reveal className="mt-10">
          <DashboardMockup
            interviews={12}
            completed={11}
            rounds={[
              { label: "Coding", value: 6 },
              { label: "System design", value: 3 },
              { label: "Behavioral", value: 3 },
            ]}
            signal="borderline"
            plan="Premium"
            history={[
              {
                company: "Amazon",
                level: "SDE III (L6)",
                round: "Behavioral",
                signal: "borderline",
                when: "2h ago",
              },
              {
                company: "Google",
                level: "L5",
                round: "System design",
                signal: "hire",
                when: "Yesterday",
              },
              {
                company: "Meta",
                level: "E4",
                round: "Coding",
                signal: "hire",
                when: "3 days ago",
              },
            ]}
          />
        </Reveal>

        <div className="mt-10 overflow-hidden rounded-lg border border-line bg-base">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-6 py-4">
            <span className="rounded-full border border-warn/30 bg-warn-muted px-3 py-1 text-xs font-semibold text-warn">
              BORDERLINE
            </span>
            <span className="text-sm text-muted">
              Amazon · SDE III (L6) · Behavioral
            </span>
          </div>

          <div className="space-y-6 p-5">
            <p className="leading-relaxed text-secondary">
              Borderline for Amazon SDE III/L6, with stronger-than-average
              behavioral structure but not enough senior-level scope. The
              candidate gave clean STAR answers, accepted personal
              responsibility, and improved materially when probed for data. The
              main ding is level calibration.
            </p>

            <div className="rounded-lg border border-line bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                What an interviewer wanted and did not hear
              </p>
              <p className="mt-2 leading-relaxed text-warn">
                A hire-level answer needed the manager&rsquo;s real argument for
                MongoDB, the evidence you brought, and what you conceded in your
                own position. The story made you look certain rather than
                data-driven.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  What you said
                </p>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  &ldquo;My manager wanted MongoDB but I thought Postgres was
                  better. We talked about it and eventually went with Postgres
                  and it worked out fine.&rdquo;
                </p>
              </div>
              <div className="rounded-lg border border-accent-border bg-accent-muted p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Stronger version
                </p>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  &ldquo;He proposed MongoDB because he expected event payloads
                  to change often. I built a one-day prototype on 5M events:
                  Mongo won on ingest, but our three reporting queries ran 2–3×
                  slower. I changed my own position to Postgres with JSONB, and he
                  accepted. p95 stayed under 400 ms all quarter.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Comparison ---------- */}
      <section className="border-t border-line bg-base/60">
        <div className="mx-auto w-full max-w-5xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Why not just practice with a chatbot?
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-secondary">
            Because reading your own polished summary back to a model is not the
            skill being tested.
          </p>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-4 pr-4 font-medium text-muted"> </th>
                  <th className="px-4 py-4 font-semibold text-accent">
                    LoopReady
                  </th>
                  <th className="px-4 py-4 font-medium text-secondary">
                    Chatbot prompt
                  </th>
                  <th className="px-4 py-4 font-medium text-secondary">
                    Friend mock
                  </th>
                </tr>
              </thead>
              <tbody className="text-secondary">
                <Row
                  label="You answer out loud"
                  a="yes"
                  b="no"
                  c="yes"
                />
                <Row
                  label="Follows up on vague answers"
                  a="yes"
                  b="rarely"
                  c="depends"
                />
                <Row
                  label="Knows your company's bar"
                  a="yes"
                  b="no"
                  c="unlikely"
                />
                <Row
                  label="Scales to your target level"
                  a="yes"
                  b="no"
                  c="no"
                />
                <Row label="Honest verdict" a="yes" b="flattering" c="polite" />
                <Row
                  label="Available at 11pm"
                  a="yes"
                  b="yes"
                  c="no"
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Pricing signedIn={signedIn} currentTier={currentTier} />

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-t border-line bg-base/60">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions
          </h2>
          <dl className="mt-10 divide-y divide-line">
            <Faq
              q="Do I have to speak out loud?"
              a="Yes, and that's the point. Reading a written answer is a different skill from telling the story under pressure. You tap a mic button, answer, and the interviewer replies in voice."
            />
            <Faq
              q="How is this different from asking ChatGPT how I did?"
              a="A chat model reads your polished summary and tells you it's good. LoopReady interviews you live, refuses to move on when you're vague, and grades the transcript against a specific company's bar at a specific level."
            />
            <Faq
              q="Which rounds are available today?"
              a="All three are live: behavioral by voice, coding with a real editor that runs your code against test cases in an isolated sandbox, and system design with an architecture canvas the interviewer reads and challenges."
            />
            <Faq
              q="How long does a session take?"
              a="About 12 to 18 minutes for three questions with follow-ups. You can end early at any point and still get a debrief on what you did answer."
            />
            <Faq
              q="Is my transcript private?"
              a="Your sessions are visible only to you. Interviews are stored so you can review past transcripts and feedback in your history."
            />
            <Faq
              q="Is LoopReady affiliated with these companies?"
              a="No. Company names are used to describe the interview style each is known for. LoopReady is independent and not endorsed by any of them."
            />
          </dl>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="relative overflow-hidden border-t border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-muted blur-[100px]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find out where you&rsquo;d get dinged.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-secondary">
            Fifteen minutes now beats a rejection email later.
          </p>
          <Button href={ctaHref} size="lg" className="mt-8">
            {ctaLabel}
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="max-w-xs">
              <span className="text-sm font-semibold">LoopReady</span>
              <p className="mt-2 text-sm text-muted">
                Voice mock interviews calibrated to what actually passes a FAANG
                loop.
              </p>
            </div>
            <div className="flex gap-12">
              <FooterCol
                title="Product"
                links={[
                  { href: "#how", label: "How it works" },
                  { href: "#rounds", label: "Rounds" },
                  { href: "#calibration", label: "Calibration" },
                  { href: "#feedback", label: "Feedback" },
                ]}
              />
              <FooterCol
                title="Get started"
                links={[
                  { href: "#pricing", label: "Pricing" },
                  { href: "/login", label: "Sign in" },
                  { href: "#faq", label: "FAQ" },
                ]}
              />
              <FooterCol
                title="Legal"
                links={[
                  { href: "/terms", label: "Terms" },
                  { href: "/privacy", label: "Privacy" },
                  {
                    href: "mailto:support@loopready.io",
                    label: "support@loopready.io",
                  },
                ]}
              />
            </div>
          </div>
          <div className="mt-10 border-t border-line pt-6">
            <p className="text-xs leading-relaxed text-muted">
              Not affiliated with, or endorsed by, Amazon, Google, Meta,
              Microsoft, Apple, or Netflix. Company names describe interview
              styles only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{body}</p>
    </div>
  );
}


function Row({
  label,
  a,
  b,
  c,
}: {
  label: string;
  a: string;
  b: string;
  c: string;
}) {
  const cell = (v: string, accent?: boolean) =>
    v === "yes" ? (
      <span className={accent ? "text-accent" : "text-secondary"}>✓</span>
    ) : v === "no" ? (
      <span className="text-muted">—</span>
    ) : (
      <span className="text-muted">{v}</span>
    );

  return (
    <tr className="border-b border-line">
      <td className="py-4 pr-4 text-secondary">{label}</td>
      <td className="px-4 py-4">{cell(a, true)}</td>
      <td className="px-4 py-4">{cell(b)}</td>
      <td className="px-4 py-4">{cell(c)}</td>
    </tr>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-6">
      <dt className="text-base font-medium text-primary">{q}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-secondary">{a}</dd>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => {
          const className =
            "text-sm text-secondary transition-colors hover:text-primary";
          // mailto and other non-route hrefs are plain anchors, not app routes.
          const external = !l.href.startsWith("/") && !l.href.startsWith("#");
          return (
            <li key={l.href + l.label}>
              {external ? (
                <a href={l.href} className={className}>
                  {l.label}
                </a>
              ) : (
                <Link href={l.href} className={className}>
                  {l.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

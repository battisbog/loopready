import Link from "next/link";
import { Button } from "@/components/ui";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import CompanyTabs from "./(marketing)/company-tabs";
import Nav from "./(marketing)/nav";
import Pricing from "./(marketing)/pricing";

const COMPANIES = ["amazon", "google", "meta", "microsoft", "apple", "netflix"];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users belong in the app, not the marketing pitch. Plans stay
  // reachable at /pricing.
  if (user) redirect("/dashboard");

  const ctaHref = "/login";
  const ctaLabel = "Start a free mock interview";

  return (
    <div className="flex min-h-screen flex-col">
      <Nav signedIn={false} />

      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[70rem] -translate-x-1/2 rounded-full bg-accent-muted blur-[120px]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-14">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-hover" />
                Voice interviews · Calibrated to company and level
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Pass your loop,
                <br />
                <span className="text-accent">not just your mock.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary">
                LoopReady runs a real interview out loud. The interviewer interrupts
                vague answers and digs until you give it something specific. Then it tells you, honestly, where you would have been
                dinged.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href={ctaHref} size="lg">
                  {ctaLabel}
                </Button>
                <Button href="#feedback" variant="secondary" size="lg">
                  See real feedback
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted">
                Free while in early access · No credit card · About 15 minutes
              </p>
            </div>

            <figure className="rise lg:-mr-4" style={{ animationDelay: "120ms" }}>
              <div className="overflow-hidden rounded-lg border border-line bg-base shadow-2xl shadow-[var(--shadow-lg)]">
                <div className="flex items-center gap-1.5 border-b border-line bg-surface px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
                  <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
                  <span className="h-2.5 w-2.5 rounded-full bg-elevated" />
                  <span className="ml-3 truncate font-mono text-[11px] text-muted">
                    loopready.io/session
                  </span>
                </div>
                <Image
                  src="/coding-round-preview.png"
                  alt="The LoopReady interview workspace: the interviewer panel on the left, a Python editor on the right, and a console showing test cases passing and failing."
                  width={1672}
                  height={941}
                  priority
                  quality={95}
                  className="h-auto w-full"
                  sizes="(max-width: 1024px) 100vw, 620px"
                />
              </div>
              <figcaption className="mt-3 text-center text-xs text-muted lg:text-left">
                All three rounds are live today: behavioral, coding, and system
                design.
              </figcaption>
            </figure>
          </div>
        </div>
      </header>

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

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <RoundCard
              status="live"
              title="Coding"
              body="A live editor the interviewer reads as you type, running your code against real test cases, with the same questions about approach and complexity you get on the day."
              points={[
                "Python and JavaScript",
                "Real execution against tests",
                "Probes approach before code",
              ]}
            />
            <RoundCard
              status="live"
              title="System design"
              body="An architecture canvas the interviewer can see and push back on, referencing your components by name and challenging hand-waving about scale."
              points={[
                "Drag-and-drop components",
                "Interviewer reads your diagram",
                "Pushes on bottlenecks and trade-offs",
              ]}
            />
            <RoundCard
              status="live"
              title="Behavioral"
              body="Three questions across different competencies, each with real follow-up probing. Answered by voice, graded against your target company's values."
              points={[
                "Voice in, voice out",
                "Up to two probes per question",
                "18-question bank across 6 competencies",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <Step
            n="01"
            title="Pick your target"
            body="Choose the company and the level you're actually interviewing for: Amazon SDE II, Google L5, Meta E4. The interview is built from that."
          />
          <Step
            n="02"
            title="Talk it through"
            body="Tap the mic and answer out loud, the way you will on the day. The interviewer listens, follows up, and pushes back when you're vague."
          />
          <Step
            n="03"
            title="Read the hard truth"
            body="Get a structured debrief in under a minute: hire / borderline / no-hire, per-answer breakdown, your top issues, and stronger rewrites."
          />
        </div>
      </section>

      {/* ---------- Calibration ---------- */}
      <section
        id="calibration"
        className="border-t border-line bg-base/60"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Six companies. Six different interviews.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-secondary">
              A generic tool asks &ldquo;tell me about a challenge.&rdquo;
              LoopReady interviews you the way your target actually does, and the
              level you pick changes the bar, not just the wording. Pick a
              company to see the difference.
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

      <Pricing />

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
                  { href: "mailto:support@loopready.io", label: "Contact" },
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

function RoundCard({
  status,
  title,
  body,
  points,
}: {
  status: "live" | "soon";
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        status === "live"
          ? "border-accent-border bg-accent-muted"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            status === "live"
              ? "bg-accent-muted text-accent"
              : "bg-elevated text-secondary"
          }`}
        >
          {status === "live" ? "Live" : "In development"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{body}</p>
      <ul className="mt-5 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-secondary">
            <span
              className={
                status === "live" ? "mt-0.5 text-accent" : "mt-0.5 text-muted"
              }
            >
              ✓
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <span className="font-mono text-sm text-accent">{n}</span>
      <h3 className="mt-3 text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{body}</p>
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

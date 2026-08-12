import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_PROFILES } from "@/lib/interview/companies";
import TranscriptDemo from "./(marketing)/transcript-demo";

const COMPANIES = ["amazon", "google", "meta", "microsoft", "apple", "netflix"];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/start" : "/login";
  const ctaLabel = user ? "Start an interview" : "Start a free mock interview";

  return (
    <div className="flex min-h-screen flex-col">
      <Nav signedIn={Boolean(user)} />

      {/* ---------- Hero ---------- */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[70rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div className="rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Voice interviews · Calibrated to company and level
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Fail your mock,
                <br />
                <span className="text-emerald-400">not your loop.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
                LoopReady runs a real behavioral interview out loud — an
                interviewer that interrupts vague answers and digs until you
                give it something specific. Then it tells you, honestly, where
                you would have been dinged.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
                >
                  {ctaLabel}
                </Link>
                <Link
                  href="#feedback"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-800 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  See real feedback
                </Link>
              </div>

              <p className="mt-4 text-xs text-zinc-600">
                No credit card. Takes about 15 minutes.
              </p>
            </div>

            <div className="rise" style={{ animationDelay: "120ms" }}>
              <TranscriptDemo />
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Companies ---------- */}
      <section className="border-y border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-600">
            Calibrated to the bar at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {COMPANIES.map((key) => (
              <span
                key={key}
                className="text-lg font-medium text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {COMPANY_PROFILES[key].displayName}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- The problem ---------- */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Most people fail the loop for reasons nobody tells them.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-zinc-400">
            You said &ldquo;we&rdquo; when the interviewer needed
            &ldquo;I&rdquo;. Your impact was &ldquo;users were happy&rdquo;
            instead of a number. Your conflict story ended with you being right
            all along. Nobody in the debrief ever tells you that — you just get
            a rejection email six days later.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Card
            title="An interviewer that actually probes"
            body="It does not accept your first answer. If a story is vague, it asks what exactly you did, what would have happened if you hadn't, and how you measured it — the same follow-ups a bar raiser uses."
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

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-t border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <Step
              n="01"
              title="Pick your target"
              body="Choose the company and the level you're actually interviewing for — Amazon SDE II, Google L5, Meta E4. The interview is built from that."
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
        </div>
      </section>

      {/* ---------- Feedback sample ---------- */}
      <section id="feedback" className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            This is what the debrief looks like.
          </h2>
          <p className="mt-5 text-lg text-zinc-400">
            Real output from a session — not a mockup. Every point is tied to
            something the candidate actually said.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
              BORDERLINE
            </span>
            <span className="text-sm text-zinc-500">
              Amazon · SDE III (L6) · Behavioral
            </span>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <p className="leading-relaxed text-zinc-300">
              Borderline for Amazon SDE III/L6, with stronger-than-average
              behavioral structure but not enough senior-level scope. The
              candidate gave clean STAR answers, accepted personal
              responsibility, and improved materially when probed for data. The
              main ding is level calibration.
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                What an interviewer wanted and did not hear
              </p>
              <p className="mt-2 leading-relaxed text-amber-300/90">
                A hire-level answer needed the manager&rsquo;s real argument for
                MongoDB, the evidence you brought, and what you conceded in your
                own position. The story made you look certain rather than
                data-driven.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  What you said
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  &ldquo;My manager wanted MongoDB but I thought Postgres was
                  better. We talked about it and eventually went with Postgres
                  and it worked out fine.&rdquo;
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-500">
                  Stronger version
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  &ldquo;He proposed MongoDB because he expected event payloads
                  to change often. I built a one-day prototype on 5M events: Mongo
                  won on ingest, but our three reporting queries ran 2–3× slower.
                  I changed my own position — Postgres with JSONB — and he
                  accepted. p95 stayed under 400 ms all quarter.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-zinc-900 bg-zinc-950/60">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions
          </h2>
          <dl className="mt-10 divide-y divide-zinc-900">
            <Faq
              q="Do I have to speak out loud?"
              a="Yes, and that's the point — reading a written answer is a different skill from telling the story under pressure. You tap a mic button, answer, and the interviewer replies in voice."
            />
            <Faq
              q="How is this different from asking ChatGPT how I did?"
              a="A chat model reads your polished summary and tells you it's good. LoopReady interviews you live, refuses to move on when you're vague, and grades the transcript against a specific company's bar at a specific level."
            />
            <Faq
              q="Which rounds are available?"
              a="The behavioral round is live today. Coding (live editor with real execution) and system design (architecture canvas the interviewer can read) are in active development on the same engine."
            />
            <Faq
              q="What does it cost?"
              a="Nothing right now. LoopReady is in early access while the interview quality is being tuned with real candidates."
            />
          </dl>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="relative overflow-hidden border-t border-zinc-900">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px]"
        />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find out where you&rsquo;d get dinged.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
            Fifteen minutes now beats a rejection email later.
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <span className="text-sm font-medium text-zinc-400">LoopReady</span>
          <span className="text-xs text-zinc-600">
            Not affiliated with, or endorsed by, any company named on this page.
          </span>
        </div>
      </footer>
    </div>
  );
}

function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          LoopReady
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#how"
            className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block"
          >
            How it works
          </Link>
          <Link
            href="#feedback"
            className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block"
          >
            Feedback
          </Link>
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 transition-colors hover:border-zinc-700">
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <span className="font-mono text-sm text-emerald-500">{n}</span>
      <h3 className="mt-3 text-lg font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-6">
      <dt className="text-base font-medium text-zinc-100">{q}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-zinc-400">{a}</dd>
    </div>
  );
}

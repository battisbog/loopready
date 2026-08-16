import LegalLayout, { Clause } from "../legal-layout";

export const metadata = {
  title: "Privacy Policy",
  description: "What LoopReady collects, why, and who it is shared with.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="16 August 2026">
      <Clause heading="1. Who we are">
        <p>
          LoopReady provides AI mock interview practice. This policy explains
          what we collect, why we collect it, who processes it, and the control
          you have. Contact:{" "}
          <span className="text-primary">privacy@loopready.app</span>.
        </p>
      </Clause>

      <Clause heading="2. What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-primary">Account:</strong> email address,
            and a hashed password if you set one. If you sign in with Google or
            GitHub we receive your email and basic profile, never your password.
          </li>
          <li>
            <strong className="text-primary">Interview content:</strong>{" "}
            transcripts of what you say, code you write, diagrams you draw, and
            the feedback generated for you.
          </li>
          <li>
            <strong className="text-primary">Audio:</strong> your microphone
            audio is streamed for transcription during a session. We do not
            store audio recordings; we store the resulting text.
          </li>
          <li>
            <strong className="text-primary">Billing:</strong> your plan, status
            and PayPal subscription or order identifiers. We never see or store
            your card details.
          </li>
          <li>
            <strong className="text-primary">Technical:</strong> IP address and
            request counts, used for rate limiting and abuse prevention.
          </li>
        </ul>
      </Clause>

      <Clause heading="3. Why we use it">
        <p>
          To run interviews and produce feedback, to keep your history, to take
          payment, to enforce fair usage and prevent abuse, and to fix problems.
          We do not sell your data, we do not advertise to you, and we do not use
          your interview content to train our own models.
        </p>
      </Clause>

      <Clause heading="4. Who processes it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-primary">OpenAI</strong> — conducts the
            interview, transcribes speech and generates feedback. Content is
            sent through their API and, under their API terms, is not used to
            train their models.
          </li>
          <li>
            <strong className="text-primary">ElevenLabs</strong> — converts
            interviewer text to speech when the higher-quality voice is enabled.
          </li>
          <li>
            <strong className="text-primary">Supabase</strong> — stores your
            account and interview data.
          </li>
          <li>
            <strong className="text-primary">Vercel</strong> — hosts the app and
            runs your code in isolated, short-lived sandboxes.
          </li>
          <li>
            <strong className="text-primary">Upstash</strong> — rate limiting
            counters keyed to your account and IP.
          </li>
          <li>
            <strong className="text-primary">PayPal</strong> — takes payment and
            holds your payment details directly.
          </li>
        </ul>
        <p>
          These providers process data on our instructions. Some are located
          outside your country, including the United States.
        </p>
      </Clause>

      <Clause heading="5. How long we keep it">
        <p>
          Interview transcripts and feedback are kept until you delete them or
          close your account, so you can review past sessions. Rate limit
          counters expire within days. Billing records are kept as long as
          required for tax and accounting.
        </p>
      </Clause>

      <Clause heading="6. Your rights">
        <p>
          You can access and correct your details in Settings, and delete your
          account at any time. Deleting your account permanently removes your
          login, sessions, transcripts, feedback, loops, credits and profile,
          and cancels any active subscription. This cannot be undone.
        </p>
        <p>
          Depending on where you live you may also have rights to export your
          data, object to processing, or complain to a data protection
          authority. Email us and we will help.
        </p>
      </Clause>

      <Clause heading="7. Security">
        <p>
          Data is encrypted in transit. Database access is restricted per user
          by row-level security, so one account cannot read another&rsquo;s
          data. Code you write runs in an isolated sandbox that is destroyed
          after each run. No system is perfectly secure, and we will notify
          affected users promptly if a breach occurs.
        </p>
      </Clause>

      <Clause heading="8. Children">
        <p>
          LoopReady is not intended for anyone under 16. If we learn we have
          collected data from a child under 16 we will delete it.
        </p>
      </Clause>

      <Clause heading="9. Changes">
        <p>
          We will post material changes here and notify you by email before they
          take effect.
        </p>
      </Clause>
    </LegalLayout>
  );
}

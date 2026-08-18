import LegalLayout, { Clause } from "../legal-layout";

export const metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of LoopReady.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="16 August 2026">
      <Clause heading="1. What LoopReady is">
        <p>
          LoopReady provides AI-generated mock interview practice and written
          feedback. It is a practice tool. It is not a recruiter, not an
          employer, and not affiliated with any company whose interview style it
          references. Nothing in the service is a job offer, a guarantee of an
          interview, or a prediction of a real hiring outcome.
        </p>
      </Clause>

      <Clause heading="2. Your account">
        <p>
          You must be at least 16 years old and provide accurate details. You are
          responsible for keeping your login secure and for activity under your
          account. Tell us promptly if you believe it has been compromised. One
          person per account; do not share logins.
        </p>
      </Clause>

      <Clause heading="3. Plans, payment and refunds">
        <p>
          Paid plans are billed in advance through PayPal on a recurring monthly
          basis until cancelled. Video interview credits are granted per billing
          cycle and do not roll over. One-time credit packs remain until used.
        </p>
        <p>
          You can cancel at any time from the Billing page; access continues to
          the end of the period you have paid for. We do not provide pro-rata
          refunds for partial periods, but if the service materially fails to
          work, contact us and we will put it right. Prices may change with at
          least 30 days&rsquo; notice before your next renewal.
        </p>
      </Clause>

      <Clause heading="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>share, resell or redistribute the service or its output commercially;</li>
          <li>
            use automated means to create accounts, or otherwise attempt to
            bypass usage limits;
          </li>
          <li>
            submit code intended to attack, escape or overload the sandboxed
            execution environment;
          </li>
          <li>
            upload unlawful content, or personal data about others without their
            consent;
          </li>
          <li>attempt to reverse engineer or extract the underlying prompts and models.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that breach these terms, and will
          tell you why unless legally prevented.
        </p>
      </Clause>

      <Clause heading="5. AI-generated content">
        <p>
          Interview questions, follow-ups and feedback are produced by AI models
          and may be wrong, inconsistent or unfair. Ratings such as
          &ldquo;hire&rdquo; or &ldquo;no-hire&rdquo; are simulated practice
          signals, not real assessments of your ability or employability. Use
          your judgement and do not rely on the output as career advice.
        </p>
      </Clause>

      <Clause heading="6. Your content">
        <p>
          You keep ownership of what you say, write and draw during interviews.
          You grant us a limited licence to process it in order to run the
          service and produce your feedback. We do not sell your content, and we
          do not use your interview recordings or transcripts to train our own
          models.
        </p>
      </Clause>

      <Clause heading="7. Third-party services">
        <p>
          The service depends on third parties including OpenAI (language and
          speech), ElevenLabs (speech), Supabase (database and authentication),
          Vercel (hosting and sandboxed code execution) and PayPal (payments).
          Their availability is outside our control, and content you submit is
          processed by them as described in our Privacy Policy.
        </p>
      </Clause>

      <Clause heading="8. Availability">
        <p>
          The service is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. It is offered in early access and may change,
          break or be interrupted. We do not promise a specific uptime level.
        </p>
      </Clause>

      <Clause heading="9. Liability">
        <p>
          To the extent permitted by law, we are not liable for indirect or
          consequential loss, including lost job opportunities, offers or
          earnings. Our total liability in any 12-month period is limited to the
          amount you paid us in that period. Nothing here limits liability that
          cannot lawfully be limited.
        </p>
      </Clause>

      <Clause heading="10. Changes and contact">
        <p>
          We may update these terms; material changes will be notified by email
          or in the app before they take effect. Questions go to{" "}
          <a
            href="mailto:support@loopready.io"
            className="text-primary underline underline-offset-2"
          >
            support@loopready.io
          </a>
          .
        </p>
      </Clause>
    </LegalLayout>
  );
}

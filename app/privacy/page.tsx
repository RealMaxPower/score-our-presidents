import Link from "next/link";
import { SITE_NAME } from "@/lib/site-config";

export const metadata = {
  title: `Privacy · ${SITE_NAME}`,
  description:
    "What we collect, what we don't, and how we handle the few things we do.",
};

const LAST_UPDATED = "2026-05-17";

export default function PrivacyPage() {
  return (
    <article>
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
      </nav>

      <section className="text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 border border-rust-700/70 text-rust-700 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
          <span aria-hidden>§</span> Privacy
        </span>
        <h1 className="font-display font-bold text-4xl sm:text-6xl mt-7 leading-[1.05] tracking-tight">
          Privacy Policy
        </h1>
        <div className="rust-rule" />
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Last updated · {LAST_UPDATED}
        </p>
        <p className="drop-cap mt-10 text-lg leading-relaxed text-charcoal-700 text-left">
          Score Our Presidents (the Presidential Scoring Framework) is an
          independent, non-commercial research project. The short version: anonymous visitors give us
          nothing; signed-in users give us only what is required to remember
          their saved weights; and we sell nothing to anyone. The long version
          is below.
        </p>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          What We Collect
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Anonymous browsing.</strong> If you read rankings, switch
          lenses, or page through scorecards without signing in, we do not
          collect personally identifiable information. We use Vercel
          Analytics, a privacy-respecting service that records aggregate
          page views and referrers without cookies and without any
          personal data.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Authenticated accounts.</strong> If you sign in with Google
          OAuth or an email magic link, we store: your email address, your
          display name and avatar URL if provided by the OAuth provider, your
          account creation timestamp, and any data you choose to save —
          category weight vectors, bookmarks, and notification subscriptions.
          Authentication is handled by NextAuth.js; we never see your Google
          password.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Operational logs.</strong> Our servers record request
          metadata (URL, status code, response time, IP, user agent) for
          security, abuse mitigation, and debugging. Application errors are
          forwarded to Sentry. Cookies and authorization headers are redacted
          before logs leave our infrastructure.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          <strong>Editorial contact.</strong> If you write to the editorial
          address, we store your email address and any message you send for
          as long as needed to handle the request and a reasonable record
          period afterwards.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Legal Bases (GDPR Article 6)
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          For visitors in the United Kingdom, the EEA, and other
          jurisdictions where the General Data Protection Regulation or an
          equivalent applies, we rely on the following legal bases:
        </p>
        <ul className="text-charcoal-700 leading-relaxed space-y-2 list-disc pl-6">
          <li>
            <strong>Contract performance</strong> — to provide signed-in
            features (account creation, saved weights, bookmarks). Without
            this data we cannot operate the account.
          </li>
          <li>
            <strong>Legitimate interest</strong> — for aggregate analytics,
            operational logging, security and abuse prevention, and the
            community-aggregate computation. We have weighed these
            interests against your rights and consider them proportionate
            to the limited data involved.
          </li>
          <li>
            <strong>Consent</strong> — for any non-essential cookie. You
            may withdraw consent at any time without affecting the
            lawfulness of prior processing.
          </li>
          <li>
            <strong>Legal obligation</strong> — to respond to lawful
            requests from authorities and to keep records required by tax
            or regulatory law if and when those obligations apply.
          </li>
        </ul>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Data Retention
        </h2>
        <ul className="text-charcoal-700 leading-relaxed space-y-2 list-disc pl-6">
          <li>
            <strong>Account data</strong> — retained for as long as your
            account is open. If you delete your account, identifying data is
            removed from our primary database within thirty days; encrypted
            backups age out within an additional ninety days.
          </li>
          <li>
            <strong>Saved weights and bookmarks</strong> — same lifecycle as
            the parent account.
          </li>
          <li>
            <strong>Operational logs</strong> — thirty days, then deleted.
          </li>
          <li>
            <strong>Application error reports (Sentry)</strong> — ninety
            days, then deleted.
          </li>
          <li>
            <strong>Editorial correspondence</strong> — kept for the
            duration of the matter plus a reasonable record period
            (typically up to two years) to allow follow-up.
          </li>
          <li>
            <strong>Community aggregate inputs</strong> — anonymous
            individual weight vectors that contribute to community
            aggregates are retained only for the aggregate-computation
            window (currently nightly). After the aggregate is computed,
            the individual vector is not separately retained.
          </li>
        </ul>
        <p className="text-charcoal-700 leading-relaxed mt-4">
          The periods above reflect the minimum needed to operate the
          service and respond to data-rights and security requests, plus
          tail periods consistent with industry practice for encrypted
          backups and abuse forensics.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          International Data Transfers
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          The site is operated from the United States. If you access it
          from outside the US, your data will be transferred to and
          processed in the US, and possibly in other countries where our
          subprocessors operate. The legal protections in those countries
          may differ from those in your home jurisdiction.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          For transfers of personal data out of the UK or the EEA we rely on
          the European Commission&rsquo;s Standard Contractual Clauses, the
          UK International Data Transfer Addendum, or an adequacy mechanism
          such as the EU–US Data Privacy Framework where the receiving
          processor is certified. Copies of the relevant safeguards are
          available on request.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          What We Don&rsquo;t Collect
        </h2>
        <ul className="text-charcoal-700 leading-relaxed space-y-2 list-disc pl-6 mb-4">
          <li>No advertising trackers, no third-party marketing pixels.</li>
          <li>No cross-site behavioral profiling.</li>
          <li>No selling, renting, or sharing of email lists.</li>
          <li>No analytics cookies for anonymous visitors.</li>
          <li>
            No sensitive categories of personal data (we have no need for
            them).
          </li>
        </ul>
        <p className="text-charcoal-700 leading-relaxed">
          We do not sell or share your personal information for
          cross-context behavioral advertising, for monetary consideration,
          or for other valuable consideration. We do not engage in targeted
          advertising. We do not use the automated-decisionmaking
          technologies regulated by California&rsquo;s 2025 CPPA rules, the
          GDPR&rsquo;s Article 22 prohibition on solely-automated
          significant decisions, or the EU AI Act&rsquo;s high-risk
          category. The framework&rsquo;s scores are produced by human
          editorial judgment; community aggregates are computed by simple
          statistical averaging of authenticated user submissions, not by
          predictive models of users.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          How We Use Account Data
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          Account data is used solely to operate the features you sign in for:
          remembering your saved category weights so your personal ranking
          persists across sessions and surfacing your bookmarks.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          Your weight vectors contribute to the community aggregate once you
          have verified your email; for the first 24 hours after sign-up the
          contribution is held back from the aggregate to prevent
          freshly-created accounts from skewing the median (see the
          bias-mitigation notes in the{" "}
          <Link href="/methodology" className="text-rust-700 hover:text-rust-800 underline-offset-2">
            Methodology
          </Link>
          ). Contribution is anonymous; we publish aggregates, not individual
          vectors.
        </p>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Subprocessors
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          The site relies on the following service providers. Each is bound
          by its own privacy terms, and we share with them only what is
          required to deliver the service.
        </p>
        <ul className="text-charcoal-700 leading-relaxed space-y-2 list-disc pl-6">
          <li>
            <strong>Vercel</strong> — application hosting, edge delivery,
            and cookieless aggregate page analytics (Vercel Analytics).
          </li>
          <li>
            <strong>Supabase</strong> — managed PostgreSQL for account and
            scoring data.
          </li>
          <li>
            <strong>Upstash</strong> — Redis for rate limiting.
          </li>
          <li>
            <strong>Google</strong> — OAuth identity for sign-in (only if you
            choose Google).
          </li>
          <li>
            <strong>Sentry</strong> — application error reporting.
          </li>
          <li>
            <strong>Resend</strong> — transactional email provider for
            magic-link sign-in (only if you sign in by email).
          </li>
        </ul>
        <p className="text-charcoal-700 leading-relaxed mt-4 text-sm">
          Background-worker infrastructure (for nightly community-aggregate
          computation and evidence-URL verification) is planned but not yet
          deployed. Once deployed, the host will be added here.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Your Rights
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          You may, at any time, sign in and delete your account. Account
          deletion is irreversible and removes your email, saved weights,
          bookmarks, and notification subscriptions from our primary database
          within thirty days. Aggregate community statistics computed before
          deletion may persist in non-identifying form.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          If you are an EU, UK, or California resident, you have additional
          rights under GDPR, the UK GDPR, and CCPA: to access, correct,
          export, or restrict our processing of the data we hold about you,
          and to object to processing carried out on the basis of
          legitimate interest. Send a request to the editorial contact
          below and we will respond within thirty days.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          You also have the right to lodge a complaint with a data
          protection supervisory authority. In the UK that is the
          Information Commissioner&rsquo;s Office; in the EEA it is the
          authority in your country of residence; in California it is the
          California Privacy Protection Agency. We would appreciate the
          chance to address concerns directly first, but you are not
          obliged to contact us before contacting them.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Security &amp; Breach Notification
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          We use industry-standard technical and organizational measures:
          encryption in transit (TLS) and at rest for the database,
          principle-of-least-privilege access controls, redacted logging of
          credentials, and automated dependency monitoring. No system is
          perfectly secure, and we do not promise one is.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          In the event of a personal-data breach that is likely to result in
          a risk to your rights, we will notify the relevant supervisory
          authority within seventy-two hours of becoming aware of it where
          required by law, and notify affected users without undue delay.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Targeting &amp; Territorial Scope
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          Score Our Presidents is operated from the United
          States and is directed at readers in the United States. We do
          not specifically target users in the European Economic Area or
          the United Kingdom: the site is offered in English only,
          addresses US-specific subject matter, and is not localized for
          any EU or UK market. Visitors from those regions may use the
          site, but we do not consider EEA or UK residents to be intended
          recipients of the service for the purposes of GDPR Article 3(2)
          or UK GDPR.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          If our targeting posture changes, we will update this section
          and, if required, appoint a representative under GDPR Article 27
          or its UK equivalent. In the meantime, EU and UK visitors may
          direct data-protection inquiries to the editorial contact below.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Cookies
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          We use a single first-party session cookie for authenticated users
          (HttpOnly, Secure, SameSite=Lax) to keep you signed in. We do not
          set advertising or analytics cookies. Visitors from the EU, the UK,
          or other jurisdictions with cookie-consent requirements will see a
          consent prompt before any non-essential cookie is set.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          <strong>Do Not Track.</strong> We do not respond to Do Not Track
          browser signals because no industry-standard interpretation of
          those signals applies to a site that does not engage in
          cross-context behavioral advertising. We honor Global Privacy
          Control (GPC) signals as opt-outs of sale or sharing for any
          future activity that would qualify; at present, we do not sell
          or share personal information, so no opt-out is required.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Children
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          The site is intended for users who are at least sixteen years old,
          or thirteen years old in jurisdictions where that is the lawful
          minimum for an individual to provide their own consent to data
          processing. We do not knowingly collect personal information from
          users below the applicable age threshold. If you believe a child
          has provided us with personal data, write to the editorial contact
          below and we will delete it.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Changes to This Policy
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          If we change this policy in a way that materially affects how we
          handle your data, we will update the date at the top of the page
          and, where we have a working email for you, notify you in advance.
          Older versions are available on request.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-12">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Contact
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          Privacy questions, data-rights requests, and security reports go to{" "}
          <a
            href="mailto:legal@scoreourpresidents.org"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            legal@scoreourpresidents.org
          </a>
          . Takedown and correction requests are covered in the{" "}
          <Link
            href="/terms"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            Terms
          </Link>
          .
        </p>
      </section>
    </article>
  );
}

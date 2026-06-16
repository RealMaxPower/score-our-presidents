import Link from "next/link";
import { SITE_NAME } from "@/lib/site-config";

export const metadata = {
  title: `Terms · ${SITE_NAME}`,
  description:
    "Terms of use, editorial framing, license, and the takedown and correction policy for Score Our Presidents (the Presidential Scoring Framework).",
};

const LAST_UPDATED = "2026-05-17";

export default function TermsPage() {
  return (
    <article>
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
      </nav>

      <section className="text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 border border-rust-700/70 text-rust-700 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
          <span aria-hidden>§</span> Terms
        </span>
        <h1 className="font-display font-bold text-4xl sm:text-6xl mt-7 leading-[1.05] tracking-tight">
          Terms of Use
        </h1>
        <div className="rust-rule" />
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Last updated · {LAST_UPDATED}
        </p>
        <p className="drop-cap mt-10 text-lg leading-relaxed text-charcoal-700 text-left">
          Score Our Presidents (the Presidential Scoring Framework) is an
          independent research project publishing structured, opinionated
          evaluations of modern US presidents. By accessing or using the site, or by creating an
          account, you agree to the terms below. If you do not agree, you
          should not use the site. The terms are not long — but the framing
          matters.
        </p>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          What This Site Is — and Isn&rsquo;t
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          The rankings, category nets, sub-criterion scores, and narrative
          notes on this site are <strong>editorial judgments</strong> derived
          by applying a published rubric to documented historical evidence.
          They are scored against five calibration anchors (FDR, Truman,
          Eisenhower, Nixon, Reagan), they will be revised as long-tail
          consequences resolve, and they intentionally diverge from other
          rankings in documented ways. The full reasoning is on the{" "}
          <Link
            href="/methodology"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            Methodology
          </Link>{" "}
          page.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          Scores are not statements of objective fact about any person. They
          are the framework&rsquo;s assessment of public conduct in public
          office, expressed in the framework&rsquo;s vocabulary.
          Reasonable readers — and lens presets — will reach different
          conclusions. That is the point.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Eligibility
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          The site is intended for users who are at least sixteen years
          old, or thirteen years old in jurisdictions where that is the
          lawful minimum for an individual to provide their own consent to
          data processing. If you are under the age required to provide
          your own consent in your jurisdiction, you may only create an
          account with verifiable parental or guardian consent. By
          creating an account, you confirm that you meet these
          requirements. We do not knowingly collect personal information
          from users below the applicable age threshold; if you believe a
          user has provided us with personal data in violation of this
          section, please write to the editorial address and we will
          investigate.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Accounts
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          You may create an account to save category weights and bookmark
          scorecards. You are
          responsible for keeping your sign-in method secure. We may suspend
          or close accounts that are used to abuse the service —
          automated weight-stuffing, scripted account creation, or attempts
          to subvert the community-aggregate safeguards described in the{" "}
          <Link
            href="/methodology"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            Methodology
          </Link>
          .
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          You may delete your account at any time from your account
          settings, with the consequences described in the{" "}
          <Link
            href="/privacy"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Acceptable Use
        </h2>
        <ul className="text-charcoal-700 leading-relaxed space-y-2 list-disc pl-6">
          <li>
            Do not attempt to gain unauthorized access to any part of the
            service or its underlying infrastructure.
          </li>
          <li>
            Do not scrape, mirror, or republish the data set in a way that
            misrepresents its provenance or strips the methodology context.
          </li>
          <li>
            Do not use the site to harass identifiable individuals,
            including living subjects of scoring.
          </li>
          <li>
            Do not introduce malware, run denial-of-service attacks, or
            attempt to evade rate limits.
          </li>
          <li>
            Do not create automated accounts or submit weight vectors
            intended to skew the community aggregate.
          </li>
        </ul>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Living-Subject Correction &amp; Takedown
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          We score four living former or sitting presidents — Obama, Trump
          T1, Biden, and Trump T2 — and we recognize the additional care
          this demands. If you are a subject of scoring, an authorized
          representative, or a reader who believes a specific evidence item
          is materially inaccurate, you may submit a correction or takedown
          request to{" "}
          <a
            href="mailto:editorial@scoreourpresidents.org"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            editorial@scoreourpresidents.org
          </a>
          .
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          A request will move fastest when it identifies the specific
          sub-criterion and evidence item, explains what is inaccurate,
          and either cites a corrective source or attaches one. We commit,
          subject to operator availability and good-faith effort, to
          acknowledging receipt within seven days of a complete request,
          and to publishing a determination — correction, removal, or
          reasoned declination — within thirty days of acknowledgement.
          The determination period may be extended once for an additional
          thirty days where additional fact-finding is reasonably
          required, with notice to the requester. Determinations are
          logged in the public changelog.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          Disagreement with an editorial judgment is not, on its own,
          grounds for removal. Demonstrable factual error in a cited piece
          of evidence is. Lens presets exist precisely so that readers who
          object to a value-frame can apply one that suits them.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Right of Reply
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          Subjects of scoring and their authorized representatives may
          submit a written response — a Right of Reply — addressed to a
          specific scorecard, sub-criterion, or evidence item. We commit to
          considering every reply in good faith and, where the reply is
          responsive and reasonably concise, publishing it alongside the
          scored content rather than removing the underlying material.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          A Right of Reply is offered in addition to, not instead of, the
          correction and takedown process above. We may edit replies
          lightly for length or to remove material unrelated to the
          challenged item, but we will not alter their substantive
          position. Choosing not to exercise the Right of Reply does not
          waive any other remedy available to you.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Intellectual Property &amp; License
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          We expect to publish the framework specification, scoring rubric,
          calibration anchors, and methodology copy under a{" "}
          <strong>Creative Commons Attribution–ShareAlike 4.0</strong>{" "}
          license, and to release site source code under the MIT license.
          Final license terms will be confirmed at launch and noted in the
          source repository. Until that confirmation, no license is granted
          beyond personal, non-commercial reading of the site, and all
          rights are reserved.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          Third-party trademarks, including the names and likenesses of
          public figures, remain the property of their respective owners;
          their appearance on this site is nominative and editorial.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          If you publish derivative rankings once the framework is openly
          licensed, please link back to the methodology page so readers can
          see the assumptions they are adopting along with the numbers.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Copyright Complaints (DMCA)
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          If you believe material on the site infringes your copyright,
          send a notice that meets the requirements of 17 U.S.C. § 512(c)
          to{" "}
          <a
            href="mailto:legal@scoreourpresidents.org"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            legal@scoreourpresidents.org
          </a>
          . A complete notice must identify the work, identify the
          allegedly infringing material with enough specificity for us to
          locate it, include your contact information, include a statement
          made under penalty of perjury that you are the rights-holder or
          authorized to act on the rights-holder&rsquo;s behalf, and
          include a statement that the use is not authorized by the
          rights-holder, its agent, or the law. A formal designated-agent
          contact will be registered with the US Copyright Office prior to
          public launch.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Disclaimers
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          The site is provided <em>as is</em> and <em>as available</em>,
          without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, and
          non-infringement. We make no warranty that the service will be
          uninterrupted or error-free. Historical evidence, even from
          primary sources, is sometimes wrong; the framework reflects our
          best current reading of the record, not a final adjudication.
          Damages, where they exist, are addressed in the Limitation of
          Liability section below.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Limitation of Liability
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          To the maximum extent permitted by law: (a) neither the project,
          its maintainers, nor its contributors will be liable for any
          indirect, consequential, incidental, special, exemplary, or
          punitive damages, or for loss of profits, revenues, data,
          goodwill, or business opportunities, arising out of or related
          to your use of the site, even if we have been advised of the
          possibility of such damages; (b) the aggregate liability of the
          project, its maintainers, and its contributors arising out of or
          related to your use of the site is limited to the greater of
          (i) one hundred US dollars (US$100) or (ii) the total fees, if
          any, that you paid us in the twelve months preceding the event
          giving rise to the claim. These limitations apply regardless of
          the theory of liability (contract, tort, negligence, strict
          liability, statute, or otherwise) and survive termination of
          these terms.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          Some jurisdictions do not allow the exclusion or limitation of
          incidental, consequential, or certain other damages. In those
          jurisdictions, our liability is limited to the maximum extent
          permitted by law. Nothing in this section is intended to exclude
          liability for fraud, willful misconduct, or any liability that
          cannot be excluded under applicable law.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Governing Law &amp; Dispute Resolution
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Governing law.</strong> These terms are governed by the
          laws of the State of Delaware, without regard to its
          conflict-of-law principles. Final selection of the governing
          jurisdiction will be confirmed at launch with counsel and noted
          here.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Pre-suit informal resolution.</strong> Before filing any
          claim, you agree to contact us at the editorial address and
          attempt in good faith to resolve the dispute informally for at
          least sixty days. Filing a claim before the sixty-day period
          expires is a breach of these terms.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Exclusive venue.</strong> Any dispute not resolved
          informally will be brought exclusively in the state or federal
          courts located in New Castle County, Delaware. Each party
          consents to personal jurisdiction there and waives any
          objection to venue.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          <strong>Class-action waiver.</strong> Each party agrees to bring
          claims only in an individual capacity and not as a plaintiff or
          class member in any class, consolidated, or representative
          action. The parties waive any right to participate in a class
          action.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          <strong>Carve-outs.</strong> Nothing in this section prevents
          either party from (a) seeking injunctive relief in a court of
          competent jurisdiction to protect intellectual property or
          confidential information, (b) bringing an individual claim in a
          small-claims court of competent jurisdiction, or (c) responding
          to a takedown, correction, or right-of-reply request under the
          procedures published on this site.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          General Provisions
        </h2>
        <ul className="text-charcoal-700 leading-relaxed space-y-3 list-disc pl-6">
          <li>
            <strong>Entire agreement.</strong> These Terms, together with
            the Privacy Policy and any notices posted on the site,
            constitute the entire agreement between you and the project
            regarding the site and supersede any prior understandings on
            the subject.
          </li>
          <li>
            <strong>Severability.</strong> If a court of competent
            jurisdiction holds any provision unenforceable, that provision
            will be enforced to the maximum extent permissible and the
            remaining provisions will remain in full effect.
          </li>
          <li>
            <strong>No waiver.</strong> Our failure to enforce a provision
            is not a waiver of our right to enforce it later.
          </li>
          <li>
            <strong>Assignment.</strong> You may not assign these Terms
            without our prior written consent. We may assign them in
            connection with a merger, acquisition, reorganization, or sale
            of substantially all assets, or to a successor entity that
            agrees to be bound by them.
          </li>
          <li>
            <strong>No third-party beneficiaries.</strong> Nothing in these
            Terms is intended to confer rights on any person other than
            you and the project.
          </li>
          <li>
            <strong>Force majeure.</strong> Neither party is liable for
            delays or failures caused by events beyond reasonable control,
            including network outages, infrastructure failures by upstream
            providers, and acts of government.
          </li>
          <li>
            <strong>Electronic communications.</strong> You consent to
            receive communications, agreements, and disclosures from us
            electronically. You agree that any electronic communications,
            agreements, and disclosures satisfy any legal requirement
            that they be in writing.
          </li>
          <li>
            <strong>Export controls and sanctions.</strong> You may not
            access or use the site if you are located in a jurisdiction
            subject to comprehensive US embargoes (currently Cuba, Iran,
            North Korea, Syria, and the Crimea, Donetsk, and Luhansk
            regions of Ukraine), or if you are a person identified on the
            US Treasury Department&rsquo;s Specially Designated Nationals
            list or comparable restricted-party lists.
          </li>
          <li>
            <strong>Notice of changes.</strong> We will provide thirty
            days&rsquo; advance notice of material changes to these
            terms by updating the date at the top of the page and, where
            we have a working email for you, by sending an email
            notification.
          </li>
        </ul>
      </section>

      <section className="max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Changes
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          We may update these terms as the project evolves. Material
          changes will be summarized in the public changelog and reflected
          in the date at the top of this page. Continued use of the site
          after a change constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-12">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Contact
        </h2>
        <p className="text-charcoal-700 leading-relaxed">
          Editorial and legal correspondence:{" "}
          <a
            href="mailto:legal@scoreourpresidents.org"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            legal@scoreourpresidents.org
          </a>
          . For privacy and data-rights matters, see the{" "}
          <Link
            href="/privacy"
            className="text-rust-700 hover:text-rust-800 underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </article>
  );
}

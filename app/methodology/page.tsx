import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_SHORT_LABELS,
  LENS_WEIGHTS,
  type LensSlug,
} from "@/lib/rankings";
import { SITE_NAME } from "@/lib/site-config";

export const revalidate = 3600;

const METHODOLOGY_DESCRIPTION =
  "How the framework scores 16 modern US presidents across 13 weighted categories, 56 sub-criteria, and 9 lens presets.";

export const metadata: Metadata = {
  title: "Methodology",
  description: METHODOLOGY_DESCRIPTION,
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: `Methodology · ${SITE_NAME}`,
    description: METHODOLOGY_DESCRIPTION,
    url: "/methodology",
    images: [
      { url: "/api/og/default", width: 1200, height: 630, alt: SITE_NAME },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Methodology · ${SITE_NAME}`,
    description: METHODOLOGY_DESCRIPTION,
    images: ["/api/og/default"],
  },
};

const ACKNOWLEDGED_BIASES: { title: string; body: string }[] = [
  {
    title: "Recency bias",
    body: "Recent presidents (Biden, Trump T2) score against incomplete long-tail data. Category 10 (long-tail consequences) is dropped for them, and the remaining 12 categories are proportionally renormalized so the weights still sum to 100.",
  },
  {
    title: "Post-1933 scope",
    body: "Framework covers FDR onwards (the modern administrative state). Pre-FDR presidents operated under fundamentally different institutional constraints and are out of scope.",
  },
  {
    title: "Internal calibration",
    body: "Anchor scores (FDR, Truman, Eisenhower, Nixon, Reagan) are scored internally against era benchmarks. Every other president's score is calibrated relative to these. Reasonable readers can disagree with the anchor calls; if they do, the entire ranking shifts.",
  },
  {
    title: "Western-liberal value frame",
    body: "Lens presets span Progressive → Conservative → Libertarian → Realist etc., but all sit inside a broadly liberal-democratic value frame. A Christian Nationalist lens was declined; alternative non-Western framings are not represented in v1.",
  },
  {
    title: "Living-subject scoring",
    body: "Trump T1, Biden, and Trump T2 receive harm scores while their political and legal consequences are still unfolding. Scores will be revised as long-tail data resolves.",
  },
  {
    title: "Source-tier asymmetry",
    body: "Pre-1995 evidence skews toward academic histories (tier 1) while post-2000 evidence skews toward contemporary journalism (tier 2). The framework treats both as eligible; tier asymmetry may affect comparability across eras.",
  },
];

export default async function MethodologyPage() {
  const [categories, lenses] = await Promise.all([
    prisma.category.findMany({
      orderBy: { number: "asc" },
      select: {
        number: true,
        name: true,
        defaultWeight: true,
        weightSourceTag: true,
      },
    }),
    prisma.lensPreset.findMany({
      orderBy: { orderIndex: "asc" },
      select: { slug: true, displayName: true, description: true },
    }),
  ]);

  return (
    <article>
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
      </nav>

      <section className="text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 border border-rust-700/70 text-rust-700 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
          <span aria-hidden>§</span> How We Score
        </span>
        <h1 className="font-display font-bold text-4xl sm:text-6xl mt-7 leading-[1.05] tracking-tight">
          The Methodology
        </h1>
        <div className="rust-rule" />
        <p className="drop-cap mt-10 text-lg leading-relaxed text-charcoal-700 text-left">
          Each president is evaluated across thirteen weighted categories and
          fifty-six sub-criteria using dual-axis scoring. Every sub-criterion
          carries an independent <strong>good</strong> score (0–10) and{" "}
          <strong>harm</strong> score (0–10); the net is good minus harm. The
          framework is structured so that two evaluators applying the same
          rubric to the same evidence should arrive at the same numbers — and
          so that the framework&rsquo;s own assumptions sit in plain view.
        </p>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          The Framework
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          A category net is the mean of its sub-criterion nets. A
          president&rsquo;s weighted total is the sum of category nets times
          their default-weight share, scaled so the weights sum to 100.
          Sub-criteria within a category are equal-weighted;
          category weights are blended from the published methodologies of
          C-SPAN, APSA, Siena, and Brookings/UVA.
        </p>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          For presidents whose terms ended too recently for long-tail effects
          to resolve (currently Biden and Trump&rsquo;s second term), Category
          10 — Long-tail consequences — is dropped and the remaining categories
          are proportionally renormalized so the remaining weights still sum to 100. Scoring will revise as
          long-tail data resolves.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          The scoring scale is <strong>−10 to +10</strong>. Anchoring is
          established by reference to five calibration presidents (FDR, Truman,
          Eisenhower, Nixon, Reagan) whose scores were drafted first against
          era benchmarks; all other presidents were scored relative to those
          anchors.
        </p>
      </section>

      <section className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-2">
          The Thirteen Categories
        </h2>
        <p className="text-stone-500 text-sm italic mb-8">
          Default weights shown. Sub-criteria within a category are equal-weighted.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {categories.map((c) => (
            <li
              key={c.number}
              className="border-l-2 border-stone-300/60 pl-4 sm:pl-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-mono text-xs text-stone-400 shrink-0">
                    C{c.number}
                  </span>
                  <h3 className="font-display text-xl tracking-tight">
                    {c.name}
                  </h3>
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-rust-700 font-mono shrink-0">
                  {Number(c.defaultWeight).toFixed(0)}%
                </span>
              </div>
              <p className="text-sm text-charcoal-700 leading-relaxed">
                {CATEGORY_DESCRIPTIONS[c.number]}
              </p>
              {c.weightSourceTag === "cowork_derived" && (
                <p className="text-[11px] uppercase tracking-[0.16em] text-stone-500 mt-2">
                  Weight derived internally (no published-methodology source)
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-2">
          The Nine Lenses
        </h2>
        <p className="text-stone-500 text-sm italic mb-8">
          Each lens reweights the same scoring data to surface how rankings
          shift under different value frameworks. The default lens is a blend;
          the eight others are tradition-anchored.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-8">
          {lenses.map((l) => {
            const weights = LENS_WEIGHTS[l.slug as LensSlug];
            return (
              <li key={l.slug}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h3 className="font-display text-2xl tracking-tight">
                    {l.displayName}
                  </h3>
                  <Link
                    href={`/?lens=${l.slug}` as `/?lens=${string}`}
                    className="text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 shrink-0"
                  >
                    apply →
                  </Link>
                </div>
                <p className="text-sm text-charcoal-700 leading-relaxed mb-3">
                  {l.description}
                </p>
                <details className="text-[11px] uppercase tracking-[0.12em] text-stone-500">
                  <summary className="cursor-pointer hover:text-charcoal-700">
                    Top category weights
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 normal-case tracking-normal text-xs font-mono text-charcoal-700">
                    {Object.entries(weights)
                      .map(([n, w]) => ({ num: parseInt(n, 10), w }))
                      .sort((a, b) => b.w - a.w)
                      .slice(0, 6)
                      .map(({ num, w }) => (
                        <div
                          key={num}
                          className="flex items-baseline justify-between"
                        >
                          <span>{CATEGORY_SHORT_LABELS[num]}</span>
                          <span>{w}%</span>
                        </div>
                      ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section className="max-w-3xl mx-auto mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Calibration Anchors
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          Five presidents act as calibration anchors:{" "}
          <strong>Franklin D. Roosevelt</strong>,{" "}
          <strong>Harry S. Truman</strong>,{" "}
          <strong>Dwight D. Eisenhower</strong>,{" "}
          <strong>Richard Nixon</strong>, and <strong>Ronald Reagan</strong>.
          Their scores establish the calibration against which all other
          presidents are scored — they are the rulers.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          Anchor scoring is published as the framework&rsquo;s calibration
          baseline. Any calibration error in the anchors propagates to every
          other president&rsquo;s score — see the bias audit below.
        </p>
      </section>

      <section className="mb-20">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-2">
          What We Acknowledge
        </h2>
        <p className="text-stone-500 text-sm italic mb-8">
          Six biases the framework ships with, documented rather than hidden.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {ACKNOWLEDGED_BIASES.map((b) => (
            <li key={b.title}>
              <h3 className="font-display text-xl tracking-tight mb-2">
                {b.title}
              </h3>
              <p className="text-sm text-charcoal-700 leading-relaxed">
                {b.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl mx-auto mb-12">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
          Where This Diverges From C-SPAN
        </h2>
        <p className="text-charcoal-700 leading-relaxed mb-4">
          The framework&rsquo;s default ranking differs from the C-SPAN
          historian survey in documented ways: it is more harm-sensitive on
          civilian-impact and civil-rights dimensions, and it weights long-tail
          consequences more heavily than survey methodologies typically do.
          Lens presets surface where reasonable value frameworks diverge — by
          design, the same evidence produces materially different rankings
          under Progressive vs. Conservative vs. Realist weights.
        </p>
        <p className="text-charcoal-700 leading-relaxed">
          The honest position is that there is no single correct ranking. There
          are rankings consistent with a stated value framework, applied
          uniformly to documented evidence. That is what this framework
          provides.
        </p>
      </section>
    </article>
  );
}

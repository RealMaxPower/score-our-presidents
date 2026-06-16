import type { Metadata, Route } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  getAllLensRankings,
  getRankingsForCustomWeights,
  LENS_WEIGHTS,
  type CategoryWeights,
  type LensSlug,
  type PresidentRanking,
} from "@/lib/rankings";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { SITE_NAME, SITE_SUBHEADLINE, SITE_TITLE } from "@/lib/site-config";
import {
  RankingsSection,
  type LensOption,
} from "@/components/rankings-section";

export const revalidate = 3600;

export async function generateMetadata(
  props: {
    searchParams: Promise<{ lens?: string }>;
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const lensParam = searchParams.lens;
  const isValid = lensParam && lensParam in LENS_WEIGHTS;
  if (!isValid || lensParam === "default") {
    const description =
      "16 modern US presidents scored on 56 sub-criteria across 13 categories. The default ranking blends C-SPAN, APSA, Siena, and Brookings/UVA methodologies; eight additional lens presets re-weight the same evidence.";
    return {
      title: { absolute: SITE_TITLE },
      description,
      alternates: { canonical: "/" },
      openGraph: {
        title: SITE_TITLE,
        description,
        url: "/",
        images: [{ url: "/api/og/default", width: 1200, height: 630, alt: SITE_TITLE }],
      },
      twitter: {
        card: "summary_large_image",
        title: SITE_TITLE,
        description,
        images: ["/api/og/default"],
      },
    };
  }
  const lens = await prisma.lensPreset.findUnique({
    where: { slug: lensParam },
    select: { displayName: true, description: true },
  });
  if (!lens) {
    return { title: { absolute: SITE_TITLE } };
  }
  const title = `${lens.displayName} ranking`;
  const description = `16 modern US presidents re-ranked under the ${lens.displayName} lens. ${lens.description}`;
  const ogImage = `/api/og/lens/${lensParam}`;
  const canonical = `/?lens=${lensParam}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${title} · ${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function HomePage() {
  const [rankings, categories, lenses, user] = await Promise.all([
    getAllLensRankings(),
    prisma.category.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, name: true, defaultWeight: true },
    }),
    prisma.lensPreset.findMany({
      orderBy: { orderIndex: "asc" },
      select: { slug: true, displayName: true, description: true },
    }),
    currentUser(),
  ]);

  // Validate every lens we ship in the chips has a precomputed ranking entry.
  // (fail-fast for the rare case of a DB lens that's not in LENS_WEIGHTS.)
  const lensOptions: LensOption[] = lenses
    .filter((l) => l.slug in LENS_WEIGHTS)
    .map((l) => ({
      slug: l.slug,
      displayName: l.slug === "default" ? "Default" : l.displayName,
      description: l.description,
    }));

  // If the user has saved personal weights, inject a "Yours" lens computed
  // from those weights alongside the 9 canonical presets.
  const allRankings: Record<string, PresidentRanking[]> = { ...rankings };
  let bookmarkedIds: string[] = [];
  if (user) {
    const [savedWeights, bookmarks] = await Promise.all([
      prisma.userWeight.findMany({
        where: { userId: user.id },
        select: { categoryId: true, weight: true },
      }),
      prisma.bookmark.findMany({
        where: { userId: user.id },
        select: { presidentId: true },
      }),
    ]);
    bookmarkedIds = bookmarks.map((b) => b.presidentId);
    if (savedWeights.length > 0) {
      const catIdToNumber = new Map(categories.map((c) => [c.id, c.number]));
      const personalWeights: Record<number, number> = {};
      for (const c of categories) personalWeights[c.number] = 0;
      for (const w of savedWeights) {
        const num = catIdToNumber.get(w.categoryId);
        if (num) personalWeights[num] = Number(w.weight);
      }
      const personalRanking = await getRankingsForCustomWeights(
        personalWeights as unknown as CategoryWeights
      );
      allRankings.yours = personalRanking;
      lensOptions.unshift({
        slug: "yours",
        displayName: "Yours",
        description: "Your saved category weights.",
        descriptionCta: { label: "Edit your weights", href: "/me/weights" as Route },
      });
    }
  }

  return (
    <div>
      <section className="text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 border border-rust-700/70 text-rust-700 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]">
          <span aria-hidden>⚖</span> Historical Analysis
        </span>
        <h1 className="font-display font-bold text-[2.25rem] sm:text-6xl lg:text-7xl mt-7 leading-[1.05] tracking-tight">
          {SITE_NAME}
        </h1>
        <p className="mt-4 font-display text-lg sm:text-2xl text-charcoal-700 tracking-tight">
          {SITE_SUBHEADLINE}
        </p>
        <div className="rust-rule" />
        <p className="drop-cap mt-10 text-lg leading-relaxed text-charcoal-700 text-left">
          History judges leaders not by their rhetoric, but by the tangible
          impact of their administration. This framework strips away partisan
          mythology to evaluate the American presidency through a rigorous,
          data-driven lens. We measure two primary vectors: the concrete good
          achieved for the populace, and the measurable harm inflicted.
        </p>
      </section>

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <Suspense fallback={<RankingsSectionFallback />}>
        <RankingsSection
          rankings={allRankings}
          lenses={lensOptions}
          bookmarkedIds={bookmarkedIds}
          authed={!!user}
        />
      </Suspense>

      {user && !lensOptions.some((l) => l.slug === "yours") && (
        <div className="-mt-14 mb-14 text-center">
          <Link
            href={"/me/weights" as Route}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-rust-700 hover:text-rust-800 underline underline-offset-2"
          >
            Set your personal weights to unlock the &ldquo;Yours&rdquo; lens →
          </Link>
        </div>
      )}

      <div className="asterisk-divider my-16" aria-hidden>
        ✱
      </div>

      <section
        id="methodology"
        className="grid sm:grid-cols-2 gap-10 sm:gap-14 mb-12"
      >
        <div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-6">
            The Methodology
          </h2>
          <p className="text-charcoal-700 leading-relaxed mb-4">
            Each president is evaluated across 13 weighted categories and 56
            sub-criteria using dual-axis scoring (0–10 good, 0–10 harm). The
            default weight blend reflects a synthesis of C-SPAN, APSA, Siena,
            and Brookings/UVA published methodologies — eight additional lens
            presets reweight the same evidence to surface how rankings shift
            under different value frameworks.
          </p>
          <p className="text-charcoal-700 leading-relaxed mb-6">
            Five calibration anchors (FDR, Truman, Eisenhower, Nixon, Reagan)
            establish the scoring baseline against which every other president
            is measured. Every sub-criterion score is paired with documented,
            externally verifiable evidence.
          </p>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-2 text-rust-700 hover:text-rust-800 text-[11px] uppercase tracking-[0.18em] font-medium"
          >
            Read the methodology <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="bg-cream-100 border border-stone-300/60 rounded-sm p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-4">
            Default category weights
          </div>
          <ul className="divide-y divide-stone-300/60">
            {categories.map((c) => (
              <li
                key={c.number}
                className="flex items-baseline justify-between py-2.5 text-sm gap-4"
              >
                <span className="uppercase tracking-[0.04em] text-charcoal-900">
                  {c.name}
                </span>
                <span className="shrink-0">
                  <span className="font-mono text-charcoal-900">
                    {Number(c.defaultWeight).toFixed(0)}%
                  </span>
                  <em className="text-stone-500 not-italic text-xs ml-1.5">
                    weight
                  </em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function RankingsSectionFallback() {
  return (
    <section className="py-12 text-center text-stone-500 text-sm">
      Loading rankings…
    </section>
  );
}


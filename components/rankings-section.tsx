"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useTransition } from "react";
import { type PresidentRanking } from "@/lib/rankings";
import { BookmarkButton } from "@/components/bookmark-button";

// The lens slug here is intentionally `string`, not the strict `LensSlug` union,
// so the home page can inject custom lenses (e.g. the user's personal "yours"
// lens) alongside the 9 canonical presets.
export interface LensOption {
  slug: string;
  displayName: string;
  description: string;
  /** Optional call-to-action link rendered inline after the description. */
  descriptionCta?: {
    label: string;
    href: Route;
  };
}

interface Props {
  rankings: Record<string, PresidentRanking[]>;
  lenses: LensOption[];
  /** Set of `presidentId` values the current user has bookmarked. */
  bookmarkedIds?: string[];
  authed: boolean;
}

function formatTerm(start: Date | string, end: Date | string | null) {
  const s = new Date(start).getFullYear();
  const e = end ? new Date(end).getFullYear() : "—";
  return `${s} – ${e}`;
}

export function RankingsSection({
  rankings,
  lenses,
  bookmarkedIds = [],
  authed,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const bookmarkedSet = new Set(bookmarkedIds);

  const lensParam = searchParams.get("lens");
  const activeLens: string =
    lensParam && lensParam in rankings ? lensParam : "default";
  const selected = rankings[activeLens];
  const activeLensMeta = lenses.find((l) => l.slug === activeLens);

  const setLens = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "default") params.delete("lens");
    else params.set("lens", slug);
    const query = params.toString();
    const href = `${pathname}${query ? `?${query}` : ""}` as Route;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  return (
    <>
      <section className="mb-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
              The Modern Era
            </h2>
            <p className="text-stone-500 text-sm mt-1 italic">
              (1933 – Present)
            </p>
          </div>
          <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-good-500" />
              Positive Impact
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-harm-500" />
              Measured Harm
            </span>
          </div>
        </div>

        <div className="border-t border-stone-300/60 pt-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700 mb-3">
            Analytical Lens
          </div>
          <div className="flex flex-wrap gap-2 -mx-1 px-1 overflow-x-auto sm:overflow-visible">
            {lenses.map((l) => {
              const active = l.slug === activeLens;
              return (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => setLens(l.slug)}
                  title={l.description}
                  aria-pressed={active}
                  className={
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] transition border-2 " +
                    (active
                      ? "bg-rust-700 text-cream-50 border-rust-700 font-semibold shadow-sm"
                      : "bg-cream-100 text-charcoal-700 border-transparent hover:border-rust-700/40 hover:text-rust-700")
                  }
                >
                  {active && (
                    <span aria-hidden className="text-cream-50">
                      ●
                    </span>
                  )}
                  {l.displayName}
                </button>
              );
            })}
          </div>

          {activeLensMeta && (
            <div className="mt-5 border-l-2 border-rust-700/60 pl-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 font-medium mb-1">
                Now viewing · {activeLensMeta.displayName} lens
              </div>
              <p className="text-sm text-charcoal-700 leading-relaxed max-w-3xl">
                {activeLensMeta.description}
                {activeLensMeta.descriptionCta && (
                  <>
                    {" "}
                    <Link
                      href={activeLensMeta.descriptionCta.href}
                      className="text-rust-700 hover:text-rust-800 underline underline-offset-2"
                    >
                      {activeLensMeta.descriptionCta.label} →
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="divide-y divide-stone-300/60 border-y border-stone-300/60 mb-20">
        {selected.map((p, i) => (
          <RankingRow
            key={p.presidentId}
            rank={i + 1}
            p={p}
            bookmarked={bookmarkedSet.has(p.presidentId)}
            authed={authed}
          />
        ))}
      </section>
    </>
  );
}

function RankingRow({
  rank,
  p,
  bookmarked,
  authed,
}: {
  rank: number;
  p: PresidentRanking;
  bookmarked: boolean;
  authed: boolean;
}) {
  const positive = p.weightedTotal >= 0;
  return (
    <div className="relative group">
      <Link
        href={`/president/${p.slug}` as `/president/${string}`}
        aria-label={`View ${p.displayName}'s full scorecard`}
        className="block transition-colors hover:bg-cream-100 focus-visible:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-700/40 focus-visible:ring-inset"
      >
        <article className="grid grid-cols-12 gap-x-4 sm:gap-x-6 gap-y-3 items-center py-10 sm:py-12 px-2 sm:px-4 -mx-2 sm:-mx-4">
          <div className="col-span-2 sm:col-span-1 font-display italic text-stone-400 group-hover:text-rust-700/60 text-3xl sm:text-4xl tabular-nums transition-colors">
            {String(rank).padStart(2, "0")}
          </div>
          <div className="col-span-10 sm:col-span-3 min-w-0">
            <h3 className="font-display font-bold text-2xl sm:text-[28px] leading-tight tracking-tight group-hover:text-rust-700 transition-colors">
              {p.displayName}
            </h3>
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mt-1">
              {formatTerm(p.termStart, p.termEnd)}
              {p.catTenDropped && " · Cat 10 dropped"}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 group-hover:text-rust-700 mt-1.5 sm:hidden transition-colors">
              View scorecard →
            </div>
          </div>
          <div className="col-span-12 sm:col-span-6 order-last sm:order-none">
            <ImpactBar
              meanGood={p.meanGood}
              meanHarm={p.meanHarm}
              goodLabels={p.topGoodLabels}
              harmLabels={p.topHarmLabels}
            />
          </div>
          <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2 sm:gap-3">
            <div
              className={`font-display font-bold text-3xl sm:text-4xl tabular-nums ${
                positive ? "text-good-700" : "text-rust-700"
              }`}
            >
              {positive ? "+" : ""}
              {p.weightedTotal.toFixed(2)}
            </div>
            <span
              aria-hidden
              className="hidden sm:inline text-stone-300 group-hover:text-rust-700 group-hover:translate-x-1 transition-all text-xl font-display"
            >
              →
            </span>
          </div>
        </article>
      </Link>
      {/* Bookmark button sits above the link as a sibling; pointer events
          isolated so clicking the star does not navigate to the scorecard. */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <BookmarkButton
          presidentId={p.presidentId}
          initialBookmarked={bookmarked}
          authed={authed}
        />
      </div>
    </div>
  );
}

function ImpactBar({
  meanGood,
  meanHarm,
  goodLabels,
  harmLabels,
}: {
  meanGood: number;
  meanHarm: number;
  goodLabels: string[];
  harmLabels: string[];
}) {
  const goodPct = Math.min(100, Math.max(0, (meanGood / 10) * 100));
  const harmPct = Math.min(100, Math.max(0, (meanHarm / 10) * 100));

  return (
    <div className="w-full">
      <div className="flex items-center">
        <div className="flex-1 flex justify-end pr-1">
          <div
            className="h-2.5 bg-good-500 rounded-l-sm transition-all duration-300"
            style={{ width: `${goodPct}%` }}
          />
        </div>
        <div className="w-2 shrink-0" />
        <div className="flex-1 flex justify-start pl-1">
          <div
            className="h-2.5 bg-harm-500 rounded-r-sm transition-all duration-300"
            style={{ width: `${harmPct}%` }}
          />
        </div>
      </div>
      <div className="flex items-start gap-3 mt-2 text-[10px] uppercase tracking-[0.16em]">
        <div className="flex-1 text-right text-good-700/90 leading-snug">
          {goodLabels.join(", ")}
        </div>
        <div className="flex-1 text-left text-rust-700/90 leading-snug">
          {harmLabels.join(", ")}
        </div>
      </div>
    </div>
  );
}

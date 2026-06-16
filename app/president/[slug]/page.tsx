import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPresidentBySlug,
  getPresidentSlugs,
  type EvidenceItem,
} from "@/lib/queries";
import { fmtSigned, formatTerm, partyLabel } from "@/lib/format";
import { SITE_NAME } from "@/lib/site-config";
import { EvidenceList } from "@/components/evidence-list";
import { VoteWidget } from "@/components/vote-widget";
import { CommunityScoreCell } from "@/components/community-score-cell";
import { SubmitScoreAffordance } from "@/components/submit-score-affordance";
import { BookmarkButton } from "@/components/bookmark-button";
import { prisma } from "@/lib/prisma";
import { currentUser, type SessionUser } from "@/lib/auth";
import {
  getVoteCounts,
  emptyVoteCounts,
  type VoteCounts,
} from "@/lib/votes";
import {
  getCommunityScoresForPresident,
  emptyCommunityScore,
  type CommunityScore,
} from "@/lib/community-scores";

export async function generateStaticParams() {
  // Guard the DB call so a first-deploy state (migrations not yet applied,
  // empty Supabase schema) doesn't crash the entire build. Returning an
  // empty array means "no pre-rendered routes" — pages render dynamically
  // on first request and cache per the page's `revalidate` setting.
  try {
    const slugs = await getPresidentSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (e) {
    console.warn(
      "[president/[slug]] generateStaticParams: DB unavailable, deferring to runtime.",
      e instanceof Error ? e.message : e
    );
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const president = await getPresidentBySlug(params.slug);
  if (!president) return { title: "Not found" };
  const signed = fmtSigned(president.weightedTotalDefault);
  const description = `Scorecard for ${president.displayName} (${partyLabel(
    president.party
  )}, ${formatTerm(president.termStart, president.termEnd)}). Default weighted total ${signed}. 13 categories · 56 sub-criteria.`;
  const ogImage = `/api/og/president/${president.slug}`;
  const canonical = `/president/${president.slug}`;
  return {
    title: president.displayName,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${president.displayName} · ${SITE_NAME}`,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${president.displayName} — scorecard`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${president.displayName} · ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function PresidentPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const [president, user] = await Promise.all([
    getPresidentBySlug(params.slug),
    currentUser(),
  ]);
  if (!president) notFound();

  // Bookmark state — single point query so the header reflects current state.
  const bookmark = user
    ? await prisma.bookmark.findUnique({
        where: {
          userId_presidentId: { userId: user.id, presidentId: president.id },
        },
        select: { id: true },
      })
    : null;

  // Compose vote target IDs and batch-fetch counts at the 3 granularities.
  const presidentTargetIds = [president.id];
  const categoryTargetIds = president.categories.map(
    (c) => `${president.id}:${c.id}`
  );
  const subTargetIds = president.categories.flatMap((c) =>
    c.subCriteria.map((s) => `${president.id}:${s.id}`)
  );
  const allSubIds = president.categories.flatMap((c) =>
    c.subCriteria.map((s) => s.id)
  );
  const [presidentVotes, categoryVotes, subVotes, communityScores] =
    await Promise.all([
      getVoteCounts("president", presidentTargetIds, user?.id ?? null),
      getVoteCounts("category", categoryTargetIds, user?.id ?? null),
      getVoteCounts("sub_criterion", subTargetIds, user?.id ?? null),
      getCommunityScoresForPresident(president.id, allSubIds),
    ]);

  const totalColor =
    president.weightedTotalDefault >= 0 ? "text-good-700" : "text-rust-700";

  return (
    <div>
      <nav className="mb-8 text-sm">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
      </nav>

      <header className="mb-12 grid sm:grid-cols-[1fr_auto] gap-6 sm:gap-10 items-end border-b border-stone-300/60 pb-10">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
            {partyLabel(president.party)} ·{" "}
            {formatTerm(president.termStart, president.termEnd)}
            {president.inOffice && " · in office"}
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-6xl leading-[1.05] tracking-tight">
            {president.displayName}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em]">
            {president.calibrationAnchor && (
              <span className="bg-stone-100 text-charcoal-700 px-2.5 py-1 rounded-sm border border-stone-300/60">
                Calibration anchor
              </span>
            )}
            {president.catTenDropped && (
              <span className="bg-rust-700/10 text-rust-800 px-2.5 py-1 rounded-sm border border-rust-700/30">
                Cat 10 dropped — insufficient time elapsed
              </span>
            )}
            <BookmarkButton
              presidentId={president.id}
              initialBookmarked={!!bookmark}
              authed={!!user}
              variant="labeled"
            />
          </div>
        </div>
        <div className="text-right sm:min-w-[12rem]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-charcoal-700">
            Default weighted total
          </div>
          <div
            className={`font-display font-bold text-5xl sm:text-6xl tabular-nums mt-1 ${totalColor}`}
          >
            {fmtSigned(president.weightedTotalDefault)}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mt-2">
            Range −10 to +10
          </div>
          <div className="mt-3 flex justify-end">
            <VoteWidget
              targetType="president"
              targetId={president.id}
              initial={presidentVotes.get(president.id) ?? emptyVoteCounts()}
              authed={!!user}
              size="md"
              label="Agree with this ranking?"
            />
          </div>
        </div>
      </header>

      {president.partialTermNote && (
        <p className="text-sm text-charcoal-700 italic mb-10 max-w-3xl">
          {president.partialTermNote}
        </p>
      )}

      <section className="mb-6">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
            By Category
          </h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Click a category to expand
          </span>
        </div>
        <div className="bg-cream-100 border border-stone-300/60 rounded-sm p-4 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
          <span className="text-[11px] uppercase tracking-[0.18em] text-charcoal-900 font-medium mr-2">
            How to read the numbers
          </span>
          Every sub-criterion is scored on two independent 0–10 scales:{" "}
          <span className="text-good-700 font-semibold">+good</span>{" "}
          measures positive impact;{" "}
          <span className="text-rust-700 font-semibold">−harm</span>{" "}
          measures negative impact.{" "}
          <span className="text-charcoal-900 font-semibold">net = good − harm</span>{" "}
          and ranges from −10 to +10. The category total to the right of each
          card is the mean of its sub-criterion nets. Click thumbs to agree or
          disagree with any score.
        </div>
      </section>

      <section className="space-y-3">
        {president.categories.map((cat) => {
          const catTargetId = `${president.id}:${cat.id}`;
          return (
            <details
              key={cat.number}
              className="bg-cream-100 border border-stone-300/60 rounded-sm open:border-stone-400/60 transition-colors"
            >
              <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-cream-200/60 rounded-sm">
                <div className="min-w-0 flex items-baseline gap-3 flex-1">
                  <span className="font-mono text-xs text-stone-400 w-8 shrink-0">
                    C{cat.number}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-lg sm:text-xl tracking-tight">
                      {cat.name}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 mt-1">
                      {cat.defaultWeight}% default weight
                      {cat.scorableSubCount > 0 &&
                        ` · ${cat.scorableSubCount} sub-criteria scored`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <VoteWidget
                    targetType="category"
                    targetId={catTargetId}
                    initial={categoryVotes.get(catTargetId) ?? emptyVoteCounts()}
                    authed={!!user}
                  />
                  <span
                    className={`font-display font-bold text-2xl tabular-nums ${
                      cat.net === null
                        ? "text-stone-400"
                        : cat.net >= 0
                        ? "text-good-700"
                        : "text-rust-700"
                    }`}
                  >
                    {fmtSigned(cat.net, 1)}
                  </span>
                </div>
              </summary>

              <div className="border-t border-stone-300/40 px-4 sm:px-5 py-4">
                <div className="flex items-baseline justify-end gap-3 mb-3 text-[10px] uppercase tracking-[0.14em] text-stone-500 font-mono">
                  <span className="w-6 text-right">Good</span>
                  <span className="w-6 text-right">Harm</span>
                  <span className="w-8 text-right">Net</span>
                </div>
                <ul className="divide-y divide-stone-300/40">
                  {cat.subCriteria.map((sub) => {
                    const subTargetId = `${president.id}:${sub.id}`;
                    return (
                      <SubCriterionRow
                        key={sub.number}
                        sub={sub}
                        presidentId={president.id}
                        presidentDisplayName={president.displayName}
                        voteTargetId={subTargetId}
                        voteCounts={subVotes.get(subTargetId) ?? emptyVoteCounts()}
                        communityScore={
                          communityScores.get(sub.id) ?? emptyCommunityScore()
                        }
                        user={user}
                      />
                    );
                  })}
                </ul>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}

function SubCriterionRow({
  sub,
  presidentId,
  presidentDisplayName,
  voteTargetId,
  voteCounts,
  communityScore,
  user,
}: {
  sub: {
    id: string;
    number: string;
    name: string;
    goodScore: number | null;
    harmScore: number | null;
    net: number | null;
    notes: string | null;
    lowConfidence: boolean;
    insufficientTimeElapsed: boolean;
    tentativeLongTail: boolean;
    scoreStatus: string | null;
    eraContext: string | null;
    evidenceCount: number;
    evidence: EvidenceItem[];
  };
  presidentId: string;
  presidentDisplayName: string;
  voteTargetId: string;
  voteCounts: VoteCounts;
  communityScore: CommunityScore;
  user: SessionUser | null;
}) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
        <Link
          href={`/sub-criterion/${sub.number}` as `/sub-criterion/${string}`}
          className="font-mono text-xs text-stone-500 w-10 shrink-0 hover:text-rust-700"
          title="See all 16 presidents on this sub-criterion"
        >
          {sub.number}
        </Link>
        <Link
          href={`/sub-criterion/${sub.number}` as `/sub-criterion/${string}`}
          className="font-medium text-sm flex-1 min-w-[10rem] hover:text-rust-700"
        >
          {sub.name}
        </Link>
        <ScoreCell good={sub.goodScore} harm={sub.harmScore} net={sub.net} />
      </div>
      {sub.notes && (
        <p className="text-xs text-charcoal-700 mt-1 pl-12 leading-relaxed">
          {sub.notes}
        </p>
      )}
      {(sub.lowConfidence ||
        sub.insufficientTimeElapsed ||
        sub.tentativeLongTail ||
        sub.scoreStatus === "provisional" ||
        sub.eraContext) && (
        <div className="pl-12 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em]">
          {sub.scoreStatus === "provisional" && (
            <span
              className="inline-flex items-center gap-1 border border-rust-700/70 bg-rust-700/10 text-rust-800 rounded-sm px-1.5 py-0.5 font-medium"
              title="Score is materially based on a matter currently in litigation or otherwise unadjudicated; it may change as the underlying matter resolves."
            >
              <span aria-hidden>§</span> Provisional — pending adjudication
            </span>
          )}
          {sub.lowConfidence && (
            <span className="text-stone-500">low confidence</span>
          )}
          {sub.insufficientTimeElapsed && (
            <span className="text-rust-700">insufficient time elapsed</span>
          )}
          {sub.tentativeLongTail && (
            <span className="text-rust-700">tentative long-tail</span>
          )}
          {sub.eraContext && (
            <span className="text-stone-500">{sub.eraContext}</span>
          )}
        </div>
      )}
      <div className="pl-12 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <VoteWidget
          targetType="sub_criterion"
          targetId={voteTargetId}
          initial={voteCounts}
          authed={!!user}
        />
        <CommunityScoreCell community={communityScore} />
      </div>
      <div className="pl-12 mt-2">
        <SubmitScoreAffordance
          presidentId={presidentId}
          subCriterionId={sub.id}
          subCriterionLabel={`${sub.number} ${sub.name}`}
          presidentDisplayName={presidentDisplayName}
          user={user}
        />
      </div>
      <EvidenceList items={sub.evidence} />
    </li>
  );
}

function ScoreCell({
  good,
  harm,
  net,
}: {
  good: number | null;
  harm: number | null;
  net: number | null;
}) {
  if (good === null || harm === null) {
    return (
      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-stone-400">
        <span className="w-6 text-right">—</span>
        <span className="w-6 text-right">—</span>
        <span className="w-8 text-right">n/a</span>
      </div>
    );
  }
  if (good === 0 && harm === 0) {
    return (
      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-stone-400">
        <span className="w-6 text-right">—</span>
        <span className="w-6 text-right">—</span>
        <span className="w-8 text-right text-[10px]">era n/a</span>
      </div>
    );
  }
  const netDisplay = net !== null ? (net >= 0 ? "+" : "") + net : "";
  return (
    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
      <span className="text-good-700 w-6 text-right">+{good}</span>
      <span className="text-rust-700 w-6 text-right">−{harm}</span>
      <span className="text-charcoal-700 w-8 text-right font-semibold">
        {netDisplay}
      </span>
    </div>
  );
}

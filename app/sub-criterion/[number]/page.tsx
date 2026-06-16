import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSubCriterionByNumber,
  getSubCriterionNumbers,
  type PresidentScoreOnSub,
} from "@/lib/queries";
import { formatTerm, partyLabel } from "@/lib/format";
import { SITE_NAME } from "@/lib/site-config";
import { EvidenceList } from "@/components/evidence-list";
import { VoteWidget } from "@/components/vote-widget";
import { CommunityScoreCell } from "@/components/community-score-cell";
import { SubmitScoreAffordance } from "@/components/submit-score-affordance";
import { currentUser, type SessionUser } from "@/lib/auth";
import {
  getVoteCounts,
  emptyVoteCounts,
  type VoteCounts,
} from "@/lib/votes";
import {
  getCommunityScoresForSubCriterion,
  emptyCommunityScore,
  type CommunityScore,
} from "@/lib/community-scores";

export async function generateStaticParams() {
  // Guard the DB call so a first-deploy state (migrations not yet applied,
  // empty Supabase schema) doesn't crash the build. Empty array means
  // "no pre-rendered routes" — pages render dynamically on first request.
  try {
    const numbers = await getSubCriterionNumbers();
    return numbers.map((number) => ({ number }));
  } catch (e) {
    console.warn(
      "[sub-criterion/[number]] generateStaticParams: DB unavailable, deferring to runtime.",
      e instanceof Error ? e.message : e
    );
    return [];
  }
}

export async function generateMetadata(
  props: {
    params: Promise<{ number: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const sub = await getSubCriterionByNumber(params.number);
  if (!sub) return { title: "Not found" };
  const title = `${sub.number} ${sub.name}`;
  const description = `All 16 modern US presidents ranked by their score on ${sub.name} (sub-criterion ${sub.number}, ${sub.category.name}).`;
  const ogImage = `/api/og/sub-criterion/${sub.number}`;
  const canonical = `/sub-criterion/${sub.number}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} — cross-president comparison`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function SubCriterionPage(
  props: {
    params: Promise<{ number: string }>;
  }
) {
  const params = await props.params;
  const [sub, user] = await Promise.all([
    getSubCriterionByNumber(params.number),
    currentUser(),
  ]);
  if (!sub) notFound();

  const ranked = sub.scores.filter((s) => s.net !== null);
  const naScores = sub.scores.filter((s) => s.net === null);

  // Each row's vote target is keyed by (presidentId, subCriterionId).
  const subTargetIds = ranked.map((s) => `${s.presidentId}:${sub.id}`);
  const presidentIds = ranked.map((s) => s.presidentId);
  const [voteCounts, communityScores] = await Promise.all([
    getVoteCounts("sub_criterion", subTargetIds, user?.id ?? null),
    getCommunityScoresForSubCriterion(sub.id, presidentIds),
  ]);

  return (
    <article>
      <nav className="mb-8 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/" className="text-stone-600 hover:text-rust-700">
          ← The Full Index
        </Link>
        <span className="text-stone-400">·</span>
        <Link
          href="/methodology"
          className="text-stone-600 hover:text-rust-700"
        >
          Methodology
        </Link>
      </nav>

      <header className="mb-12 max-w-4xl">
        <div className="text-[11px] uppercase tracking-[0.18em] text-rust-700 mb-3">
          Category {sub.category.number} · {sub.category.name}
        </div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="font-mono text-stone-400 text-3xl sm:text-4xl">
            {sub.number}
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl leading-tight tracking-tight">
            {sub.name}
          </h1>
        </div>
        <p className="text-stone-500 text-sm italic mt-4">
          All 16 modern US presidents ranked by their net score on this single
          sub-criterion. Good and harm are scored 0–10 independently; net is
          good minus harm. Click a name for the full scorecard.
        </p>
      </header>

      <section className="border-y border-stone-300/60 divide-y divide-stone-300/60">
        {ranked.map((s, i) => {
          const targetId = `${s.presidentId}:${sub.id}`;
          return (
            <Row
              key={s.slug}
              rank={i + 1}
              s={s}
              voteTargetId={targetId}
              voteCounts={voteCounts.get(targetId) ?? emptyVoteCounts()}
              communityScore={
                communityScores.get(s.presidentId) ?? emptyCommunityScore()
              }
              subCriterionId={sub.id}
              subCriterionLabel={`${sub.number} ${sub.name}`}
              user={user}
            />
          );
        })}
        {naScores.length > 0 && (
          <div className="py-8">
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-4">
              Not scored on this sub-criterion
            </div>
            <ul className="space-y-1 text-sm text-stone-600">
              {naScores.map((s) => (
                <li key={s.slug} className="flex items-baseline gap-3">
                  <span>{s.displayName}</span>
                  <span className="text-xs text-stone-400">
                    {formatTerm(s.termStart, s.termEnd)}
                    {s.insufficientTimeElapsed && " · insufficient time elapsed"}
                    {s.goodScore === 0 && s.harmScore === 0 && " · era n/a"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </article>
  );
}

function Row({
  rank,
  s,
  voteTargetId,
  voteCounts,
  communityScore,
  subCriterionId,
  subCriterionLabel,
  user,
}: {
  rank: number;
  s: PresidentScoreOnSub;
  voteTargetId: string;
  voteCounts: VoteCounts;
  communityScore: CommunityScore;
  subCriterionId: string;
  subCriterionLabel: string;
  user: SessionUser | null;
}) {
  const net = s.net ?? 0;
  const positive = net >= 0;
  return (
    <article className="grid grid-cols-12 gap-x-4 sm:gap-x-6 gap-y-2 items-baseline py-7 sm:py-8">
      <div className="col-span-2 sm:col-span-1 font-display italic text-stone-400 text-2xl sm:text-3xl tabular-nums">
        {String(rank).padStart(2, "0")}
      </div>
      <div className="col-span-10 sm:col-span-4 min-w-0">
        <Link
          href={`/president/${s.slug}` as `/president/${string}`}
          className="font-display font-bold text-xl sm:text-2xl leading-tight tracking-tight hover:text-rust-700 transition block"
        >
          {s.displayName}
        </Link>
        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mt-1">
          {partyLabel(s.party)} · {formatTerm(s.termStart, s.termEnd)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
          <VoteWidget
            targetType="sub_criterion"
            targetId={voteTargetId}
            initial={voteCounts}
            authed={!!user}
          />
        </div>
        <div className="mt-2">
          <CommunityScoreCell community={communityScore} />
        </div>
        <div className="mt-2">
          <SubmitScoreAffordance
            presidentId={s.presidentId}
            subCriterionId={subCriterionId}
            subCriterionLabel={subCriterionLabel}
            presidentDisplayName={s.displayName}
            user={user}
          />
        </div>
      </div>
      <div className="col-span-12 sm:col-span-4 order-last sm:order-none">
        {s.notes && (
          <p className="text-sm text-charcoal-700 leading-snug">{s.notes}</p>
        )}
        {(s.lowConfidence ||
          s.tentativeLongTail ||
          s.scoreStatus === "provisional" ||
          s.eraContext) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em]">
            {s.scoreStatus === "provisional" && (
              <span
                className="inline-flex items-center gap-1 border border-rust-700/70 bg-rust-700/10 text-rust-800 rounded-sm px-1.5 py-0.5 font-medium"
                title="Score is materially based on a matter currently in litigation or otherwise unadjudicated; it may change as the underlying matter resolves."
              >
                <span aria-hidden>§</span> Provisional — pending adjudication
              </span>
            )}
            {s.lowConfidence && (
              <span className="text-stone-500">low confidence</span>
            )}
            {s.tentativeLongTail && (
              <span className="text-rust-700">tentative long-tail</span>
            )}
            {s.eraContext && (
              <span className="text-stone-500">{s.eraContext}</span>
            )}
          </div>
        )}
        <div className="-ml-12">
          <EvidenceList items={s.evidence} />
        </div>
      </div>
      <div className="col-span-7 sm:col-span-2 text-xs sm:text-sm font-mono tabular-nums text-stone-700">
        <span className="text-good-700">+{s.goodScore}</span>
        <span className="text-stone-400 mx-1.5">/</span>
        <span className="text-rust-700">−{s.harmScore}</span>
      </div>
      <div className="col-span-5 sm:col-span-1 text-right">
        <span
          className={`font-display font-bold text-2xl sm:text-3xl tabular-nums ${
            positive ? "text-good-700" : "text-rust-700"
          }`}
        >
          {positive && net !== 0 ? "+" : ""}
          {net}
        </span>
      </div>
    </article>
  );
}

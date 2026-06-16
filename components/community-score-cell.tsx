import type { CommunityScore } from "@/lib/community-scores";
import { DISPLAY_MIN } from "@/lib/community-scores";

/**
 * Inline display of community aggregate score alongside the canonical score.
 * When N < DISPLAY_MIN, shows just the contributor count so users know it's
 * accumulating; when N ≥ DISPLAY_MIN, shows the median good/harm/net.
 */
export function CommunityScoreCell({
  community,
}: {
  community: CommunityScore;
}) {
  if (community.count === 0) {
    // Empty state is silent: the adjacent SubmitScoreAffordance ("Add your
    // score →") is the only affordance worth showing, and leaving the
    // placeholder out keeps the vote widget visually distinct from the
    // community-scoring cluster.
    return null;
  }
  if (!community.shouldDisplay) {
    return (
      <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500 font-mono">
        Community: N={community.count} (unlocks at {DISPLAY_MIN})
      </span>
    );
  }
  const netDisplay =
    community.netMedian !== null
      ? (community.netMedian >= 0 ? "+" : "") + community.netMedian.toFixed(1)
      : "—";
  return (
    <span className="inline-flex items-baseline gap-2 text-[10px] uppercase tracking-[0.16em]">
      <span className="text-stone-500">
        Community · N={community.count}
      </span>
      <span className="font-mono tabular-nums">
        <span className="text-good-500">
          +{community.medianGood?.toFixed(1)}
        </span>
        <span className="text-stone-400 mx-1">/</span>
        <span className="text-harm-500">
          −{community.medianHarm?.toFixed(1)}
        </span>
        <span
          className={`ml-2 font-semibold ${
            (community.netMedian ?? 0) >= 0 ? "text-good-700" : "text-rust-700"
          }`}
        >
          {netDisplay}
        </span>
      </span>
    </span>
  );
}

// Outlier detection on user-submitted scores. For each (president, sub-criterion)
// with enough contributors, compute the median + median absolute deviation (MAD)
// of nets, then flag any contributor more than `MAD_THRESHOLD` MADs away.
//
// Outlier-flagged scores:
//   - Set UserScore.outlierFlag = true
//   - Submitter's reputation drops by REPUTATION_DECREMENT (floor at 0)
//
// MAD is a robust alternative to standard deviation; the original spec
// called for "3σ" but in practice with skewed score distributions MAD is more stable.
// We treat 1.4826 × MAD ≈ σ for normal distributions and apply the 3× threshold
// to that scaled value.
//
// Idempotent: re-running clears the outlier flag for scores that have moved back
// inside the threshold (e.g. as more contributors arrive). Reputation, however,
// is not refunded — the historical penalty stands once applied.

import { prisma } from "./prisma";

export const MIN_CONTRIBUTORS = 10;
export const MAD_SIGMA_SCALE = 1.4826; // converts MAD to σ-equivalent
export const MAD_THRESHOLD = 3;
export const REPUTATION_DECREMENT = 0.1;
export const REPUTATION_FLOOR = 0;

interface OutlierStats {
  examinedGroups: number;
  flaggedThisRun: number;
  unflaggedThisRun: number;
  reputationDecrements: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function detectOutliers(): Promise<OutlierStats> {
  const stats: OutlierStats = {
    examinedGroups: 0,
    flaggedThisRun: 0,
    unflaggedThisRun: 0,
    reputationDecrements: 0,
  };

  // Pull all scorable user scores grouped by (presidentId, subCriterionId)
  const scores = await prisma.userScore.findMany({
    where: { goodScore: { not: null }, harmScore: { not: null } },
    select: {
      id: true,
      userId: true,
      presidentId: true,
      subCriterionId: true,
      goodScore: true,
      harmScore: true,
      outlierFlag: true,
    },
  });

  // Bucket by (presidentId, subCriterionId)
  type Score = (typeof scores)[number];
  const groups = new Map<string, Score[]>();
  for (const s of scores) {
    const key = `${s.presidentId}:${s.subCriterionId}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  const newlyFlaggedUserIds = new Set<string>();
  const flagUpdates: { id: string; outlierFlag: boolean }[] = [];

  for (const [, members] of groups) {
    if (members.length < MIN_CONTRIBUTORS) {
      // Not enough data to call anyone an outlier
      for (const s of members) {
        if (s.outlierFlag) flagUpdates.push({ id: s.id, outlierFlag: false });
      }
      continue;
    }
    stats.examinedGroups += 1;

    const nets = members.map((s) => (s.goodScore ?? 0) - (s.harmScore ?? 0));
    const groupMedian = median(nets);
    const absDevs = nets.map((v) => Math.abs(v - groupMedian));
    const mad = median(absDevs);
    // MAD = 0 means everyone agrees — no one is an outlier.
    if (mad === 0) {
      for (const s of members) {
        if (s.outlierFlag) flagUpdates.push({ id: s.id, outlierFlag: false });
      }
      continue;
    }
    const sigma = mad * MAD_SIGMA_SCALE;
    const upper = groupMedian + MAD_THRESHOLD * sigma;
    const lower = groupMedian - MAD_THRESHOLD * sigma;

    for (let i = 0; i < members.length; i++) {
      const s = members[i];
      const v = nets[i];
      const isOutlier = v > upper || v < lower;
      if (isOutlier && !s.outlierFlag) {
        flagUpdates.push({ id: s.id, outlierFlag: true });
        newlyFlaggedUserIds.add(s.userId);
        stats.flaggedThisRun += 1;
      } else if (!isOutlier && s.outlierFlag) {
        flagUpdates.push({ id: s.id, outlierFlag: false });
        stats.unflaggedThisRun += 1;
      }
    }
  }

  // Apply outlier-flag changes
  for (const u of flagUpdates) {
    await prisma.userScore.update({
      where: { id: u.id },
      data: { outlierFlag: u.outlierFlag },
    });
  }

  // Reputation decrement: -REPUTATION_DECREMENT per newly-flagged user, capped
  // at REPUTATION_FLOOR. One decrement per user per run regardless of how many
  // scores got flagged in this run — keeps the cost proportional to user, not
  // submission count.
  for (const userId of newlyFlaggedUserIds) {
    const user = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: { reputationScore: true },
    });
    if (!user) continue;
    const current = Number(user.reputationScore);
    const next = Math.max(REPUTATION_FLOOR, current - REPUTATION_DECREMENT);
    if (next < current) {
      await prisma.userProfile.update({
        where: { id: userId },
        data: { reputationScore: next },
      });
      stats.reputationDecrements += 1;
    }
  }

  return stats;
}

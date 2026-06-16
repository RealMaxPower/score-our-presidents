// Community-score read helpers. Computes median good/harm/net per
// (president, sub-criterion) from `UserScore` rows on demand.
//
// Future state: nightly BullMQ worker writes pre-aggregated rows to
// `CommunityScoreSnapshot`, and this module reads from that table. The
// `subCriterionCommunityScores` shape stays the same either way.
//
// Display threshold: surface a community aggregate only when N ≥ DISPLAY_MIN.

import { prisma } from "./prisma";

export const DISPLAY_MIN = 5;

export interface CommunityScore {
  count: number; // total contributors (incl. low-confidence)
  countQualifying: number; // contributors above reputation floor
  medianGood: number | null;
  medianHarm: number | null;
  netMedian: number | null;
  shouldDisplay: boolean; // count >= DISPLAY_MIN
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function emptyCommunityScore(): CommunityScore {
  return {
    count: 0,
    countQualifying: 0,
    medianGood: null,
    medianHarm: null,
    netMedian: null,
    shouldDisplay: false,
  };
}

/**
 * Aggregate community scores for one president across many sub-criteria.
 * Used by the scorecard page (1 president × 56 sub-criteria).
 */
export async function getCommunityScoresForPresident(
  presidentId: string,
  subCriterionIds: string[]
): Promise<Map<string, CommunityScore>> {
  if (subCriterionIds.length === 0) return new Map();

  const rows = await prisma.userScore.findMany({
    where: {
      presidentId,
      subCriterionId: { in: subCriterionIds },
      goodScore: { not: null },
      harmScore: { not: null },
    },
    select: {
      subCriterionId: true,
      goodScore: true,
      harmScore: true,
      user: { select: { reputationScore: true } },
    },
  });

  const buckets = new Map<string, { good: number[]; harm: number[] }>();
  for (const r of rows) {
    if (r.goodScore === null || r.harmScore === null) continue;
    const repNum = Number(r.user.reputationScore);
    if (repNum <= 0) continue; // zero-reputation scores hidden
    const bucket = buckets.get(r.subCriterionId) ?? { good: [], harm: [] };
    bucket.good.push(r.goodScore);
    bucket.harm.push(r.harmScore);
    buckets.set(r.subCriterionId, bucket);
  }

  const out = new Map<string, CommunityScore>();
  for (const [subId, b] of buckets) {
    const mg = median(b.good);
    const mh = median(b.harm);
    out.set(subId, {
      count: b.good.length,
      countQualifying: b.good.length,
      medianGood: mg,
      medianHarm: mh,
      netMedian: mg - mh,
      shouldDisplay: b.good.length >= DISPLAY_MIN,
    });
  }
  return out;
}

/**
 * Aggregate community scores for one sub-criterion across many presidents.
 * Used by the sub-criterion cross-president page (1 sub-criterion × 16 presidents).
 */
export async function getCommunityScoresForSubCriterion(
  subCriterionId: string,
  presidentIds: string[]
): Promise<Map<string, CommunityScore>> {
  if (presidentIds.length === 0) return new Map();

  const rows = await prisma.userScore.findMany({
    where: {
      subCriterionId,
      presidentId: { in: presidentIds },
      goodScore: { not: null },
      harmScore: { not: null },
    },
    select: {
      presidentId: true,
      goodScore: true,
      harmScore: true,
      user: { select: { reputationScore: true } },
    },
  });

  const buckets = new Map<string, { good: number[]; harm: number[] }>();
  for (const r of rows) {
    if (r.goodScore === null || r.harmScore === null) continue;
    const repNum = Number(r.user.reputationScore);
    if (repNum <= 0) continue;
    const bucket = buckets.get(r.presidentId) ?? { good: [], harm: [] };
    bucket.good.push(r.goodScore);
    bucket.harm.push(r.harmScore);
    buckets.set(r.presidentId, bucket);
  }

  const out = new Map<string, CommunityScore>();
  for (const [pid, b] of buckets) {
    const mg = median(b.good);
    const mh = median(b.harm);
    out.set(pid, {
      count: b.good.length,
      countQualifying: b.good.length,
      medianGood: mg,
      medianHarm: mh,
      netMedian: mg - mh,
      shouldDisplay: b.good.length >= DISPLAY_MIN,
    });
  }
  return out;
}

/** Get current user's existing score on one (president, sub-criterion). */
export async function getUserScoreFor(
  userId: string,
  presidentId: string,
  subCriterionId: string
) {
  return prisma.userScore.findUnique({
    where: {
      userId_presidentId_subCriterionId: { userId, presidentId, subCriterionId },
    },
    include: { evidence: true },
  });
}

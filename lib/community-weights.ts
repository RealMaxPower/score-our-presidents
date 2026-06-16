// Community-weights aggregation: per-category median + IQR computed from all
// users with email_verified AND account_age ≥ QUALIFYING_AGE_DAYS.
//
// The age cutoff is small (1 day) and invisible to contributors — their
// weight vector lands the moment they save it; this just keeps fresh-zero-age
// bot accounts from instantly moving the median. Real anti-brigading
// happens at submission (email-verify + IP rate limit) and aggregation
// (outlier detection + reputation discount).
//
// Display threshold: page is gated on N ≥ DISPLAY_MIN_USERS so a small early
// user pool can't produce a misleading "community" signal.

import { prisma } from "./prisma";

export const DISPLAY_MIN_USERS = 100;
export const QUALIFYING_AGE_DAYS = 1;

export interface CommunityCategoryWeight {
  categoryId: string;
  categoryNumber: number;
  categoryName: string;
  defaultWeight: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  contributorCount: number;
}

export interface CommunityWeightsAggregate {
  qualifyingUserCount: number;
  shouldDisplay: boolean;
  perCategory: CommunityCategoryWeight[];
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export async function getCommunityWeights(): Promise<CommunityWeightsAggregate> {
  // Cutoff: users created at least QUALIFYING_AGE_DAYS days ago
  const cutoff = new Date(
    Date.now() - QUALIFYING_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  // 1. Pull qualifying user ids (verified + account at least 24h old + not deleted)
  const qualifyingUsers = await prisma.userProfile.findMany({
    where: {
      emailVerified: true,
      accountCreatedAt: { lte: cutoff },
      deletedAt: null,
    },
    select: { id: true },
  });
  const userIds = qualifyingUsers.map((u) => u.id);

  const categories = await prisma.category.findMany({
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      defaultWeight: true,
    },
  });

  const baseRow = (c: (typeof categories)[number]): CommunityCategoryWeight => ({
    categoryId: c.id,
    categoryNumber: c.number,
    categoryName: c.name,
    defaultWeight: Number(c.defaultWeight),
    median: 0,
    q1: 0,
    q3: 0,
    iqr: 0,
    contributorCount: 0,
  });

  if (userIds.length === 0) {
    return {
      qualifyingUserCount: 0,
      shouldDisplay: false,
      perCategory: categories.map(baseRow),
    };
  }

  // 2. All weights from qualifying users
  const weightRows = await prisma.userWeight.findMany({
    where: { userId: { in: userIds } },
    select: { categoryId: true, weight: true },
  });

  // Bucket by categoryId
  const buckets = new Map<string, number[]>();
  for (const w of weightRows) {
    const arr = buckets.get(w.categoryId) ?? [];
    arr.push(Number(w.weight));
    buckets.set(w.categoryId, arr);
  }

  const perCategory: CommunityCategoryWeight[] = categories.map((c) => {
    const bucket = buckets.get(c.id) ?? [];
    if (bucket.length === 0) return baseRow(c);
    const sorted = [...bucket].sort((a, b) => a - b);
    const median = quantile(sorted, 0.5);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    return {
      categoryId: c.id,
      categoryNumber: c.number,
      categoryName: c.name,
      defaultWeight: Number(c.defaultWeight),
      median,
      q1,
      q3,
      iqr: q3 - q1,
      contributorCount: bucket.length,
    };
  });

  return {
    qualifyingUserCount: userIds.length,
    shouldDisplay: userIds.length >= DISPLAY_MIN_USERS,
    perCategory,
  };
}

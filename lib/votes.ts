// Vote aggregation read helpers. The write path lives in app/api/votes/route.ts.

import { prisma } from "./prisma";

export type VoteTargetType = "sub_criterion" | "category" | "president";
export type VoteDirection = "agree" | "disagree";

export const VOTE_TARGET_TYPES: VoteTargetType[] = [
  "sub_criterion",
  "category",
  "president",
];

export interface VoteCounts {
  agree: number;
  disagree: number;
  userVote: VoteDirection | null; // current user's vote on this target, if any
}

export type VoteCountsByTarget = Map<string, VoteCounts>;

/**
 * Fetch agree/disagree counts for all targets of a given type, optionally
 * including the current user's existing vote on each target.
 *
 * Returns a Map keyed by `targetId`. Targets with no votes are absent from the
 * map; callers should default to `{ agree: 0, disagree: 0, userVote: null }`.
 */
export async function getVoteCounts(
  targetType: VoteTargetType,
  targetIds: string[],
  currentUserId: string | null
): Promise<VoteCountsByTarget> {
  if (targetIds.length === 0) return new Map();

  const grouped = await prisma.userVote.groupBy({
    by: ["targetId", "direction"],
    where: { targetType, targetId: { in: targetIds } },
    _count: { _all: true },
  });

  const map: VoteCountsByTarget = new Map();
  for (const row of grouped) {
    const entry = map.get(row.targetId) ?? {
      agree: 0,
      disagree: 0,
      userVote: null,
    };
    if (row.direction === "agree") entry.agree = row._count._all;
    if (row.direction === "disagree") entry.disagree = row._count._all;
    map.set(row.targetId, entry);
  }

  if (currentUserId) {
    const mine = await prisma.userVote.findMany({
      where: {
        userId: currentUserId,
        targetType,
        targetId: { in: targetIds },
      },
      select: { targetId: true, direction: true },
    });
    for (const m of mine) {
      const entry = map.get(m.targetId) ?? {
        agree: 0,
        disagree: 0,
        userVote: null,
      };
      entry.userVote = m.direction as VoteDirection;
      map.set(m.targetId, entry);
    }
  }

  return map;
}

/** Counts for targets of every type, keyed by targetId within each type. */
export interface VoteCountsByType {
  president: VoteCountsByTarget;
  category: VoteCountsByTarget;
  sub_criterion: VoteCountsByTarget;
}

/**
 * Batched variant of {@link getVoteCounts}: fetch agree/disagree counts (and
 * the current user's own vote) for targets of ALL three types in a single pair
 * of queries, instead of one pair per type.
 *
 * The president scorecard needs counts for the president, every category, and
 * every sub-criterion at once. Issuing those as three separate getVoteCounts
 * calls inside one `Promise.all` opened up to six concurrent connections; under
 * a Neon cold start or concurrent renders that exhausted the pool and threw
 * PrismaClientKnownRequestError P2024. Collapsing to one groupBy + one
 * findMany caps this path at two sequential connections.
 */
export async function getVoteCountsForTargets(
  targetsByType: {
    president: string[];
    category: string[];
    sub_criterion: string[];
  },
  currentUserId: string | null
): Promise<VoteCountsByType> {
  const out: VoteCountsByType = {
    president: new Map(),
    category: new Map(),
    sub_criterion: new Map(),
  };

  // One OR clause per type that actually has targets — skip empties so the
  // filter never widens to "all rows of this type".
  const orClauses = VOTE_TARGET_TYPES.flatMap((targetType) =>
    targetsByType[targetType].length
      ? [{ targetType, targetId: { in: targetsByType[targetType] } }]
      : []
  );
  if (orClauses.length === 0) return out;

  const grouped = await prisma.userVote.groupBy({
    by: ["targetType", "targetId", "direction"],
    where: { OR: orClauses },
    _count: { _all: true },
  });
  for (const row of grouped) {
    const map = out[row.targetType as VoteTargetType];
    const entry = map.get(row.targetId) ?? {
      agree: 0,
      disagree: 0,
      userVote: null,
    };
    if (row.direction === "agree") entry.agree = row._count._all;
    if (row.direction === "disagree") entry.disagree = row._count._all;
    map.set(row.targetId, entry);
  }

  if (currentUserId) {
    const mine = await prisma.userVote.findMany({
      where: { userId: currentUserId, OR: orClauses },
      select: { targetType: true, targetId: true, direction: true },
    });
    for (const m of mine) {
      const map = out[m.targetType as VoteTargetType];
      const entry = map.get(m.targetId) ?? {
        agree: 0,
        disagree: 0,
        userVote: null,
      };
      entry.userVote = m.direction as VoteDirection;
      map.set(m.targetId, entry);
    }
  }

  return out;
}

/** Convenience: empty counts for targets with no votes yet. */
export function emptyVoteCounts(): VoteCounts {
  return { agree: 0, disagree: 0, userVote: null };
}

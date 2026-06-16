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

/** Convenience: empty counts for targets with no votes yet. */
export function emptyVoteCounts(): VoteCounts {
  return { agree: 0, disagree: 0, userVote: null };
}

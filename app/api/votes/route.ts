// POST /api/votes   body: { targetType, targetId, direction }
//   - upsert: same direction is no-op; opposite direction replaces; first time creates
// DELETE /api/votes  body: { targetType, targetId }
//   - revoke the current user's vote (idempotent)
//
// Always returns the post-write { agree, disagree, userVote } so the client can
// reconcile optimistic state.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { VOTE_TARGET_TYPES, emptyVoteCounts } from "@/lib/votes";
import { enforce, VOTE_PER_MINUTE, VOTE_PER_HOUR } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/http";

// targetId is a string composed by the caller:
//   president     → "{presidentId}"             (one UUID)
//   category      → "{presidentId}:{categoryId}" (two UUIDs)
//   sub_criterion → "{presidentId}:{subCriterionId}" (two UUIDs)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_PAIR_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidTargetId(targetType: string, targetId: string): boolean {
  if (targetType === "president") return UUID_RE.test(targetId);
  return UUID_PAIR_RE.test(targetId); // category, sub_criterion
}

const targetIdRefinement = (
  data: { targetType: string; targetId: string },
  ctx: z.RefinementCtx
) => {
  if (!isValidTargetId(data.targetType, data.targetId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetId"],
      message:
        data.targetType === "president"
          ? "targetId must be a UUID"
          : "targetId must be `presidentUuid:targetUuid`",
    });
  }
};

const postSchema = z
  .object({
    targetType: z.enum(VOTE_TARGET_TYPES as [string, ...string[]]),
    targetId: z.string().min(1).max(120),
    direction: z.enum(["agree", "disagree"]),
  })
  .superRefine(targetIdRefinement);

const deleteSchema = z
  .object({
    targetType: z.enum(VOTE_TARGET_TYPES as [string, ...string[]]),
    targetId: z.string().min(1).max(120),
  })
  .superRefine(targetIdRefinement);

async function countsFor(targetType: string, targetId: string, userId: string) {
  const grouped = await prisma.userVote.groupBy({
    by: ["direction"],
    where: { targetType, targetId },
    _count: { _all: true },
  });
  const counts = emptyVoteCounts();
  for (const row of grouped) {
    if (row.direction === "agree") counts.agree = row._count._all;
    if (row.direction === "disagree") counts.disagree = row._count._all;
  }
  const mine = await prisma.userVote.findUnique({
    where: {
      userId_targetType_targetId: { userId, targetType, targetId },
    },
    select: { direction: true },
  });
  counts.userVote = (mine?.direction as "agree" | "disagree" | undefined) ?? null;
  return counts;
}

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const minute = await enforce(`vote:min:${user.id}`, VOTE_PER_MINUTE);
  const hour = await enforce(`vote:hr:${user.id}`, VOTE_PER_HOUR);
  if (!minute.ok || !hour.ok) {
    const wait = Math.max(minute.retryAfterMs ?? 0, hour.retryAfterMs ?? 0);
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterMs: wait },
      { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const { targetType, targetId, direction } = parsed.data;

  await prisma.userVote.upsert({
    where: {
      userId_targetType_targetId: { userId: user.id, targetType, targetId },
    },
    update: { direction },
    create: { userId: user.id, targetType, targetId, direction },
  });

  const counts = await countsFor(targetType, targetId, user.id);
  return NextResponse.json({ counts });
}

export async function DELETE(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const { targetType, targetId } = parsed.data;

  await prisma.userVote.deleteMany({
    where: { userId: user.id, targetType, targetId },
  });

  const counts = await countsFor(targetType, targetId, user.id);
  return NextResponse.json({ counts });
}

// POST   /api/user-scores  body: { presidentId, subCriterionId, goodScore, harmScore, notes, evidence: [{...}] }
//   - Gated on email_verified + reputation≥0.5
//   - Upserts on (userId, presidentId, subCriterionId) — re-submission updates the score
//   - Inserts/replaces Evidence rows
// DELETE /api/user-scores  body: { userScoreId }
//   - Owner-only delete

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import {
  evaluateEligibility,
  SOURCE_TYPES,
  evidenceSourceUrl,
} from "@/lib/user-scores";
import { enforce, SUBMIT_PER_HOUR } from "@/lib/rate-limit";
import { requireJsonContentType } from "@/lib/http";
import { isAdminUnlocked } from "@/lib/admin";
import { logAuditEvent } from "@/lib/audit";

const evidenceItem = z.object({
  sourceUrl: evidenceSourceUrl,
  claim: z.string().min(10).max(500),
  direction: z.enum(["good", "harm"]),
  sourceType: z.enum(SOURCE_TYPES).default("journalism"),
  tier: z.number().int().min(1).max(4).default(2),
});

const postSchema = z.object({
  presidentId: z.string().uuid(),
  subCriterionId: z.string().uuid(),
  goodScore: z.number().int().min(0).max(10),
  harmScore: z.number().int().min(0).max(10),
  notes: z.string().min(10).max(500),
  evidence: z.array(evidenceItem).min(1).max(8),
});

const deleteSchema = z.object({
  userScoreId: z.string().uuid(),
});

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const elig = evaluateEligibility(user);
  if (!elig.eligible) {
    return NextResponse.json(
      { error: "NOT_ELIGIBLE", reasons: elig.reasons },
      { status: 403 }
    );
  }
  const rl = await enforce(`submit:hr:${user.id}`, SUBMIT_PER_HOUR);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterMs: rl.retryAfterMs ?? 0 },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)),
        },
      }
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
  const data = parsed.data;

  // Verify referenced President + SubCriterion exist
  const [president, sub] = await Promise.all([
    prisma.president.findUnique({
      where: { id: data.presidentId },
      select: { id: true },
    }),
    prisma.subCriterion.findUnique({
      where: { id: data.subCriterionId },
      select: { id: true },
    }),
  ]);
  if (!president || !sub) {
    return NextResponse.json(
      { error: "TARGET_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Upsert UserScore + replace its Evidence rows in a single transaction
  const { userScore, wasUpdate } = await prisma.$transaction(async (tx) => {
    const existing = await tx.userScore.findUnique({
      where: {
        userId_presidentId_subCriterionId: {
          userId: user.id,
          presidentId: data.presidentId,
          subCriterionId: data.subCriterionId,
        },
      },
    });

    const score = existing
      ? await tx.userScore.update({
          where: { id: existing.id },
          data: {
            goodScore: data.goodScore,
            harmScore: data.harmScore,
            notes: data.notes,
          },
        })
      : await tx.userScore.create({
          data: {
            userId: user.id,
            presidentId: data.presidentId,
            subCriterionId: data.subCriterionId,
            goodScore: data.goodScore,
            harmScore: data.harmScore,
            notes: data.notes,
          },
        });

    if (existing) {
      await tx.evidence.deleteMany({ where: { userScoreId: existing.id } });
    }
    await tx.evidence.createMany({
      data: data.evidence.map((e) => ({
        userScoreId: score.id,
        sourceUrl: e.sourceUrl,
        claim: e.claim,
        direction: e.direction,
        sourceType: e.sourceType,
        tier: e.tier,
        verificationStatus: "pending",
      })),
    });

    return { userScore: score, wasUpdate: Boolean(existing) };
  });

  await logAuditEvent({
    action: wasUpdate ? "user_score.update" : "user_score.create",
    actorId: user.id,
    targetType: "user_score",
    targetId: userScore.id,
    request,
    metadata: {
      presidentId: data.presidentId,
      subCriterionId: data.subCriterionId,
      evidenceCount: data.evidence.length,
    },
  });

  return NextResponse.json({
    userScore: {
      id: userScore.id,
      goodScore: userScore.goodScore,
      harmScore: userScore.harmScore,
      notes: userScore.notes,
    },
  });
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
  const existing = await prisma.userScore.findUnique({
    where: { id: parsed.data.userScoreId },
    select: { userId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (existing.userId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const isAdminDelete = existing.userId !== user.id && user.isAdmin;
  // Cross-user delete is a privileged admin action — require the second
  // factor (unlock cookie). Owner-deletes never require unlock.
  if (isAdminDelete && !(await isAdminUnlocked())) {
    return NextResponse.json(
      { error: "ADMIN_LOCKED" },
      { status: 401 }
    );
  }
  await prisma.userScore.delete({
    where: { id: parsed.data.userScoreId },
  });
  await logAuditEvent({
    action: isAdminDelete ? "user_score.delete.admin" : "user_score.delete.owner",
    actorId: user.id,
    targetType: "user_score",
    targetId: parsed.data.userScoreId,
    request,
    metadata: isAdminDelete ? { originalOwnerId: existing.userId } : undefined,
  });
  return NextResponse.json({ ok: true });
}

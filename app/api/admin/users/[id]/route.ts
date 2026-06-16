// Admin user moderation API.
//
// PATCH /api/admin/users/:id  body: one of
//   { isAdmin: boolean }
//   { reputationScore: number }    // 0.00 to 5.00
//   { softDeleted: boolean }       // true → set deletedAt=now; false → null
//
// All mutations:
//   - require requireJsonContentType (CSRF defense-in-depth)
//   - require requesting user to be admin (re-checked at this layer)
//   - reject self-modifications that would lock the admin out
//   - write an audit log entry

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { isAdminUnlocked } from "@/lib/admin";
import { logAuditEvent, type AuditAction } from "@/lib/audit";
import { requireJsonContentType } from "@/lib/http";
import { sendEmail } from "@/lib/emails/send";
import { accountDeletedEmail } from "@/lib/emails/templates";

const patchSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    reputationScore: z.number().min(0).max(5).optional(),
    softDeleted: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.isAdmin !== undefined ||
      b.reputationScore !== undefined ||
      b.softDeleted !== undefined,
    { message: "Body must specify at least one of isAdmin, reputationScore, softDeleted." }
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  // Split the two failure modes so we can give an unlock-aware error to
  // a stale-cookie admin without leaking the existence of /api/admin/*
  // to non-admins:
  //   - not signed in or not isAdmin → 404 (route doesn't exist for you)
  //   - isAdmin but locked            → 401 ADMIN_LOCKED (re-unlock to retry)
  const admin = await currentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!(await isAdminUnlocked())) {
    return NextResponse.json(
      { error: "ADMIN_LOCKED" },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const target = await prisma.userProfile.findUnique({
    where: { id },
    select: {
      id: true,
      isAdmin: true,
      deletedAt: true,
      reputationScore: true,
      email: true,
      displayName: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  // Self-protection: an admin must not lock themselves out or delete
  // their own account through this surface.
  if (target.id === admin.id) {
    if (parsed.data.isAdmin === false) {
      return NextResponse.json(
        { error: "CANNOT_REVOKE_OWN_ADMIN" },
        { status: 409 }
      );
    }
    if (parsed.data.softDeleted === true) {
      return NextResponse.json(
        { error: "CANNOT_DELETE_SELF" },
        { status: 409 }
      );
    }
  }

  // Apply changes + audit each one. We persist per-field so the audit
  // trail names the specific action; this also keeps each entry semantic.
  const updates: Parameters<typeof prisma.userProfile.update>[0]["data"] = {};
  const auditActions: Array<{
    action: AuditAction;
    metadata: Record<string, unknown>;
  }> = [];

  if (
    parsed.data.isAdmin !== undefined &&
    parsed.data.isAdmin !== target.isAdmin
  ) {
    updates.isAdmin = parsed.data.isAdmin;
    auditActions.push({
      action: parsed.data.isAdmin
        ? "admin.user.is_admin.granted"
        : "admin.user.is_admin.revoked",
      metadata: { previous: target.isAdmin },
    });
  }

  if (
    parsed.data.reputationScore !== undefined &&
    Number(target.reputationScore) !== parsed.data.reputationScore
  ) {
    updates.reputationScore = parsed.data.reputationScore;
    auditActions.push({
      action: "admin.user.reputation.set",
      metadata: {
        previous: Number(target.reputationScore),
        next: parsed.data.reputationScore,
      },
    });
  }

  let justSoftDeleted = false;
  if (parsed.data.softDeleted !== undefined) {
    const isCurrentlyDeleted = target.deletedAt !== null;
    if (parsed.data.softDeleted !== isCurrentlyDeleted) {
      updates.deletedAt = parsed.data.softDeleted ? new Date() : null;
      justSoftDeleted = parsed.data.softDeleted === true;
      auditActions.push({
        action: parsed.data.softDeleted
          ? "admin.user.soft_deleted"
          : "admin.user.restored",
        metadata: {},
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, changed: false });
  }

  await prisma.userProfile.update({ where: { id }, data: updates });
  for (const a of auditActions) {
    await logAuditEvent({
      action: a.action,
      actorId: admin.id,
      targetType: "user_profile",
      targetId: id,
      request,
      metadata: a.metadata,
    });
  }

  // Best-effort: notify the owner their account was deleted. Never block the
  // admin action on email delivery (sendEmail swallows its own errors).
  if (justSoftDeleted) {
    await sendEmail(
      target.email,
      accountDeletedEmail({ displayName: target.displayName })
    );
  }

  return NextResponse.json({ ok: true, changed: true });
}

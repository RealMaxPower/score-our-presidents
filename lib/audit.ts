// Forensics audit log. Append-only writer for sensitive operations.
// Failures are swallowed and logged — audit should never break a request.
//
// Schema: db/schema.prisma `model AuditLog`.

import { prisma } from "./prisma";
import { getClientIp } from "./request-ip";

export type AuditAction =
  // Sign-in surface
  | "sign_in.success"
  | "sign_in.failure"
  | "sign_out"
  // User-score lifecycle
  | "user_score.create"
  | "user_score.update"
  | "user_score.delete.owner"
  | "user_score.delete.admin"
  // Account lifecycle (self-service)
  | "user.account.delete.self"
  // Admin surface — user moderation
  | "admin.access"
  | "admin.user.is_admin.granted"
  | "admin.user.is_admin.revoked"
  | "admin.user.reputation.set"
  | "admin.user.soft_deleted"
  | "admin.user.restored"
  // Admin surface — second-factor unlock
  | "admin.unlock.success"
  | "admin.unlock.failure"
  | "admin.lock";

export interface AuditEvent {
  action: AuditAction;
  /** Acting user's id; null for anonymous (e.g. failed sign-ins). */
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  /** Pass the inbound Request to capture IP + UA automatically. */
  request?: Request;
  /** Override IP if not derivable from Request (e.g. NextAuth callbacks). */
  ipAddress?: string | null;
  /** Override UA if not derivable from Request. */
  userAgent?: string | null;
  /** Structured action-specific fields. Keep small; this is JSONB. */
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const ipAddress =
      event.ipAddress ??
      (event.request ? getClientIp(event.request) : null) ??
      null;
    const userAgent =
      event.userAgent ??
      event.request?.headers.get("user-agent") ??
      null;

    await prisma.auditLog.create({
      data: {
        action: event.action,
        actorId: event.actorId ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        ipAddress,
        userAgent,
        metadata: (event.metadata ?? null) as never,
      },
    });
  } catch (err) {
    // Never let audit failures break a request. Log to stderr so the
    // structured logger / Sentry can surface it.
    console.error("[audit] failed to write event", {
      action: event.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

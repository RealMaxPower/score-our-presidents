// Self-service account deletion (GDPR Art. 17 / CCPA right-to-delete).
//
// DELETE /api/account — irreversibly purges the *current* user's account.
//
// This is distinct from the admin soft-delete (PATCH /api/admin/users/:id),
// which only sets `deletedAt` for moderation/suspension. Here we hard-delete
// so the data the privacy policy promises to remove is actually removed:
//   - `userProfile.delete` cascades the user's weights, scores (→ evidence),
//     votes, bookmarks, and sessions (onDelete: Cascade in db/schema.prisma).
//   - the NextAuth identity (`auth_users`, holding the email a second time)
//     is deleted by email, cascading `auth_accounts` + `auth_sessions`, plus
//     any pending magic-link `auth_verification_tokens`.
// Non-identifying aggregate snapshots have no user FK and intentionally remain.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser, clearSessionCookie } from "@/lib/auth";
import { requireJsonContentType } from "@/lib/http";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail } from "@/lib/emails/send";
import { accountDeletedEmail } from "@/lib/emails/templates";

export async function DELETE(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Capture identity before the row is gone — needed for the auth-table purge
  // and the confirmation email.
  const { id, email, displayName } = user;

  await prisma.$transaction([
    // App-side identity + all owned data (cascades per schema).
    prisma.userProfile.delete({ where: { id } }),
    // NextAuth identity. Match case-insensitively: auth `User.email` is not
    // normalised to lowercase the way `UserProfile.email` is.
    prisma.user.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    }),
    // Pending magic-link tokens are keyed by the (lowercased) email identifier.
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);

  // Compliance record of the erasure. Append-only; never throws.
  await logAuditEvent({
    action: "user.account.delete.self",
    actorId: id,
    targetType: "user_profile",
    targetId: id,
    request,
  });

  // Confirmation / security receipt. Best-effort — never block on delivery.
  await sendEmail(email, accountDeletedEmail({ displayName }));

  // Drop the dev session cookie. The NextAuth JWT cookie is cleared client-side
  // on sign-out; even if it lingers, currentUser() now resolves to null because
  // the profile row is gone.
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}

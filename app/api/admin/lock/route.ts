// POST /api/admin/lock — clear the admin unlock cookie for this browser.
// Doesn't sign the user out of the site, only revokes /admin access until
// they re-unlock. Always returns 200 regardless of prior state so a 404
// can't be used to probe whether someone was unlocked.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { clearAdminUnlockCookie } from "@/lib/admin";
import { requireJsonContentType } from "@/lib/http";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const user = await currentUser();
  await clearAdminUnlockCookie();
  await logAuditEvent({
    action: "admin.lock",
    actorId: user?.id ?? null,
    request,
  });
  return NextResponse.json({ locked: true });
}

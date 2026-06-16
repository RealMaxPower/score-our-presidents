// POST /api/admin/unlock   body: { token: string }
//   - Caller must already be signed in AND have isAdmin=true; otherwise 404.
//   - Rate-limited per IP (same AUTH_PER_MIN/HOUR as sign-in routes).
//   - On match, sets the httpOnly SameSite=Strict admin unlock cookie.
//   - Writes an audit_log entry either way.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdminAuthn,
  setAdminUnlockCookie,
  verifyAdminToken,
} from "@/lib/admin";
import { requireJsonContentType } from "@/lib/http";
import { enforce, AUTH_PER_MIN, AUTH_PER_HOUR } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { logAuditEvent } from "@/lib/audit";

const bodySchema = z.object({
  token: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  // Per-IP rate limit BEFORE auth check so unauthenticated probing also
  // hits the limit (and so a stolen session cookie can't be used to
  // brute-force the token without being throttled).
  const ip = getClientIp(request);
  const [minute, hour] = await Promise.all([
    enforce(`admin-unlock:min:${ip}`, AUTH_PER_MIN),
    enforce(`admin-unlock:hr:${ip}`, AUTH_PER_HOUR),
  ]);
  if (!minute.ok || !hour.ok) {
    const wait = Math.max(minute.retryAfterMs ?? 0, hour.retryAfterMs ?? 0);
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterMs: wait },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(wait / 1000)) },
      }
    );
  }

  // Require signed-in admin user (404 otherwise — don't reveal route).
  // Note: we use requireAdminAuthn (not requireAdmin) so the unlocked
  // state doesn't itself prevent re-unlock.
  let user;
  try {
    user = await requireAdminAuthn();
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }

  if (!verifyAdminToken(parsed.data.token)) {
    await logAuditEvent({
      action: "admin.unlock.failure",
      actorId: user.id,
      request,
    });
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
  }

  await setAdminUnlockCookie();
  await logAuditEvent({
    action: "admin.unlock.success",
    actorId: user.id,
    request,
  });
  return NextResponse.json({ unlocked: true });
}

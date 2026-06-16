// Dev-only sign-in. Accepts an email; if a matching UserProfile exists, sets
// the session cookie. No password, no OAuth — purely for local development.
//
// POST /api/auth/sign-in   body: { email: string }
//   200 { user: { ... } }
//   404 { error: "USER_NOT_FOUND" }
//   501 { error: "NOT_AVAILABLE" } — production builds never run this path

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { requireJsonContentType } from "@/lib/http";
import { enforce, AUTH_PER_MIN, AUTH_PER_HOUR } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { logAuditEvent } from "@/lib/audit";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  // Legacy dev endpoint — disabled in production. The NextAuth catch-all
  // at /api/auth/[...nextauth] is the canonical sign-in path.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "NOT_AVAILABLE" },
      { status: 501 }
    );
  }

  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  const ip = getClientIp(request);
  const [minute, hour] = await Promise.all([
    enforce(`auth:min:${ip}`, AUTH_PER_MIN),
    enforce(`auth:hr:${ip}`, AUTH_PER_HOUR),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY" },
      { status: 400 }
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const user = await prisma.userProfile.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || user.deletedAt) {
    await logAuditEvent({
      action: "sign_in.failure",
      request,
      metadata: { reason: "USER_NOT_FOUND", emailAttempted: parsed.data.email.toLowerCase() },
    });
    return NextResponse.json(
      { error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }
  await setSessionCookie(user.email);
  await logAuditEvent({
    action: "sign_in.success",
    actorId: user.id,
    request,
    metadata: { provider: "dev-cookie" },
  });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  });
}

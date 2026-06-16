import { NextResponse } from "next/server";
import { clearSessionCookie, currentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { requireJsonContentType } from "@/lib/http";

export async function POST(request: Request) {
  const ctError = requireJsonContentType(request);
  if (ctError) return ctError;

  // Capture who was signed in BEFORE we clear the cookie, so the audit
  // entry has a non-null actorId.
  const user = await currentUser();
  await clearSessionCookie();
  await logAuditEvent({
    action: "sign_out",
    actorId: user?.id ?? null,
    request,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

// Reject requests that aren't JSON. Belt-and-suspenders defense against
// CSRF-via-HTML-form: SameSite=Lax already blocks the common cases, but
// a strict content-type check makes the requirement explicit and survives
// future CORS-config changes.
export function requireJsonContentType(request: Request): NextResponse | null {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { error: "UNSUPPORTED_MEDIA_TYPE" },
      { status: 415 }
    );
  }
  return null;
}

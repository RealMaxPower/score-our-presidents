import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server layouts can't see the request path, so the admin layout's
// "admin.access" audit event had none (it read x-invoke-path, which Next no
// longer sets). Pass the path through as a request header. It is set
// unconditionally, so a client-supplied x-admin-path is always overwritten.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-admin-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*"],
};

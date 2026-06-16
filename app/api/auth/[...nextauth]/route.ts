// Catch-all NextAuth API route. NextAuth v5 supplies GET + POST as an object;
// we re-export GET as-is and wrap POST with per-IP rate limiting to mitigate
// account enumeration, credentials brute force, and magic-link spam.

import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { enforce, AUTH_PER_MIN, AUTH_PER_HOUR } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
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
  return handlers.POST(request);
}

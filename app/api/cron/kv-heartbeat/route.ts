// GET /api/cron/kv-heartbeat — keeps the Upstash Redis rate-limiter DB
// from being archived for inactivity.
//
// The limiter (lib/rate-limit.ts) only issues commands on rate-limited traffic;
// pre-launch that's near-zero, so the idle DB gets flagged and archived. This
// route issues a PING on a schedule (see `crons` in vercel.json) to reset
// Upstash's inactivity clock. It reuses the Upstash env already present in
// Vercel — no new secret store, unlike an external CI heartbeat.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET
// is set. We require it so the endpoint isn't a public, unauthenticated way to
// drive Upstash/Vercel usage.

import { NextResponse } from "next/server";
import { pingRateLimitBackend } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  try {
    const status = await pingRateLimitBackend();
    return NextResponse.json({
      ok: true,
      status, // "ok" (Upstash reached) | "not-configured" (in-memory mode)
      pingedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "PING_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

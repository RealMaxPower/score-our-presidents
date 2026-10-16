import { NextResponse } from "next/server";
import { enforce, SENTRY_TUNNEL_PER_MINUTE } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { SENTRY_TUNNEL_MAX_BYTES, tunnelTarget } from "@/lib/sentry-tunnel";

export const dynamic = "force-dynamic";

// Browser error reports (sentry.client.config.ts `tunnel`) are relayed
// through here so Sentry sees our server, never the visitor: it receives
// neither their IP address nor the location derived from it. No visitor
// headers are forwarded. Rate-limited per client, size-capped, and only
// forwards envelopes addressed to our own project's DSN.
export async function POST(request: Request) {
  const limit = await enforce(
    `sentry-tunnel:min:${getClientIp(request)}`,
    SENTRY_TUNNEL_PER_MINUTE
  );
  if (!limit.ok) {
    const wait = Math.ceil((limit.retryAfterMs ?? 60_000) / 1000);
    return new NextResponse(null, { status: 429, headers: { "Retry-After": String(wait) } });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > SENTRY_TUNNEL_MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  const envelope = await request.text();
  if (Buffer.byteLength(envelope) > SENTRY_TUNNEL_MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  const url = tunnelTarget(envelope, process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!url) return new NextResponse(null, { status: 400 });

  try {
    const upstream = await fetch(url, {
      method: "POST",
      body: envelope,
      headers: { "Content-Type": "application/x-sentry-envelope" },
    });
    return new NextResponse(null, { status: upstream.ok ? 200 : upstream.status });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

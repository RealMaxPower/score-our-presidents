// Extract a best-effort client IP for rate-limit keying. Behind a trusted
// reverse proxy (Vercel / Cloudflare / Fly / a custom Node proxy), the
// real client IP is set in `x-forwarded-for` (first hop, leftmost). In
// local dev there is no proxy, so we fall back to a fixed bucket — fine
// for dev where the limiter is a sanity check, not a defense.
//
// SECURITY: if the app is *not* behind a proxy that strips inbound
// `x-forwarded-for`, an attacker can spoof this header to evade per-IP
// limits. Make sure your deploy fronts requests with a proxy that
// overwrites this header, or switch to a trusted-proxy library.

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

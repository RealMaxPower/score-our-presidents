/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Production CSP. Tight by default — this site loads no third-party scripts,
// fonts, or images. If/when Plausible analytics or other vendors are added,
// expand the relevant directive.
const cspDirectives = {
  "default-src": ["'self'"],
  // 'unsafe-inline' is needed for Next's hydration script. Nonces would
  // require a middleware, which adds its own CVE surface — revisit later.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    // Dev: HMR websocket + dev-server polling.
    ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    // Sentry: ingest endpoint for browser error reports. Wildcard-host
    // allowlist is the recommended config — DSNs are project-scoped via
    // path, not subdomain. Permitted unconditionally so a CSP change
    // isn't required to flip Sentry on/off via env vars.
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.ingest.de.sentry.io",
  ],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
};

const csp = Object.entries(cspDirectives)
  .map(([directive, values]) =>
    values.length ? `${directive} ${values.join(" ")}` : directive
  )
  .join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS is a no-op over http://localhost (browsers ignore it), so safe to
  // set unconditionally; prod-only is just a deploy-time concern.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

module.exports = nextConfig;

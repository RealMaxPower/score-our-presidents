# Security policy

The Presidential Scoring Framework runs a public website that accepts user-submitted content (scores, votes, weights, bookmarks) and stores user accounts. We take security seriously and welcome responsible disclosure.

## Reporting a vulnerability

**Do not open a public GitHub issue, PR, or discussion for security reports.** Public disclosure before a fix is available puts users at risk.

Send reports privately to:

- **Email:** security@scoreourpresidents.org
- **GitHub:** open a [private security advisory](https://docs.github.com/en/code-security/security-advisories) on this repo (preferred — it gives us a CVE workflow and a private discussion thread)

Please include:

1. A clear description of the issue and the impact
2. Reproduction steps (the smallest test case that demonstrates the problem)
3. Affected version / commit SHA if known
4. Your name or handle for credit (or "anonymous" if you prefer)
5. Whether you intend to publish your own write-up, and if so, your proposed timeline

We will acknowledge receipt within **72 hours**. For a vetted, in-scope vulnerability we aim to ship a fix or coordinated mitigation within **30 days** of the initial report, and we'll keep you updated at least weekly until resolution. If we conclude a report is out of scope or not a vulnerability, we'll explain why.

## Scope

### In scope

- The deployed public site and any subdomain we operate (production URL TBD before launch)
- The application code in this repository
- Authentication, session management, account integrity (`auth.ts`, `lib/auth.ts`, `lib/env.ts`)
- API routes under `/api/*`, especially write paths (`/api/user-scores`, `/api/votes`, `/api/admin/*`, `/api/auth/*`)
- Admin surface under `/admin/*`
- Data integrity of `audit_logs`, `user_profiles`, `user_scores`, `user_votes`, `bookmarks`
- Bundled dependencies that we declare in `package.json`

### Out of scope

- The **methodology** itself (the scoring framework, weight vectors, calibration anchors). Disagreement with how the rubric judges a president is not a security issue — see `docs/methodology/spec-v1.2-redlined.md` and `DISCLAIMER.md` for the editorial channels.
- Reports requiring physical access, social engineering of staff, or extortion
- Reports about third-party services we use (NextAuth, Prisma, Postgres, Upstash, Resend, Vercel, Neon) — file those upstream
- Theoretical vulnerabilities without a working proof-of-concept
- Volumetric DDoS attacks (mitigated by our hosting provider)
- Findings on a fork or unofficial deployment
- Best-practice nits where no real exploit path exists (e.g. missing security header without an exploitable consequence). We're happy to receive these as regular GitHub issues if you prefer.
- Self-XSS, MIME-sniffing on a single-user endpoint, lack of rate limiting on read-only endpoints

## Safe harbor

We will not pursue civil or criminal action against researchers who:

1. Act in good faith and avoid privacy violations, data exfiltration, service degradation, or financial harm
2. Use only their own test accounts (you can seed one via `pnpm tsx db/seed-dev-users.ts` on a local checkout)
3. Give us a reasonable opportunity to fix the issue before public disclosure (we suggest 90 days from initial report unless we mutually agree otherwise)
4. Do not exfiltrate user data beyond the minimum required to demonstrate the issue
5. Stop testing the moment they could cause damage and report immediately

We will treat your report as confidential and will not share your identity without your permission. Credit in the security advisory and (if you want) a hall-of-fame entry below.

## Current security posture

So you can scope your work, here's what's already in place. Reports that simply restate any of these without showing an exploit are out of scope.

### Authentication & sessions

- NextAuth.js v5, JWT sessions signed with `NEXTAUTH_SECRET`
- Three providers, gated by env: Credentials (dev only), Google OAuth, Resend magic-link
- Dev cookie auth (`psf_session`) is gated by `AUTH_DISABLE_DEV_COOKIE`; both that and `AUTH_DISABLE_DEV_CREDENTIALS` are **required** to be `"1"` in production. `lib/env.ts` refuses to boot a production server otherwise.
- `lib/auth.ts` throws on import in `NEXT_PHASE=phase-production-server` as a final safety net
- `NEXTAUTH_SECRET` is validated at production start: must be ≥32 chars and not match any known `dev-secret-*` placeholder
- `lib/env.ts`, `lib/prisma.ts`, and `lib/auth.ts` carry `import "server-only"` markers — any client component that transitively pulls server config now fails at *compile* time instead of crashing in users' browsers

### Admin second factor (`ADMIN_TOKEN`)

*Operator guide for actually using `/admin/*` lives in [`docs/admin.md`](docs/admin.md). This section is the security posture.*

- `/admin/*` requires both layers: a valid NextAuth session with `isAdmin === true` AND a `psf_admin_unlock` cookie carrying the `ADMIN_TOKEN` shared secret
- The token is `≥32` chars, generated via `openssl rand -base64 32`; required in production (`lib/env.ts` refuses boot otherwise)
- Admins exchange the token via the `/admin/unlock` POST form once per browser, rate-limited per IP (same `enforce()` as sign-in)
- Cookie is `httpOnly`, `SameSite=Strict`, `Secure` in prod, scoped `path="/"`, short-lived (`maxAge` set shorter than the session cookie). Token compared with `crypto.timingSafeEqual` in constant time
- `/admin/lock` clears the cookie without touching the NextAuth session — admin manually re-locks; `Lock` link present in admin nav
- Threat-model uplift: a stolen NextAuth session cookie cannot reach `/admin` without also holding the unlock cookie (separate `httpOnly` cookie, never exposed to JS, expires sooner than the session)

### Authorization

- `requireAdmin()` (`lib/admin.ts`) gates the `/admin/*` tree. Non-admins → **404** (route existence not leaked). Authenticated-but-locked admins → **307 → /admin/unlock** (legit admin gets a signal; same threat-class identity is already known)
- API equivalent: `/api/admin/*` returns 404 to non-admins and **401 `ADMIN_LOCKED`** to authenticated-but-locked admins. Client surfaces a "Re-unlock" link inline rather than a raw status code
- Admins cannot revoke their own admin role or soft-delete themselves (self-lockout prevention in `/api/admin/users/:id`)
- Per-row authorization: users can only delete their own `UserScore`. Admins can delete any user's score (logged as `user_score.delete.admin`), **but cross-user deletion now requires the unlock cookie** — closes a path where a stolen admin session could bypass the second factor

### Input handling

- Every API write route requires `Content-Type: application/json` — non-JSON requests return `415 Unsupported Media Type`. CSRF defense alongside the `SameSite=Lax` (or `Strict` for the admin-unlock cookie) cookie set
- All bodies are validated with Zod
- `evidence.sourceUrl` is validated by `isPublicHttpUrl` (`lib/user-scores.ts`, exported for re-use by the eventual URL-verification worker) which rejects non-http(s) schemes, localhost, loopback, link-local, RFC1918, CGNAT, multicast, and IPv6 literals — SSRF defense at the write boundary
- `targetId` on `/api/votes` is enforced as `UUID` (presidents) or `UUID:UUID` (categories / sub-criteria) — no arbitrary strings polluting the table

### Rate limiting

- Per-user limits on `/api/votes` and `/api/user-scores`
- Per-IP limits on `/api/auth/sign-in`, `/api/auth/[...nextauth]`, and `/api/admin/unlock` — mitigates account enumeration, credential brute force, magic-link spam, and admin-token brute force
- Upstash Redis sliding-window when `UPSTASH_REDIS_REST_URL`/`TOKEN` are set; in-process fallback in dev only. Upstash is **required** in production (`lib/env.ts` refuses boot otherwise) — on serverless, the in-process fallback per-instance defeats rate limiting

### Forensics

- Append-only `audit_logs` table records sign-in success/failure, sign-out, user-score lifecycle, admin moderation actions, admin unlock success/failure, admin lock, and admin page visits — each row carries actor / target / IP / user-agent / metadata
- Admin reads `audit_logs` via `/admin/audit` (filterable by action and actor, paginated)

### Response headers

- `Content-Security-Policy` with explicit allowlist (script/style/font/connect/img/frame-ancestors/base-uri/form-action/object-src)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` with empty allowlists for camera/microphone/geolocation/interest-cohort
- `upgrade-insecure-requests` in production CSP

### Infrastructure

- Local Postgres bound to `127.0.0.1` only (`docker-compose.yml`) — default credentials never exposed to LAN
- Production env validation refuses to boot without real secrets and the dev-disable flags
- `pnpm audit --audit-level=high` clean as of last release

## Known limitations

These are documented choices we've made, not unknown gaps. We'll re-evaluate as the project evolves; please don't burn report time on them.

- **CSP allows `'unsafe-inline'` for scripts**: needed for Next.js's inline hydration script. Tightening would require middleware-injected nonces, and Next's middleware has been a CVE source in recent releases — we judge the tradeoff unfavorable for a site with no user-generated HTML rendering.
- **URL-verification worker not yet implemented**: schema is in place (`UrlVerificationLog`) but the worker that fetches `evidence.sourceUrl` is pending. When it ships it MUST reuse `isPublicHttpUrl` — see comment in `db/schema.prisma`.
- **`/api/auth/sign-in` 404 vs 200 leaks "is this email seeded?"**: dev-only path, will be disabled in production (`AUTH_DISABLE_DEV_CREDENTIALS=1`).
- **`x-forwarded-for` is trusted for rate-limit keying** (`lib/request-ip.ts`): deployment must front the app with a proxy that overwrites this header. Documented in the source.

## Hall of fame

*Reporters of vetted, in-scope vulnerabilities will be credited here with permission.*

— (no entries yet)

## Updates to this policy

Material changes will be announced via the GitHub release notes. The "Date last updated" line below is authoritative.

---

**Owner:** Marshall Cahill
**Date last updated:** 2026-05-15
**Related docs:** `README.md`, `SETUP.md`, `DEPLOYMENT.md` (prod env + verification), `architecture-v1.md` §9 (security observability)

# Deployment

How to deploy Score Our Presidents (the Presidential Scoring Framework) to production.

**Target stack:** Vercel (Next.js + Vercel Analytics) · Supabase (Postgres) · Upstash (Redis) · Sentry (errors) · Fly.io (workers — planned target, not yet built or deployed)

**Audience:** Marshall Cahill + future contributors. Assumes you can clone the repo, have `pnpm` and `psql` locally, and have admin access to the accounts below.

This is a runbook, not a tutorial. If you've never deployed a Next.js app before, read [SETUP.md](SETUP.md) first to understand the local dev shape.

---

## Contents

1. [Account prerequisites](#1-account-prerequisites)
2. [Provision external services](#2-provision-external-services)
3. [Configure Vercel](#3-configure-vercel)
4. [First deploy](#4-first-deploy)
5. [Post-deploy verification](#5-post-deploy-verification)
6. [Custom domain](#6-custom-domain)
7. [Ongoing operations](#7-ongoing-operations)
8. [Rollback](#8-rollback)
9. [Deferred — required before public launch](#9-deferred--required-before-public-launch)

---

## 1. Account prerequisites

Create these once. Free tiers are fine for prod test; paid tiers noted where they matter.

| Service | Tier for prod test | Why |
|---|---|---|
| [Vercel](https://vercel.com) | Hobby (free) | App hosting |
| [Supabase](https://supabase.com) | Free | Postgres + connection pooler |
| [Upstash](https://upstash.com) | Free | Redis for rate limits |
| [Resend](https://resend.com) | Free (100/day) | Magic-link email — only if using the Resend auth provider |
| [Google Cloud Console](https://console.cloud.google.com) | Free | OAuth credentials — only if using Google sign-in |
| [Sentry](https://sentry.io) | Developer (free) | Error reporting |
| Domain registrar | — | Custom domain (defer until you're ready to share the URL) |

You need at least one auth provider — Google OR Resend, both fine.

---

## 2. Provision external services

Do these in any order. All are independent.

### 2.1 Supabase

1. Create a new project. Region: pick the one closest to `iad1` (US East 1) since [vercel.json](vercel.json) pins the app to `iad1`. Mismatched regions add ~80ms per query.
2. From **Project Settings → Database → Connection string**:
   - **Connection pooling** (Transaction mode, port 6543) → save as `DATABASE_URL`. **Append `?pgbouncer=true&connection_limit=1`** to the end. This is mandatory for Vercel serverless — without it the pool exhausts under load.
   - **Direct connection** (port 5432) → save as `DATABASE_URL_UNPOOLED`. Used by `prisma migrate deploy` and any future Fly.io workers.
3. The database is empty. Migrations + seed run in [step 4.3](#43-run-migrations--seed).

### 2.2 Upstash

1. Create a new Redis database. Region: same as Supabase.
2. **Eviction:** disable (rate-limit keys must not be evicted under memory pressure).
3. From **REST API**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2.3 Resend (skip if not using magic-link auth)

1. Create an API key. Name it exactly `AUTH_RESEND_KEY` — Auth.js's Resend provider auto-detects this name. Save the value.
2. **Domains → Add domain.** Add the domain you'll send mail from (typically a subdomain like `mail.example.com`). Add the SPF + DKIM records to your DNS provider. Verify in Resend.
3. Set `EMAIL_FROM` to `noreply@<your-verified-domain>` (or any address on the verified domain).

Magic links silently fail until DNS verification clears — usually under an hour, occasionally several.

### 2.4 Google OAuth (skip if not using Google sign-in)

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized redirect URIs:
   - `https://<your-vercel-prod-domain>/api/auth/callback/google` (after [step 6](#6-custom-domain) you'll add the custom-domain URL too)
4. Save `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

For Preview deployments to support OAuth, you'd need to register every preview URL — not worth it. Either skip Google on previews or use Resend there.

### 2.5 Sentry

1. Create a project: platform **Next.js**.
2. Copy the DSN (looks like `https://abc123@o12345.ingest.us.sentry.io/67890`). Save as `SENTRY_DSN`.
3. If you also want browser error reporting, set `NEXT_PUBLIC_SENTRY_DSN` to the same value. Server-only is enough for prod test.
4. Source-map upload is **not wired** in this repo's [next.config.js](next.config.js). Errors will show up with minified stack traces. Add `withSentryConfig` later if you need readable traces — requires a `SENTRY_AUTH_TOKEN` env var.

### 2.6 Generate secrets

Two separate 32+ char secrets — never reuse the same value for both.

```bash
openssl rand -base64 32    # save as NEXTAUTH_SECRET
openssl rand -base64 32    # save as ADMIN_TOKEN
```

- `NEXTAUTH_SECRET` — signs JWT session tokens. Validator at [lib/env.ts:65-89](lib/env.ts#L65-L89) refuses any value `< 32 chars` or matching `dev-secret-*`.
- `ADMIN_TOKEN` — second-factor shared secret gating `/admin/*`. Validator at [lib/env.ts:128-138](lib/env.ts#L128-L138) refuses any value `< 32 chars`. You'll enter this at `/admin/unlock` once per browser/device.

Store both in a password manager. Rotating either requires redeploying with the new value (and re-unlocking all admin browsers for `ADMIN_TOKEN`).

---

## 3. Configure Vercel

### 3.1 Import the project

Vercel dashboard → **Add New → Project → Import Git Repository**. Pick `RealMaxPower/score-our-presidents`.

Framework preset is auto-detected as Next.js. Build command, output directory, install command — leave defaults. The [package.json](package.json) `postinstall` script handles `prisma generate` automatically.

### 3.2 Set environment variables

In the import flow (or later under **Settings → Environment Variables**), set the following in **Production** scope. Most should also be in **Preview** if you want previews to fully work.

**Required — server refuses to boot without all of these:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled URL + `?pgbouncer=true&connection_limit=1` |
| `DATABASE_URL_UNPOOLED` | Supabase direct URL |
| `NEXTAUTH_SECRET` | The 32+ char value from [step 2.6](#26-generate-nextauth_secret) |
| `NEXTAUTH_URL` | `https://<your-vercel-prod-domain>` (update after [step 6](#6-custom-domain)) |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXTAUTH_URL` |
| `AUTH_DISABLE_DEV_CREDENTIALS` | `1` |
| `AUTH_DISABLE_DEV_COOKIE` | `1` |
| `ADMIN_TOKEN` | The second 32+ char value from [step 2.6](#26-generate-secrets) — gates `/admin/*` |
| `UPSTASH_REDIS_REST_URL` | From [step 2.2](#22-upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | From [step 2.2](#22-upstash) |

**At least one auth provider:**

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | From [step 2.4](#24-google-oauth-skip-if-not-using-google-sign-in) |
| `AUTH_RESEND_KEY` + `EMAIL_FROM` | From [step 2.3](#23-resend-skip-if-not-using-magic-link-auth) |

**Recommended:**

| Variable | Value |
|---|---|
| `SENTRY_DSN` | From [step 2.5](#25-sentry) |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as `SENTRY_DSN`, only if you want browser errors reported |
| `LOG_LEVEL` | `info` (default) |

The full validation rules live in [lib/env.ts](lib/env.ts). If you get an `Invalid environment configuration` error on first deploy, the message lists the exact problems.

### 3.3 Region

[vercel.json](vercel.json) pins functions to `iad1` (US East 1). If your Supabase project is in a different region, change the `regions` array to match.

---

## 4. First deploy

### 4.1 Trigger the build

Vercel deploys automatically on push to `main`. Or click **Deploy** in the import flow.

The build will:
1. `pnpm install` → triggers the `postinstall` script in [package.json](package.json), which runs `prisma generate`
2. `next build` → compiles the app, statically generates the 16 president pages and 56 sub-criterion pages from the YAML scores at build time

Build duration: ~2 minutes.

### 4.2 What you'll see post-deploy (before migrations run)

The site loads, but most pages will 500. This is expected — the database has no schema yet. The build itself doesn't connect to the database, only runtime requests do.

### 4.3 Run migrations + seed

From your laptop, with the **direct** (unpooled) URL — Supabase's pooler doesn't support `prisma migrate`:

```bash
# One-off — populate Supabase with schema + reference data
DATABASE_URL="<DATABASE_URL_UNPOOLED value>" pnpm prisma migrate deploy --schema=db/schema.prisma
DATABASE_URL="<DATABASE_URL_UNPOOLED value>" pnpm db:seed
```

Expected seed output:
```
✅ Seed complete. 13 categories, 56 sub-criteria, 9 lens presets, 16 presidents.
```

**Do not** run `pnpm tsx db/seed-dev-users.ts` against prod. Those accounts have no password and are exploitable until [`AUTH_DISABLE_DEV_CREDENTIALS=1`](lib/env.ts#L97-L104) takes effect — which it does in prod, but the rows would still sit in the DB as low-noise junk.

After seed, the home page should render. If not, check Vercel function logs for the actual error.

---

## 5. Post-deploy verification

Walk through these in order. If any fails, fix before pointing more traffic at the deploy.

### 5.1 Home + content

- Visit `/` → see the 9-lens chips, FDR at rank 1 under Default
- Visit `/president/franklin_d_roosevelt` → see scorecard with all 13 categories
- Visit `/sub-criterion/3.1` → see all 16 presidents on that sub-criterion
- Visit `/methodology`, `/privacy`, `/terms` → render without error
- `curl https://<domain>/api/presidents | jq .rankings[0]` → FDR

### 5.2 Auth

- `/sign-in` → see only the providers you wired (no Credentials/dev option)
- Sign in with Google or magic-link end-to-end → header shows your initials, `/me/contributions` accessible
- Sign out → cookie cleared, header reverts to "Sign in"

### 5.3 Writes + rate limits

- Submit a score on any sub-criterion → success, then refresh and confirm it appears in `/me/contributions`
- Vote agree/disagree on a score → counter updates
- Open Upstash console → see `psf-rl:*` keys appearing. This confirms rate limits are running through Redis, not the in-memory fallback

### 5.4 Admin

Two-step gate: NextAuth session **plus** the `ADMIN_TOKEN` unlock cookie. **For day-to-day operator use of the admin panel — bootstrapping the first admin, the unlock flow, user / score / audit-log moderation, and the audit-action catalog — see [`docs/admin.md`](docs/admin.md).** This section is the post-deploy smoke test.

- Sign in as your admin account (the user with `is_admin = true` in the DB — set manually via Prisma Studio or psql against the Supabase direct URL after first sign-in)
- Visit `/admin` → expect a **307 redirect to `/admin/unlock`** (signed-in admin, not yet unlocked)
- Paste the `ADMIN_TOKEN` value into the unlock form → land on the `/admin` dashboard. Cookie is `httpOnly`, `SameSite=Strict`, `path=/`, short-lived
- Click "Lock" in the admin nav → next `/admin` access redirects to `/admin/unlock` again
- Sign out, visit `/admin` while signed out → **404** (not 401), confirming the route's existence isn't leaked to non-admins
- Sign in as a non-admin user, visit `/admin` → **404** (same — admin paths invisible to non-admins)
- With unlock cookie missing, hit `/api/admin/users/<id>` via curl → **401 `ADMIN_LOCKED`** (admin-aware error, not a generic 404, so the admin UI can prompt to re-unlock)

### 5.5 Sentry

Trigger a test error (easiest: visit a deliberately-broken URL like `/api/presidents?cause-error=1` if you've wired such a thing, or temporarily throw in a route handler and redeploy). Confirm the error appears in Sentry within ~30 seconds. Revert the test.

### 5.6 Security headers

```bash
curl -I https://<domain>/ | grep -iE "content-security-policy|strict-transport|x-frame|x-content-type"
```

Should see CSP, HSTS, X-Frame-Options, X-Content-Type-Options. Check the CSP includes the Sentry hosts under `connect-src` ([next.config.js:21-31](next.config.js#L21-L31)).

---

## 6. Custom domain

1. Vercel → **Settings → Domains → Add** → enter your domain.
2. Follow Vercel's DNS instructions (typically a CNAME or A record).
3. Wait for SSL to provision (usually < 5 min).
4. Update env vars in **Production** scope:
   - `NEXTAUTH_URL` → `https://<custom-domain>`
   - `NEXT_PUBLIC_SITE_URL` → `https://<custom-domain>`
5. Update Google OAuth: add `https://<custom-domain>/api/auth/callback/google` to **Authorized redirect URIs**.
6. Redeploy (Vercel does this automatically when env vars change).
7. Repeat [§5 verification](#5-post-deploy-verification) on the custom domain.

The HSTS header in [next.config.js:48-51](next.config.js#L48-L51) includes `preload` — fine to leave, but only submit to the [HSTS preload list](https://hstspreload.org) once you're confident the domain stays HTTPS-only forever.

---

## 7. Ongoing operations

### 7.1 Schema migrations

Schema changes require running `prisma migrate deploy` against the direct URL. Vercel's build doesn't run migrations.

```bash
# Develop locally
pnpm db:migrate                                                 # creates migration file

# Commit + push, then after merge to main:
DATABASE_URL="<DATABASE_URL_UNPOOLED>" pnpm prisma migrate deploy --schema=db/schema.prisma
```

If a migration is destructive, take a Supabase snapshot first (Project → Database → Backups).

### 7.2 Env var changes

Vercel → **Settings → Environment Variables** → update → **Save**. A redeploy is required for changes to take effect — trigger via dashboard or push an empty commit.

The validator runs at server startup, not at edit time. A bad value won't be caught until the next deploy boots.

**Rotating `ADMIN_TOKEN`**: change the env value and redeploy. Every admin unlock cookie is invalidated on next request (the cookie value no longer matches the env). Admins re-unlock with the new token. Useful after a suspected leak or staff change.

**Rotating `NEXTAUTH_SECRET`**: change the env value and redeploy. Every JWT session is invalidated immediately; users sign in again. More disruptive — use only after a confirmed leak.

### 7.3 Re-seeding

`pnpm db:seed` is idempotent (uses upserts keyed on `slug` / `number`). Running it again after editing a `scores/*.yaml` file picks up the changes:

```bash
DATABASE_URL="<DATABASE_URL_UNPOOLED>" pnpm db:seed
```

User-submitted scores (`UserScore`, `Vote`, etc.) are untouched — only reference data is upserted.

### 7.4 Monitoring

- **Errors:** Sentry → set up alerts on new issues + frequency thresholds
- **DB:** Supabase → Project → **Database → Pooler** (watch active connections; should sit well below the limit)
- **Rate limits:** Upstash → request volume + key count
- **Page traffic:** Vercel → **Analytics** tab. Cookieless aggregate views via `@vercel/analytics`, wired in [app/layout.tsx](app/layout.tsx). Enable per-environment in **Project → Analytics**.
- **Function performance:** Vercel → **Speed Insights** / function logs

No structured logger is wired — `console.*` output goes to Vercel function logs. Adequate for prod test; revisit before public launch.

---

## 8. Rollback

### 8.1 App code

Vercel keeps every deploy. **Deployments → pick an earlier successful deploy → ⋯ → Promote to Production**. Instant.

### 8.2 Database schema

Prisma migrations are **not reversible**. To roll back:
1. Take a Supabase snapshot of current state (in case the rollback itself misbehaves)
2. Restore from a pre-migration Supabase backup, or
3. Hand-write a corrective migration that undoes the change

**Always snapshot before destructive migrations.** PITR on Supabase Pro gives you 7 days of point-in-time recovery; free tier gives daily snapshots.

### 8.3 Env vars

Vercel keeps env-var history. **Settings → Environment Variables → click a var → see edit history.** No automatic rollback button — read the previous value and re-paste.

---

## 9. Deferred — required before public launch

What the deploy ships **without**, all gracefully degraded. Track these for the public-launch milestone (not prod test).

### 9.1 Workers

Both workers from the README's "Outstanding before launch" list are **not built and not deployed**. Fly.io is the planned host (no `fly.toml` exists yet); Cloudflare Workers were considered but BullMQ assumes a long-lived Node process, so Fly is the better fit unless the queue model changes.

- **URL-verification worker** — fetches `evidence.sourceUrl`, updates `verificationStatus` in `UrlVerificationLog`. **Must reuse `isPublicHttpUrl`** from [lib/user-scores.ts:62](lib/user-scores.ts#L62) (already exported for this) before fetching, to enforce SSRF protection on re-fetches. Without the worker, evidence URLs stay `pending` and the launch gate "≥90% of evidence URLs resolve" can't be measured.
- **BullMQ aggregation worker** — nightly community medians + IQRs into `aggregate_snapshots`. Without it, `/community` shows null aggregates with a "no community data yet" placeholder.

Planned Fly.io shape (when built):
- Two `fly.toml` apps in a new `workers/` directory: `psf-worker-aggregation` and `psf-worker-url-verify`
- Both use the **regular Redis URL** (TCP, not the REST URL the app uses for `@upstash/ratelimit`). Upstash gives both protocols on the same instance.
- Same Supabase direct URL for DB access. Aggregation can use a read-only role; URL-verify needs writes to `UrlVerificationLog`.
- Same `SENTRY_DSN` so worker errors surface in the same project

### 9.2 Public launch gates

These don't affect deploy mechanics, just the decision to point real users at the deploy:
- Historian review of the 5 calibration anchors
- Legal review clearance
- URL-verification pass — ≥90% of evidence URLs resolve (requires §9.1)
- Repo flipped from private to public (after legal review)

### 9.3 Quality / observability improvements

Pure additions, not blockers:
- Source-map upload to Sentry (wrap [next.config.js](next.config.js) with `withSentryConfig`, add `SENTRY_AUTH_TOKEN`)
- Structured logger (pino with `requestId`/`userId`/`route`) in place of `console.*`
- CSP nonces in place of `'unsafe-inline'` ([next.config.js:11-15](next.config.js#L11-L15) — requires middleware)
- CI workflow (`.github/workflows/`) running `pnpm typecheck` + `pnpm test` on PRs
- Playwright E2E tests
- Supabase Pro for 7-day PITR backups

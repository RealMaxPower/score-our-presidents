# Local development setup

How to go from "open this folder in VS Code" to a running app at localhost:3000.

## Prerequisites

- **Node 20 or higher** (`node --version`). Install via [nvm](https://github.com/nvm-sh/nvm) or [Volta](https://volta.sh/).
- **pnpm 9+** (`pnpm --version`). Install via `corepack enable && corepack prepare pnpm@9.10.0 --activate` or `npm install -g pnpm`.
- **Docker** (for the local Postgres). Or use Supabase — see Option B below.
- **Python 3.10+** (optional — only if you want to verify rankings via `scripts/compute_rankings.py`).

## Postgres options

### Option A — Docker Postgres (recommended for dev)

Already configured in `docker-compose.yml`. Port 5435 (avoids clashing with other local Postgres) and bound to `127.0.0.1` only (won't expose creds to your LAN).

```bash
docker compose up -d
```

`DATABASE_URL` (already in `.env.example`):
```
postgresql://postgres:postgres@localhost:5435/presidential_scoring
```

### Option B — Supabase free tier (matches production)

1. Sign up at [supabase.com](https://supabase.com) and create a project
2. **Project Settings → Database → Connection string**:
   - Pooled (Supavisor, port 6543) → `DATABASE_URL`. Append `?pgbouncer=true&connection_limit=1` if you'll also point a deployed app at it
   - Direct (port 5432) → `DATABASE_URL_UNPOOLED`. Used by `prisma migrate deploy` and read by Prisma as `directUrl`

## First-time setup

```bash
# 1. Install deps
pnpm install

# 2. Configure env
cp .env.example .env
# Edit .env: set DATABASE_URL (and DATABASE_URL_UNPOOLED for Supabase).
# Leave NEXTAUTH_SECRET as the placeholder for dev; lib/env.ts only enforces
# a real secret at production server start (NEXT_PHASE=phase-production-server).

# 3. Generate Prisma client
pnpm prisma generate

# 4. Run migrations (creates 22 tables)
pnpm db:migrate

# 5. Seed framework data (16 presidents + 9 lens presets from scores/*.yaml)
pnpm db:seed
# Expected: "✅ Seed complete. 13 categories, 56 sub-criteria, 9 lens presets..."

# 6. Seed dev users (gives you something to sign in as)
pnpm tsx db/seed-dev-users.ts
# Creates max@example.com (admin), alex@example.com, newbie@example.com

# 7. Verify
python3 scripts/compute_rankings.py | head -30
# FDR should be rank 1 under Default with weighted total ~+3.53
```

## Running locally

```bash
pnpm dev          # http://localhost:3000
pnpm dev --port 3001    # if 3000 is taken
```

If you change the port, also update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` in `.env` to match — NextAuth uses `NEXTAUTH_URL` for post-sign-in redirects, and a mismatch sends you to a dead port.

Verify the API:
```bash
curl http://localhost:3000/api/presidents | jq .rankings[0]
# FDR at rank 1
```

## Signing in (dev)

1. Open `/sign-in`
2. Enter `max@example.com` (admin) — no password needed in dev
3. Header shows your initials in a circle; menu has admin-only links if you signed in as max@

Production swap: set `GOOGLE_CLIENT_ID/SECRET` for Google OAuth, or `AUTH_RESEND_KEY` + `EMAIL_FROM` for magic links — `auth.ts` activates each provider when its env vars are present. In production, `AUTH_DISABLE_DEV_CREDENTIALS=1` and `AUTH_DISABLE_DEV_COOKIE=1` are **required** (env validator rejects boots without them).

## Useful scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Run dev server (default port 3000) |
| `pnpm build` | Production build — verifies before deploy |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | (Re-)seed framework data from `scores/*.yaml` |
| `pnpm db:reset` | Drop + recreate + reseed (DESTRUCTIVE) |
| `pnpm db:studio` | Open Prisma Studio at :5555 |
| `pnpm verify-rankings` | Run `scripts/compute_rankings.py` against current DB |
| `pnpm tsx db/seed-dev-users.ts` | Seed dev sign-in users |

## What's shipped

The repo is well past the "scaffold" stage. Currently working:

- **Public pages**: home with lens chips, `/president/[slug]`, `/sub-criterion/[number]`, `/methodology`, `/privacy`, `/terms`, sitemap, robots, dynamic OG images
- **Auth**: NextAuth v5 (Credentials/Google/Resend), JWT sessions, sign-in/sign-out flows
- **User actions**: `/api/user-scores` (submit + delete), `/api/votes` (agree/disagree), `/me/votes`, `/me/contributions`, `/me/weights`, `/me/bookmarks`
- **Admin**: `/admin` dashboard, `/admin/audit` log viewer, `/admin/users` (toggle admin, reputation, soft-delete), `/admin/scores` (moderation delete). Two-factor: NextAuth session **plus** an `ADMIN_TOKEN` unlock cookie (`/admin/unlock`); non-admins see a 404 so the route's existence isn't leaked
- **Security**: strict security headers (CSP allowlists Sentry ingest), JSON-only writes, per-IP rate limits on auth + unlock routes, SSRF-safe URL validation on evidence, forensics audit log, `server-only` markers on env/prisma/auth modules, Zod env validation that refuses prod boot without real `NEXTAUTH_SECRET` + `ADMIN_TOKEN` + `AUTH_DISABLE_DEV_*=1` + Upstash creds
- **Observability**: Sentry server + opt-in client error reporting via `instrumentation.ts` (no-op when `SENTRY_DSN` unset); Vercel Analytics for cookieless aggregate page views

## What's not shipped

- **URL-verification worker** — schema exists at `UrlVerificationLog`; the worker that fetches `evidence.sourceUrl` and updates `verificationStatus` is not built and not yet deployed. `isPublicHttpUrl` is exported from `lib/user-scores.ts` for the worker to reuse when it ships. Planned target: Fly.io.
- **BullMQ aggregation worker** — nightly community medians/IQRs into `aggregate_snapshots`. Same status as above.
- **Public `/community` page** — placeholder until the aggregation worker writes data
- **E2E tests** (Playwright planned)

See `DEPLOYMENT.md` for the full prod runbook and what's deferred to public launch.

## Troubleshooting

**"Invalid environment configuration: DATABASE_URL: Required" in the browser:** A client component is transitively importing a server-only module (`lib/env.ts` / `lib/prisma.ts`). Check the import chain. Pure math helpers live in `lib/rankings-math.ts` and `lib/lens-presets.ts` — they have no Prisma deps and are safe to import from client components.

**Sign-in succeeds but UI still shows "Sign in":** Almost always a port mismatch. `NEXTAUTH_URL` in `.env` must match the port the dev server is on. After fixing, fully sign out and in again — soft refresh isn't enough.

**Migration says "no schema found":** The schema is at `db/schema.prisma`, not `prisma/schema.prisma`. The `prisma.schema` field in `package.json` points there. If commands fail, pass `--schema=db/schema.prisma` explicitly.

**Seed fails with "Cannot find module '../scores'":** Run from project root. The seed uses relative paths.

**Home page is blank or 500:** Run `pnpm db:studio` and verify `presidents` has 16 rows.

**Rankings don't match `scripts/compute_rankings.py`:** Both should be reading the same DB. The Python script reads YAMLs directly; the Next app reads from DB; `seed.ts` loads from the same YAMLs. Divergence = `seed.ts` bug.

**Port 5435 already in use:** Stop other Postgres containers or change the port in `docker-compose.yml` and `.env`.

## VS Code extensions

- **Prisma** (Prisma.prisma) — schema syntax + autocomplete
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **ESLint** (dbaeumer.vscode-eslint)
- **Error Lens** (usernamehw.errorlens) — inline error messages

## Working with AI assistance

The architecture and spec docs (`architecture-v1.md`, `docs/methodology/spec-v1.2-redlined.md`) live at the project root. When asking an AI to implement something, paste the relevant section plus the architecture constraints — context dramatically improves output quality.

Example prompt:
> Implement the `/community` aggregate page. `architecture-v1.md` §3 specifies REST; §7 specifies caching. Aggregate data lives in `aggregate_snapshots` (see `db/schema.prisma`).

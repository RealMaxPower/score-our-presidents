# Regression harness

`pnpm regress` builds two git refs side by side and reports every difference between them. It covers what each page looks like, what it says, and how it behaves. Use it before merging dependency upgrades, styling changes, or anything else where lint, typecheck and unit tests can pass on a broken UI.

```sh
pnpm regress                                    # origin/main vs HEAD
pnpm regress --base main --head my-branch
pnpm regress --only president --variants light-desktop --no-flows   # quick subset
pnpm regress --rebuild                          # ignore cached builds
```

It exits with `0` when nothing differs and `1` when something does, and prints the path to an HTML report.

## What it compares

**Screenshots.** It takes a full-page screenshot of every route, in light and dark mode, at 1280px and 390px wide, and pixel-diffs each one against base. The routes are:
- every URL in the sitemap
- the public pages
- the signed-in `/me/*` pages
- the admin pages

**Per-route checks, on light desktop:**
- page text
- HTTP status
- the security headers, including the CSP
- new console errors and failed requests
- axe accessibility violations

**Interaction flows,** each checked in the UI and in the database:
- lens switching
- theme toggle
- expanding evidence
- voting
- bookmarking
- submitting and deleting a score
- saving and clearing personal weights
- signing out
- admin unlock and lock
- admin role and soft-delete actions
- deleting your own account

The report shows base, head and a pixel diff side by side for every screenshot that changed.

## Isolation

The harness can't reach hosted data or send email:

- **Separate checkouts.** Each ref is checked out into its own git worktree under `~/.cache/score-our-presidents-regress` (or `$XDG_CACHE_HOME`), a per-user directory rather than the shared OS temp dir. Worktrees never contain your untracked `.env`.
- **Allowlisted environment.** Child processes get an environment built from an allowlist in `lib/stack.mjs`, not your shell's environment.
- **Local databases only.** The only database is the repo's Docker Postgres on `127.0.0.1:5435`. Each ref gets its own database (`regress_base`, `regress_head`), recreated and seeded on every run. Your `presidential_scoring` database is never touched.
- **No external services.** Redis, Resend, Google and Sentry are left unset. Rate limits fall back to in-memory, and sign-in providers are off.
- **Production auth guards.** The servers run `next start` with `AUTH_DISABLE_DEV_COOKIE=1` and `AUTH_DISABLE_DEV_CREDENTIALS=1`, the same as production.
- **Throwaway secrets.** Signed-in pages use a session cookie minted with a per-run random `AUTH_SECRET`. Admin pages also get the unlock cookie for a per-run random `ADMIN_TOKEN`.

## Requirements

- Docker running.
- Chromium for Playwright, installed once with `pnpm exec playwright install chromium`.
- About 2 GB of disk for the two worktrees and their builds. Builds are reused while the commit is unchanged.

## Notes

- **Timestamps.** Elements inside `<time>` or marked `data-regress-volatile` are masked in screenshots and text, because they legitimately differ between runs.
- **Audit-log regions.** On `/admin` and `/admin/audit`, the audit-log regions are masked. Each admin page view writes an audit row, so how many rows they show depends on timing.
- **Hydration errors.** Under load, president and sub-criterion pages sometimes fail to hydrate (React #418). This happens on `main` too, and it drops dark mode. The harness retries those captures and lists every failed attempt under **Notes**, so the bug stays visible without producing one-sided diffs.
- **Errors already on base.** Console errors present on base are listed as notes. Only errors that are new on head count as findings.
- **Calibrating.** Compare a ref against itself (`--base X --head X`). Anything reported is noise, and should be fixed before you trust a real comparison.
- **Expected changes.** Intended changes, such as a deliberate restyle, still show up. Check them in the report; the exit code doesn't tell intended changes apart from regressions.

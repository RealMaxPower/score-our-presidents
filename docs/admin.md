# Admin panel

Operator guide for `/admin/*`. For the security posture (what the admin surface protects against), see [`SECURITY.md`](../SECURITY.md). For environment variable setup, see [`DEPLOYMENT.md`](../DEPLOYMENT.md).

## Overview

The admin panel covers four operator surfaces:

| Route | Purpose |
|---|---|
| `/admin` | Dashboard: user / score / vote counts, 24h audit-event count, last 10 events |
| `/admin/users` | User moderation: toggle admin, set reputation, soft-delete / restore |
| `/admin/scores` | Score moderation: list user-submitted scores, permanent delete |
| `/admin/audit` | Audit log viewer: filter by action and actor, paginated |

Plus the second-factor flow: `/admin/unlock` (sign-in for the unlock cookie) and `/admin/lock` (clear it).

## Who can access

Two layers must both pass:

1. **NextAuth session** with `isAdmin === true` on the user's `UserProfile` row
2. **Unlock cookie** (`psf_admin_unlock`) carrying the `ADMIN_TOKEN` shared secret

If layer 1 fails, you get a **404** — the existence of `/admin/*` is deliberately not leaked. If layer 1 passes but layer 2 fails (no cookie, or the token rotated), pages redirect to `/admin/unlock`, and API routes return **`401 ADMIN_LOCKED`** so the client can surface a "Re-unlock" prompt without a dead page.

Dev convenience: if `ADMIN_TOKEN` is unset locally, layer 2 is a no-op. `lib/env.ts` requires a real `ADMIN_TOKEN` (≥32 chars) before booting a production server.

## Bootstrapping the first admin

There is no UI for promoting the very first admin — the admin panel exists to be used by an admin who already exists. Promote one out-of-band:

**Local dev (one command):**

```bash
pnpm tsx db/seed-dev-users.ts
# creates max@example.com with isAdmin=true (and two non-admin test users)
```

**Production:**

Pick whichever feels safest in your environment:

```bash
# Option A — Prisma Studio (UI)
pnpm db:studio
# → open UserProfile, toggle isAdmin to true on the row you want

# Option B — direct SQL
psql "$DATABASE_URL_UNPOOLED" -c \
  "UPDATE user_profiles SET \"isAdmin\" = true WHERE email = 'you@example.com';"
```

Then sign in as that user and proceed to the unlock flow.

## Sign in + unlock flow

1. Sign in via your normal provider (Google, magic link, or dev credentials).
2. Visit `/admin` — you get redirected to `/admin/unlock`.
3. Paste `ADMIN_TOKEN` (the value from your env). The form POSTs to `/api/admin/unlock`, which rate-limits per IP and compares the submitted token against `ADMIN_TOKEN` in constant time.
4. On success: an `httpOnly + SameSite=Strict + Secure` cookie is set, scoped to `path=/`, short-lived. You land on `/admin`.
5. When the cookie expires (or after you click **Lock**) you re-unlock with the same token.

The cookie value is the token itself, but the cookie is `httpOnly` so JS can't read it, and `SameSite=Strict` prevents cross-site issuance.

## Dashboard (`/admin`)

Four stat tiles + the 10 most recent audit events.

| Tile | Counts |
|---|---|
| Users | `UserProfile` rows where `deletedAt IS NULL` |
| User scores | All `UserScore` rows |
| Votes | All `UserVote` rows |
| Audit events / 24h | `AuditLog` rows in the last 86 400 000 ms |

The "Recent activity" list shows the same shape as `/admin/audit` but unfiltered and limited to 10.

## User moderation (`/admin/users`)

Table of every `UserProfile`, active accounts first (`deletedAt ASC NULLS FIRST`), then by email. Columns: email, display name, verified, account age (days), reputation (0.00–5.00), admin flag, soft-delete status, actions.

Per-row actions all hit `PATCH /api/admin/users/:id`:

| Action | Request body | Audit action written |
|---|---|---|
| Toggle admin | `{ "isAdmin": boolean }` | `admin.user.is_admin.granted` or `.revoked` |
| Set reputation | `{ "reputationScore": number }` (0–5) | `admin.user.reputation.set` |
| Soft-delete | `{ "softDeleted": true }` | `admin.user.soft_deleted` |
| Restore | `{ "softDeleted": false }` | `admin.user.restored` |

**Self-protection:**

- Revoking your own `isAdmin` returns **`409 CANNOT_REVOKE_OWN_ADMIN`**.
- Soft-deleting your own account returns **`409 CANNOT_DELETE_SELF`**.

Both checks compare the target `id` to the current admin's `id`. If you need to demote yourself, ask another admin to do it.

Soft-delete is reversible (it sets `deletedAt = now()`; restore sets it back to `null`). The row is retained for forensics and audit-log integrity.

## Score moderation (`/admin/scores`)

Paginated list (50 per page) of every `UserScore`, newest first. Each row shows submitter, president, sub-criterion, good / harm scores, evidence count, and a delete action.

**Deletion is permanent.** The row is removed, evidence cascade-deletes, and an `user_score.delete.admin` audit entry is written with the original owner's ID in `targetId` and the admin's ID in `actorId`.

(Owners deleting their own scores produce `user_score.delete.owner`. The two are distinguished in the audit log.)

Cross-user deletion requires the unlock cookie to be present — a stolen NextAuth session cookie alone cannot delete other users' scores.

## Audit log (`/admin/audit`)

Paginated viewer (50 per page) of `AuditLog`, newest first.

**Filters** (via querystring):

- `?action=<known action>` — exact match on a known action name
- `?actor=<UUID>` — exact match on actor ID (use the full UUID; the form accepts a UUID prefix but the query is exact)
- `?page=<n>` — zero-indexed page

The 15 known actions (the filter dropdown):

```
sign_in.success                 sign_in.failure              sign_out
user_score.create               user_score.update            user_score.delete.owner
user_score.delete.admin         admin.access                 admin.user.is_admin.granted
admin.user.is_admin.revoked     admin.user.reputation.set    admin.user.soft_deleted
admin.user.restored             admin.unlock.success         admin.unlock.failure
admin.lock
```

Columns: `When` (ISO-truncated to second), `Action`, `Actor` (first 8 chars of UUID), `Target` (`<type>:<first 8>`), `IP`, `Metadata` (JSON, truncated to fit).

The `Metadata` column carries action-specific context — e.g., the previous reputation value on `admin.user.reputation.set`, or `{previous: true}` on `admin.user.is_admin.revoked`.

## Locking and re-unlock

- Click the **Lock** button in the admin nav, or hit `/admin/lock` directly. The unlock cookie is cleared (`/api/admin/lock` writes an `admin.lock` audit entry and removes the cookie). Your NextAuth session is untouched.
- The cookie also expires automatically after its configured lifetime regardless.
- API clients can detect a stale-cookie state by the **`401 ADMIN_LOCKED`** response and prompt the user to re-unlock inline.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `/admin` shows 404 | Signed-in user is not `isAdmin`, or not signed in | Promote the user (see Bootstrap), or sign in |
| `/admin` redirects to `/admin/unlock` repeatedly | Cookie not being set | Browser is blocking 3rd-party cookies on `Secure`-only context (use HTTPS in prod, or `localhost` in dev); confirm `ADMIN_TOKEN` is set in env |
| Unlock POST returns 401 / "Invalid token" | Submitted value doesn't match `ADMIN_TOKEN` | Re-copy the env value; confirm the deployed instance has the same `ADMIN_TOKEN` as the one you're submitting |
| Unlock POST returns 429 | Per-IP rate limit tripped | Wait a minute and retry |
| `/api/admin/*` returns `401 ADMIN_LOCKED` | Unlock cookie expired or never set | Re-unlock at `/admin/unlock` |
| `PATCH /api/admin/users/:id` returns `409 CANNOT_REVOKE_OWN_ADMIN` | You're trying to revoke your own admin | Have another admin do it |
| Admin promoted in DB but `/admin` still 404s | Session is cached with old `isAdmin=false` | Sign out and sign in again to refresh the JWT |

## Reference: admin API

All routes require `Content-Type: application/json` on write requests.

### `POST /api/admin/unlock`

Body: `{ "token": string }`. Exchanges the token for the unlock cookie. Rate-limited per IP. Writes `admin.unlock.success` or `admin.unlock.failure`.

### `POST /api/admin/lock` (also accepts `DELETE`)

No body. Clears the unlock cookie. Writes `admin.lock`.

### `PATCH /api/admin/users/[id]`

Body must include at least one of `isAdmin`, `reputationScore`, `softDeleted`. Returns:

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ ok: true, changed: boolean }` | Applied (`changed=false` if the request was a no-op) |
| 400 | `{ error: "INVALID_ID" \| "INVALID_BODY" \| "VALIDATION_ERROR", details? }` | Malformed request |
| 401 | `{ error: "ADMIN_LOCKED" }` | Admin user, but unlock cookie missing or expired |
| 404 | `{ error: "NOT_FOUND" }` | Caller is not an admin (route existence not leaked) |
| 404 | `{ error: "USER_NOT_FOUND" }` | Target UUID doesn't exist |
| 409 | `{ error: "CANNOT_REVOKE_OWN_ADMIN" \| "CANNOT_DELETE_SELF" }` | Self-protection tripped |
| 415 | `{ error: "UNSUPPORTED_MEDIA_TYPE" }` | Missing `Content-Type: application/json` |

Each successful field change writes its own audit entry, so multi-field PATCH produces multi-entry audit trails.

---

*See also: [`SECURITY.md`](../SECURITY.md) for the threat model, [`DEPLOYMENT.md`](../DEPLOYMENT.md) for `ADMIN_TOKEN` setup in production, and [`SETUP.md`](../SETUP.md) for the local dev seed.*

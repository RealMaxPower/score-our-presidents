// Admin auth + helpers.
//
// Two layers gate /admin/*:
//   1. Authentication + authorization: the signed-in user must have
//      `isAdmin === true` (requireAdminAuthn).
//   2. Second factor: a per-browser unlock cookie that holds the
//      ADMIN_TOKEN shared secret. The user proves they hold the secret
//      once via /admin/unlock, then gets a httpOnly + SameSite=Strict +
//      path-scoped cookie. Subsequent admin requests check both layers.
//
// `requireAdmin()` is the full gate (both layers). It redirects to
// /admin/unlock if the user is admin-authed but not unlocked. Non-admins
// get notFound() — we deliberately return 404 (not 403) so the existence
// of the /admin tree is not leaked to unauthenticated probes.
//
// In dev, leaving ADMIN_TOKEN unset turns the second-factor check into a
// no-op (returns true) so local dev doesn't require an extra step. In
// production lib/env.ts requires ADMIN_TOKEN ≥32 chars.

import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { env } from "./env";
import { currentUser, type SessionUser } from "./auth";

const ADMIN_UNLOCK_COOKIE = "psf_admin_unlock";
// 8 hours — short enough to require daily re-unlock, long enough to be
// usable across a working session.
const ADMIN_UNLOCK_MAX_AGE_S = 60 * 60 * 8;

function constantTimeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Layer 1 only: signed in AND isAdmin. Used by the unlock page itself. */
export async function requireAdminAuthn(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || !user.isAdmin) notFound();
  return user;
}

/** Both layers: signed in + isAdmin + valid unlock cookie. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAdminAuthn();
  if (!(await isAdminUnlocked())) redirect("/admin/unlock");
  return user;
}

/** API-route variant: returns the user if both layers pass, else null. */
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await currentUser();
  if (!user || !user.isAdmin) return null;
  if (!(await isAdminUnlocked())) return null;
  return user;
}

export async function isAdminUnlocked(): Promise<boolean> {
  // Dev convenience: with no ADMIN_TOKEN configured, the second-factor
  // check is a no-op. Production env validation requires it to be set.
  if (!env.ADMIN_TOKEN) return true;
  const c = await cookies();
  const raw = c.get(ADMIN_UNLOCK_COOKIE)?.value;
  if (!raw) return false;
  return constantTimeStringEqual(raw, env.ADMIN_TOKEN);
}

/** Verify a submitted token against ADMIN_TOKEN in constant time. */
export function verifyAdminToken(submitted: string): boolean {
  if (!env.ADMIN_TOKEN) return false;
  return constantTimeStringEqual(submitted, env.ADMIN_TOKEN);
}

export async function setAdminUnlockCookie(): Promise<void> {
  if (!env.ADMIN_TOKEN) return;
  const c = await cookies();
  c.set(ADMIN_UNLOCK_COOKIE, env.ADMIN_TOKEN, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    // Path "/" so the cookie is sent to both /admin/* (pages) AND
    // /api/admin/* (admin API) AND any other route that re-uses the
    // unlock check (e.g. cross-user delete in /api/user-scores). The
    // cookie is still httpOnly + SameSite=Strict, so the only leak
    // surface is server-rendered request handling — which is trusted.
    path: "/",
    maxAge: ADMIN_UNLOCK_MAX_AGE_S,
  });
}

export async function clearAdminUnlockCookie(): Promise<void> {
  const c = await cookies();
  c.delete({ name: ADMIN_UNLOCK_COOKIE, path: "/" });
}

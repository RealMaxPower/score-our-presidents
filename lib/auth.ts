// Auth surface for the rest of the app. `currentUser()` reads NextAuth's
// session first, then falls back to the dev cookie if no NextAuth session
// exists. The fallback keeps existing E2E + smoke flows working in dev mode
// without any OAuth credentials configured.
//
// Production should disable the dev-cookie fallback by setting
// `AUTH_DISABLE_DEV_COOKIE=1`.
//
// Server-only — never bundle into a client component (would expose the
// session-cookie reading path to the browser).
import "server-only";

import { cookies } from "next/headers";
import { auth as nextAuth } from "@/auth";
import { prisma } from "./prisma";

const SESSION_COOKIE = "psf_session";
// 24h — short enough that a leaked cookie expires before most exploitation
// is noticed. NextAuth sessions are independent (30d JWT by default).
const SESSION_MAX_AGE_S = 60 * 60 * 24;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  reputationScore: number;
  emailVerified: boolean;
  accountAgeDays: number;
  isAdmin: boolean;
}

function toSessionUser(
  u: NonNullable<Awaited<ReturnType<typeof prisma.userProfile.findUnique>>>
): SessionUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    reputationScore: Number(u.reputationScore),
    emailVerified: u.emailVerified,
    accountAgeDays: Math.floor(
      (Date.now() - u.accountCreatedAt.getTime()) / 86400000
    ),
    isAdmin: u.isAdmin,
  };
}

export async function currentUser(): Promise<SessionUser | null> {
  // 1. Preferred: NextAuth.js v5 session
  try {
    const session = await nextAuth();
    if (session?.user?.email) {
      const profile = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
      });
      if (profile && !profile.deletedAt) return toSessionUser(profile);
    }
  } catch {
    // NextAuth not configured (e.g. NEXTAUTH_SECRET missing in dev) — fall through.
  }

  // 2. Dev fallback: psf_session cookie storing UserProfile.email
  if (process.env.AUTH_DISABLE_DEV_COOKIE === "1") return null;
  const c = await cookies();
  const email = c.get(SESSION_COOKIE)?.value;
  if (!email) return null;
  const profile = await prisma.userProfile.findUnique({ where: { email } });
  if (!profile || profile.deletedAt) return null;
  return toSessionUser(profile);
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export async function setSessionCookie(email: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

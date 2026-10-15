// Browser contexts per role. Signed-in roles get a NextAuth session cookie
// minted with this run's throwaway AUTH_SECRET (the dev psf_session cookie is
// disabled, as in production). Admin also gets the second-factor unlock
// cookie, whose value is ADMIN_TOKEN (lib/admin.ts).
import { encode } from "next-auth/jwt";
import { ADMIN_TOKEN, AUTH_SECRET } from "./stack.mjs";

// Seeded by db/seed-dev-users.ts.
export const ROLE_USERS = {
  user: { email: "alex@example.com", name: "Alex Casual" },
  admin: { email: "max@example.com", name: "Max" },
};

// http origin, so no __Secure- prefix; the salt must equal the cookie name.
const SESSION_COOKIE = "authjs.session-token";

export async function sessionCookie(origin, { email, name }) {
  const value = await encode({
    token: { email, name },
    secret: AUTH_SECRET,
    salt: SESSION_COOKIE,
    maxAge: 60 * 60,
  });
  return { name: SESSION_COOKIE, value, url: origin, httpOnly: true, sameSite: "Lax" };
}

export function adminUnlockCookie(origin) {
  return { name: "psf_admin_unlock", value: ADMIN_TOKEN, url: origin, httpOnly: true, sameSite: "Strict", secure: true };
}

export async function newContext(browser, variant = {}) {
  return browser.newContext({
    colorScheme: variant.colorScheme ?? "light",
    viewport: variant.viewport ?? { width: 1280, height: 800 },
    isMobile: variant.isMobile ?? false,
    hasTouch: variant.hasTouch ?? false,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
}

export async function contextFor(browser, role, variant, side) {
  const ctx = await newContext(browser, variant);
  const origin = side.server.origin;
  if (role === "user" || role === "admin") {
    await ctx.addCookies([await sessionCookie(origin, ROLE_USERS[role])]);
  }
  if (role === "admin") await ctx.addCookies([adminUnlockCookie(origin)]);
  return ctx;
}

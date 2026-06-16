// NextAuth.js v5 (Auth.js) configuration.
//
// Three providers, gated by environment so dev works without any credentials:
//   1. Credentials — email-only sign-in for any seeded UserProfile (dev mode).
//   2. Google OAuth — activates when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
//   3. Email magic-link via Resend's REST API — activates when AUTH_RESEND_KEY
//      and EMAIL_FROM are set (no SMTP; Auth.js calls Resend directly).
//
// On any successful sign-in we ensure a `UserProfile` row exists keyed by
// email, so all domain features (votes, scores, weights, bookmarks) work
// uniformly regardless of provider.

import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { magicLinkEmail } from "@/lib/emails/templates";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      profileId: string | null;
    } & DefaultSession["user"];
  }
}

const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);
// Auth.js auto-picks `AUTH_RESEND_KEY` if named exactly that. EMAIL_FROM
// is our project-side env (Auth.js's Resend provider calls it `from`).
const resendConfigured = Boolean(
  process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM
);

const providers = [
  // Dev-only email-as-password Credentials provider. Only matches a UserProfile
  // that already exists (no auto-signup). Belt-and-suspenders gating:
  //   1. NODE_ENV must not be "production" (Vercel/etc set this automatically)
  //   2. AUTH_DISABLE_DEV_CREDENTIALS must not be "1"
  // Either one off → provider not registered, so it can't be exploited even
  // if the explicit flag is forgotten in a production deploy.
  ...(process.env.NODE_ENV === "production" ||
  process.env.AUTH_DISABLE_DEV_CREDENTIALS === "1"
    ? []
    : [
        Credentials({
          id: "dev-email",
          name: "Dev (email only)",
          credentials: {
            email: { label: "Email", type: "email" },
          },
          async authorize(creds) {
            const email = (creds?.email as string | undefined)?.toLowerCase();
            if (!email) return null;
            const profile = await prisma.userProfile.findUnique({
              where: { email },
            });
            if (!profile || profile.deletedAt) return null;
            // Returning shape Auth.js maps to the session JWT.
            return {
              id: profile.id,
              email: profile.email,
              name: profile.displayName ?? null,
            };
          },
        }),
      ]),
  ...(googleConfigured
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : []),
  ...(resendConfigured
    ? [
        Resend({
          apiKey: process.env.AUTH_RESEND_KEY!,
          from: process.env.EMAIL_FROM!,
          // Override Auth.js's bare default template (host-as-heading, no
          // plain-text part) with the branded magic-link email.
          async sendVerificationRequest({ identifier, url, provider }) {
            const { subject, html, text } = magicLinkEmail({ url });
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: provider.from,
                to: identifier,
                subject,
                html,
                text,
              }),
            });
            if (!res.ok) {
              throw new Error(
                `Resend error ${res.status}: ${await res.text().catch(() => "")}`
              );
            }
          },
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  // JWT strategy keeps the Credentials provider working (Database strategy
  // requires a Session row, which Credentials does not create).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist profileId in the JWT so the session callback doesn't need a
      // DB query on every page render.
      if (user?.email) {
        const profile = await prisma.userProfile.upsert({
          where: { email: user.email },
          update: {
            displayName: user.name ?? undefined,
          },
          create: {
            authId: `nextauth:${user.id}`,
            email: user.email,
            displayName: user.name ?? null,
            emailVerified: true, // OAuth/magic-link verify email implicitly
            emailVerifiedAt: new Date(),
          },
        });
        token.profileId = profile.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.profileId = (token.profileId as string | null) ?? null;
      }
      return session;
    },
  },
});

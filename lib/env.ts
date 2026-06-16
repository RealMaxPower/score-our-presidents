// Server-only: importing this module from a client component throws at
// build time. Prevents the "DATABASE_URL: Required" runtime crash in the
// browser when a client component transitively pulls server config.
import "server-only";

import { z } from "zod";

// Vercel-Supabase integration auto-provisions POSTGRES_PRISMA_URL (pooled,
// with ?pgbouncer=true&connection_limit=1) and POSTGRES_URL_NON_POOLING
// (direct) into the deployment env. Alias them to the canonical names our
// code + Prisma schema expect, so the integration "just works" without
// requiring the user to hand-copy values in the Vercel dashboard.
//
// Must run BEFORE zod parses process.env below. Idempotent: only aliases
// when the canonical name is unset, so dev/local .env values win when
// explicitly configured.
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}
if (
  !process.env.DATABASE_URL_UNPOOLED &&
  process.env.POSTGRES_URL_NON_POOLING
) {
  process.env.DATABASE_URL_UNPOOLED = process.env.POSTGRES_URL_NON_POOLING;
}

// Known placeholder values that have shipped in .env / .env.example over
// time. Any match → prod startup fails. The pattern check below also
// catches future "dev-secret-..." style placeholders we haven't seen yet.
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "dev-secret-replace-before-sprint-3",
  "dev-secret-replace-before-deploy",
]);
const PLACEHOLDER_PATTERN = /^dev-secret-/i;

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
        message: "DATABASE_URL must be a postgres connection string",
      }),
    DATABASE_URL_UNPOOLED: z.string().optional(),

    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    AUTH_RESEND_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),

    // Toggles to disable dev auth fallbacks in production. Any truthy value
    // (typically "1") disables; empty / unset leaves the dev path enabled.
    AUTH_DISABLE_DEV_CREDENTIALS: z.string().optional(),
    AUTH_DISABLE_DEV_COOKIE: z.string().optional(),

    // Second-factor shared secret for /admin/* access. Required in
    // production. Generate via `openssl rand -base64 32`.
    ADMIN_TOKEN: z.string().optional(),

    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .default("info"),
  })
  .superRefine((env, ctx) => {
    // Only enforce these guards when actually running a production server
    // (`next start`). During `next build`, route handlers are imported with
    // NODE_ENV=production for static page-data collection, but the build
    // itself isn't a deploy — let it pass so local builds succeed with a
    // dev .env. The deploy environment will have real values set and these
    // guards will fire then if they don't.
    const phase = process.env.NEXT_PHASE;
    if (phase !== "phase-production-server") return;

    // NEXTAUTH_SECRET: must be set, non-placeholder, and at least 32 chars
    // when present. Skip when not set (allows deploys that haven't wired
    // auth yet — but NextAuth itself will fail to initialize in that case).
    if (env.NEXTAUTH_SECRET) {
      const isKnownPlaceholder = KNOWN_PLACEHOLDER_SECRETS.has(
        env.NEXTAUTH_SECRET
      );
      const looksLikePlaceholder = PLACEHOLDER_PATTERN.test(
        env.NEXTAUTH_SECRET
      );
      if (
        isKnownPlaceholder ||
        looksLikePlaceholder ||
        env.NEXTAUTH_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXTAUTH_SECRET"],
          message:
            "NEXTAUTH_SECRET must be a real ≥32-char value in production (generate via `openssl rand -base64 32`), not the .env.example placeholder.",
        });
      }
    }

    // Dev auth fallbacks must be explicitly disabled in production. Without
    // these, the dev Credentials provider (auth.ts) and the unsigned
    // psf_session cookie (lib/auth.ts) remain active, allowing trivial
    // account takeover by forging the cookie.
    if (env.AUTH_DISABLE_DEV_COOKIE !== "1") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_DISABLE_DEV_COOKIE"],
        message:
          "AUTH_DISABLE_DEV_COOKIE must be \"1\" in production to disable the dev cookie fallback in lib/auth.ts (the cookie is unsigned and forgeable).",
      });
    }
    if (env.AUTH_DISABLE_DEV_CREDENTIALS !== "1") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_DISABLE_DEV_CREDENTIALS"],
        message:
          "AUTH_DISABLE_DEV_CREDENTIALS must be \"1\" in production to disable the email-only Credentials provider in auth.ts (it accepts any seeded email without a password).",
      });
    }

    // Upstash is required in production. Without it `lib/rate-limit.ts`
    // falls back to a per-process in-memory Map — on Vercel each cold
    // invocation may get a fresh process, so limits effectively don't
    // enforce. Both REST URL and token must be set.
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["UPSTASH_REDIS_REST_URL"],
        message:
          "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. Without Upstash, rate limits fall back to a per-process in-memory map and don't enforce reliably on serverless.",
      });
    }

    // ADMIN_TOKEN: second factor gating /admin/*. Required in prod; min 32
    // chars to make brute-forcing on the rate-limited unlock route infeasible.
    if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ADMIN_TOKEN"],
        message:
          "ADMIN_TOKEN must be set to a value of at least 32 chars in production (generate via `openssl rand -base64 32`). Required as the second factor for /admin access on top of the NextAuth session.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`
  );
  throw new Error(
    `Invalid environment configuration:\n${lines.join("\n")}\n\nCheck .env against .env.example.`
  );
}

export const env = parsed.data;

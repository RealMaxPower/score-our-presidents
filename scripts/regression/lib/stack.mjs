// Builds and runs one isolated copy of the app per git ref.
//
// Isolation is the point: each ref is checked out into its own git worktree
// (worktrees never contain the untracked .env), and every child process gets
// an environment built from an allowlist below rather than inheriting
// process.env. The only database is the repo's docker-compose Postgres on
// 127.0.0.1:5435, and Redis, Resend, Google and Sentry are left unset, so a
// run cannot reach a hosted database or send email.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: dirname(fileURLToPath(import.meta.url)),
  encoding: "utf8",
}).trim();
// Worktrees, builds and reports live in a per-user cache dir, not the shared
// OS temp dir: on Linux that is /tmp, where another user could pre-create
// this path and have the harness install and build whatever they planted.
export const WORK_ROOT = join(
  process.env.XDG_CACHE_HOME || join(homedir(), ".cache"),
  "score-our-presidents-regress"
);
mkdirSync(WORK_ROOT, { recursive: true, mode: 0o700 });

const DB_CONTAINER = "presidential-scoring-db";

// Fresh per run; never written anywhere but child-process env.
export const AUTH_SECRET = randomBytes(32).toString("base64url");
export const ADMIN_TOKEN = randomBytes(24).toString("base64url");

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

export function resolveRef(ref) {
  return execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

export function testEnv({ dbName, port }) {
  // docker-compose.yml's local-only default credentials.
  const db = `postgresql://postgres:postgres@localhost:5435/${dbName}`;
  const origin = `http://localhost:${port}`;
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    LANG: "en_US.UTF-8",
    TZ: "UTC",
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: db,
    POSTGRES_URL_NON_POOLING: db,
    NEXTAUTH_URL: origin,
    AUTH_URL: origin,
    AUTH_TRUST_HOST: "true",
    NEXTAUTH_SECRET: AUTH_SECRET,
    AUTH_SECRET,
    // Inlined at build time, so it must be identical for both refs or every
    // canonical/OG URL would show up as a text diff.
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    // Same production guards Vercel runs with (lib/env.ts enforces them).
    AUTH_DISABLE_DEV_COOKIE: "1",
    AUTH_DISABLE_DEV_CREDENTIALS: "1",
    ADMIN_TOKEN,
  };
}

export function ensureDatabase() {
  run("docker", ["compose", "-f", join(REPO_ROOT, "docker-compose.yml"), "up", "-d", "--wait"]);
}

export function sql(dbName, query) {
  return execFileSync(
    "docker",
    ["exec", DB_CONTAINER, "psql", "-U", "postgres", "-d", dbName, "-tAc", query],
    { encoding: "utf8" }
  ).trim();
}

export function prepareWorktree(side, sha) {
  const dir = join(WORK_ROOT, `${side}-${sha.slice(0, 12)}`);
  if (!existsSync(join(dir, ".git"))) {
    rmSync(dir, { recursive: true, force: true });
    run("git", ["worktree", "add", "--detach", dir, sha], { cwd: REPO_ROOT });
  }
  return dir;
}

const builtMarker = (dir) => join(dir, ".regress-built");
const worktreeSha = (dir) =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();

export function isBuilt(dir) {
  const marker = builtMarker(dir);
  return existsSync(marker) && readFileSync(marker, "utf8") === worktreeSha(dir);
}

export function install(dir, env) {
  run("pnpm", ["install", "--frozen-lockfile"], { cwd: dir, env });
}

// Needs a seeded database: generateStaticParams reads presidents from it.
export function build(dir, env) {
  run("pnpm", ["build"], { cwd: dir, env });
  writeFileSync(builtMarker(dir), worktreeSha(dir));
}

// Seeded user ids are random UUIDs, and admin pages print id prefixes, so pin
// them to fixed values (nothing references user_profiles yet at this point).
const PINNED_USER_IDS = {
  "max@example.com": "00000000-0000-4000-8000-000000000001",
  "alex@example.com": "00000000-0000-4000-8000-000000000002",
  "newbie@example.com": "00000000-0000-4000-8000-000000000003",
};

// Drops and recreates the ref's own database, then seeds it the same way a
// developer would (SETUP.md): framework data from scores/*.yaml plus the dev
// users. The developer's own `presidential_scoring` database is never touched.
export function resetDatabase(dir, env, dbName) {
  run("pnpm", ["exec", "prisma", "migrate", "reset", "--force", "--skip-seed", "--skip-generate"], {
    cwd: dir,
    env,
  });
  run("pnpm", ["db:seed"], { cwd: dir, env });
  run("pnpm", ["exec", "tsx", "db/seed-dev-users.ts"], { cwd: dir, env });
  for (const [email, id] of Object.entries(PINNED_USER_IDS)) {
    sql(dbName, `update user_profiles set id='${id}' where email='${email}'`);
  }
}

export async function startServer(dir, env, port) {
  const child = spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
    cwd: dir,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const origin = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`server on ${port} exited:\n${log}`);
    try {
      const res = await fetch(`${origin}/robots.txt`);
      if (res.ok) return { origin, stop: () => stopServer(child), log: () => log };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer(child);
  throw new Error(`server on ${port} did not start:\n${log}`);
}

function stopServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // already gone
  }
}

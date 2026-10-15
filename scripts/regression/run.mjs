// Before/after regression check: builds two git refs into isolated
// worktrees, runs each against its own freshly seeded local database, and
// diffs screenshots, page text, headers, a11y and interaction flows.
//
//   pnpm regress                              # origin/main vs HEAD
//   pnpm regress --base main --head my-branch
//   pnpm regress --only president --variants light-desktop --no-flows
//   pnpm regress --no-capture                 # flows only
//
// See scripts/regression/README.md.
import { chromium } from "playwright";
import { parseArgs } from "node:util";
import { join } from "node:path";
import {
  WORK_ROOT,
  build,
  ensureDatabase,
  install,
  isBuilt,
  prepareWorktree,
  resetDatabase,
  resolveRef,
  startServer,
  testEnv,
} from "./lib/stack.mjs";
import { ADMIN_ROUTES, USER_ROUTES, VARIANTS, captureAll, discoverRoutes } from "./lib/capture.mjs";
import { contextFor } from "./lib/session.mjs";
import { runFlows } from "./lib/flows.mjs";
import { compareRuns } from "./lib/compare.mjs";

const { values: args } = parseArgs({
  options: {
    base: { type: "string", default: "origin/main" },
    head: { type: "string", default: "HEAD" },
    rebuild: { type: "boolean", default: false },
    "no-flows": { type: "boolean", default: false },
    "no-capture": { type: "boolean", default: false },
    only: { type: "string" },
    variants: { type: "string" },
  },
});

const runDir = join(WORK_ROOT, `run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const sides = [
  { name: "base", ref: args.base, port: 3201, db: "regress_base" },
  { name: "head", ref: args.head, port: 3202, db: "regress_head" },
];

ensureDatabase();
for (const side of sides) {
  side.sha = resolveRef(side.ref);
  console.log(`\n▶ ${side.name}: ${side.ref} (${side.sha.slice(0, 12)})`);
  side.dir = prepareWorktree(side.name, side.sha);
  side.env = testEnv({ dbName: side.db, port: side.port });
  const reuse = !args.rebuild && isBuilt(side.dir);
  if (!reuse) install(side.dir, side.env);
  resetDatabase(side.dir, side.env, side.db);
  if (reuse) console.log(`  reusing build in ${side.dir}`);
  else build(side.dir, side.env);
}

const browser = await chromium.launch();
let exitCode = 1;
try {
  for (const side of sides) side.server = await startServer(side.dir, side.env, side.port);

  const discovered = [
    ...new Set([
      ...(await discoverRoutes(sides[0].server.origin)),
      ...(await discoverRoutes(sides[1].server.origin)),
    ]),
  ].sort();
  const filter = (routes) => (args.only ? routes.filter((r) => r.includes(args.only)) : routes);
  const routesByRole = {
    anon: filter(discovered),
    user: filter(USER_ROUTES),
    admin: filter(ADMIN_ROUTES),
  };
  const variants = args.variants
    ? VARIANTS.filter((v) => args.variants.split(",").includes(v.name))
    : VARIANTS;
  console.log(
    `\n▶ capturing ${Object.values(routesByRole).flat().length} routes × ${variants.length} variants per side`
  );

  const captures = await Promise.all(
    sides.map((side) =>
      args["no-capture"]
        ? []
        : captureAll({
            browser,
            origin: side.server.origin,
            outDir: join(runDir, side.name),
            routesByRole,
            variants,
            contextFor: (b, role, variant) => contextFor(b, role, variant, side),
          })
    )
  );

  let flows = [];
  if (!args["no-flows"]) {
    console.log("\n▶ running interaction flows");
    const [baseFlows, headFlows] = await Promise.all(sides.map((side) => runFlows(browser, side, join(runDir, side.name))));
    flows = baseFlows.map((b, i) => ({ name: b.name, base: b, head: headFlows[i] }));
  }

  const reportDir = join(runDir, "report");
  const { findings, notes } = compareRuns({
    base: captures[0],
    head: captures[1],
    baseDir: join(runDir, "base"),
    headDir: join(runDir, "head"),
    reportDir,
    flows,
  });

  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  console.log(`\n${findings.length ? "✗" : "✓"} ${findings.length} finding(s) ${JSON.stringify(byKind)}`);
  if (notes.length) console.log(`  ${notes.length} note(s): errors already present on base (see report)`);
  for (const f of flows) {
    console.log(`  flow ${f.name}: base ${f.base.ok ? "pass" : "FAIL"}, head ${f.head.ok ? "pass" : "FAIL"}`);
  }
  console.log(`  report: ${join(reportDir, "index.html")}`);
  exitCode = findings.length ? 1 : 0;
} finally {
  await browser.close();
  for (const side of sides) side.server?.stop();
}
process.exit(exitCode);

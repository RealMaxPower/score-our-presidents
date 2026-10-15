// Captures every route in every variant for one running server.
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const VARIANTS = [
  { name: "light-desktop", colorScheme: "light", viewport: { width: 1280, height: 800 } },
  { name: "dark-desktop", colorScheme: "dark", viewport: { width: 1280, height: 800 } },
  {
    name: "light-mobile",
    colorScheme: "light",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "dark-mobile",
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
];

// Text, headers, console and axe are recorded once per route, on this variant.
const DEEP_VARIANT = "light-desktop";

export const PUBLIC_ROUTES = [
  "/",
  "/methodology",
  "/privacy",
  "/terms",
  "/sign-in",
  "/community/weights",
  "/admin/unlock",
];
export const USER_ROUTES = [
  "/me/account",
  "/me/bookmarks",
  "/me/contributions",
  "/me/votes",
  "/me/weights",
];
export const ADMIN_ROUTES = ["/admin", "/admin/audit", "/admin/scores", "/admin/users"];

const COMPARED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cache-control",
  "content-type",
];

// Vercel Web Analytics only exists on Vercel deployments; locally its script
// always 404s, on both refs.
const isKnownNoise = (s = "") => s.includes("/_vercel/insights/");

// Elements whose content legitimately differs between two runs (timestamps),
// blanked out of screenshots and text so they can't produce false diffs.
const VOLATILE_SELECTORS = ["time", "[data-regress-volatile]"];

// The admin layout writes an audit row on every render, including the
// background renders from link prefetching, and the page's own query runs
// concurrently. So how many rows the dashboard and audit log show depends on
// timing. Pin those regions to a fixed height and mark them volatile; the
// rest of each page is still compared.
async function markVolatileRegions(page, route) {
  await page.evaluate((route) => {
    // A fixed height or fixed text keeps the masked box the same size on both
    // refs, whatever the row count.
    const mark = (el, height, text) => {
      if (!el) return;
      el.setAttribute("data-regress-volatile", "");
      if (height) Object.assign(el.style, { height, overflow: "hidden" });
      if (text) el.textContent = text;
    };
    const lastWithText = (sel, re) =>
      [...document.querySelectorAll(sel)].findLast((e) => re.test(e.textContent));
    if (route === "/admin") {
      mark(lastWithText("h2", /Recent activity/)?.closest("section")?.querySelector("ul"), "160px");
      mark(document.querySelector('section a[href="/admin/audit"]'));
    }
    if (route === "/admin/audit") {
      mark(document.querySelector("table")?.parentElement, "240px");
      mark(lastWithText("p, div, span", /events · page/), null, "[volatile]");
    }
  }, route);
}

// Touching the DOM before React hydrates (masks add overlay nodes; the
// helpers below rewrite text) makes hydration fail, and React then
// client-renders the whole document, dropping <html class="dark">. The theme
// toggle is in the root layout on every page, so once React has attached
// props to it the root has hydrated.
export async function waitForHydration(page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('button[aria-label^="Switch to"]');
    return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
  });
}

export async function goto(page, url) {
  const res = await page.goto(url, { waitUntil: "networkidle" });
  await waitForHydration(page);
  return res;
}

// Admin pages print audit timestamps as plain "YYYY-MM-DD HH:MM:SS" text.
async function freezeTimestamps(page) {
  await page.evaluate(() => {
    const re = /\b\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\b/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, "0000-00-00 00:00:00");
      re.lastIndex = 0;
    }
  });
}

export async function discoverRoutes(origin) {
  const xml = await (await fetch(`${origin}/sitemap.xml`)).text();
  const fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname
  );
  return [...new Set([...PUBLIC_ROUTES, ...fromSitemap])].sort();
}

export const shotName = (route, variant) =>
  `${route === "/" ? "home" : route.slice(1).replaceAll("/", "__")}--${variant}.png`;

async function snap(page, origin, route, outDir, variant) {
  const consoleErrors = [];
  const failedRequests = [];
  // Each ref runs on its own port, so strip the origin before comparing.
  const local = (s) => s.replaceAll(origin, "<origin>");
  page.on("console", (m) => {
    if (m.type() !== "error" || isKnownNoise(m.text()) || isKnownNoise(m.location()?.url)) return;
    // The browser also logs the page's own non-2xx status (e.g. an admin
    // route's intentional 404); status is already compared directly.
    if (m.text().startsWith("Failed to load resource") && m.location()?.url === origin + route) return;
    consoleErrors.push(local(m.text()));
  });
  page.on("pageerror", (e) => consoleErrors.push(local(`pageerror: ${e.message}`)));
  page.on("response", (r) => {
    if (r.status() >= 400 && !isKnownNoise(r.url())) failedRequests.push(local(`${r.status()} ${r.url()}`));
  });

  const res = await goto(page, origin + route);
  await page.evaluate(() => document.fonts.ready);
  await freezeTimestamps(page);
  await markVolatileRegions(page, route);
  await page.waitForTimeout(250);

  const file = shotName(route, variant.name);
  await page.screenshot({
    path: join(outDir, "shots", file),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    mask: VOLATILE_SELECTORS.map((s) => page.locator(s)),
    maskColor: "#ff00ff",
  });

  const entry = { route, variant: variant.name, status: res?.status() ?? null, file };
  if (variant.name === DEEP_VARIANT) {
    entry.text = await page.evaluate((sels) => {
      for (const el of document.querySelectorAll(sels.join(","))) el.textContent = "[volatile]";
      return document.body.innerText.replace(/[ \t]+/g, " ").trim();
    }, VOLATILE_SELECTORS);
    const headers = res?.headers() ?? {};
    entry.headers = Object.fromEntries(COMPARED_HEADERS.map((h) => [h, headers[h] ?? null]));
    const axe = await new AxeBuilder({ page }).analyze();
    entry.axe = Object.fromEntries(axe.violations.map((v) => [v.id, v.nodes.length]));
  }
  entry.consoleErrors = consoleErrors;
  entry.failedRequests = failedRequests;
  return entry;
}

// Under CPU load, president and sub-criterion pages occasionally fail to
// hydrate (React #418) on main as well, and React's client re-render drops
// <html class="dark">. That is a real bug, but not one a given change
// introduces, so retry the capture and keep the failed attempts as notes
// instead of letting them show up as a one-sided diff.
const isHydrationError = (m) => /Minified React error #(418|423|425)|Hydration failed/.test(m);

async function snapWithRetry(ctx, origin, route, outDir, variant, attempts = 3) {
  const hydrationErrors = [];
  for (let i = 1; ; i++) {
    const page = await ctx.newPage();
    try {
      const entry = await snap(page, origin, route, outDir, variant);
      const failed = entry.consoleErrors.filter(isHydrationError);
      if (failed.length && i < attempts) {
        hydrationErrors.push(...failed);
        continue;
      }
      return { ...entry, hydrationErrors };
    } catch (e) {
      return { route, variant: variant.name, error: String(e), hydrationErrors };
    } finally {
      await page.close();
    }
  }
}

// `routesByRole` maps a role ("anon" | "user" | "admin") to its routes;
// `contextFor(browser, role, variant)` returns a signed-in context as needed.
export async function captureAll({ browser, origin, outDir, routesByRole, contextFor, variants = VARIANTS }) {
  mkdirSync(join(outDir, "shots"), { recursive: true });
  const results = [];
  for (const variant of variants) {
    for (const [role, routes] of Object.entries(routesByRole)) {
      const ctx = await contextFor(browser, role, variant);
      for (const route of routes) {
        results.push({ role, ...(await snapWithRetry(ctx, origin, route, outDir, variant)) });
      }
      await ctx.close();
    }
    console.log(`  captured ${variant.name}`);
  }
  writeFileSync(join(outDir, "capture.json"), JSON.stringify(results, null, 2));
  return results;
}

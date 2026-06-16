// Regenerate the README screenshots from the live site (or a local instance).
// Usage:  node scripts/capture-screenshots.mjs
//         BASE_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://www.scoreourpresidents.org";
const OUT = "docs/screenshots";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 760 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
const page = await ctx.newPage();

// Hero banner: scroll so "The Modern Era", the lens chips, and the top ranked rows are all in frame.
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(() => window.scrollTo(0, 470));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/hero-rankings.png` });
console.log(`-> ${OUT}/hero-rankings.png`);

// A full president scorecard (FDR), top to bottom.
const r = await page.goto(BASE + "/president/franklin_d_roosevelt", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/president-scorecard.png`, fullPage: true });
console.log(`${r?.status()} -> ${OUT}/president-scorecard.png`);

await browser.close();

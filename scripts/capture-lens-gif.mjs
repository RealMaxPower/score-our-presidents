// Build the lens-switching GIF for the README.
// Captures the ranked list as each value lens is clicked, then encodes a GIF.
// Requires an ffmpeg binary on PATH or via FFMPEG env var.
// Usage:  FFMPEG=/path/to/ffmpeg node scripts/capture-lens-gif.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "https://www.scoreourpresidents.org";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const OUT = "docs/screenshots/lens-switch.gif";
const frames = mkdtempSync(join(tmpdir(), "lensgif-"));

// The sequence of lenses to click through (must match the chip labels exactly).
const SEQUENCE = [
  "Default",
  "Progressive",
  "Conservative",
  "Realist",
  "Libertarian",
  "Internationalist",
  "Default",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
// Pin the lens chips near the top with as many ranked rows as possible below.
await page.evaluate(() => window.scrollTo(0, 540));
await page.waitForTimeout(400);

let i = 0;
for (const lens of SEQUENCE) {
  await page.getByRole("button", { name: lens, exact: true }).first().click();
  await page.waitForTimeout(1100); // let the reorder animation settle
  const file = join(frames, `frame-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  console.log(`captured ${lens} -> ${file}`);
  i++;
}
await browser.close();

// Encode: 0.7s per frame, scale to 900px wide, two-pass palette for clean color, infinite loop.
execFileSync(
  FFMPEG,
  [
    "-y",
    "-framerate", "1.43",
    "-i", join(frames, "frame-%02d.png"),
    "-vf", "scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
    "-loop", "0",
    OUT,
  ],
  { stdio: "inherit" }
);
console.log(`\nwrote ${OUT}`);

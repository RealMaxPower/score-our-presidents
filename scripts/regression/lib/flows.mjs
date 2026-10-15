// End-to-end interaction flows, run identically against each ref. Each flow
// asserts its own outcome (UI and database) and returns `observed` values
// that must match between base and head.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_TOKEN, sql } from "./stack.mjs";
import { ROLE_USERS, adminUnlockCookie, newContext, sessionCookie } from "./session.mjs";
import { goto, waitForHydration } from "./capture.mjs";

const THROWAWAY = { email: "regress-throwaway@example.com", name: "Regress Throwaway" };
const LENSES = ["Progressive", "Conservative", "Realist", "Libertarian", "Internationalist", "Default"];

async function rankedSlugs(page) {
  const links = page.getByRole("link", { name: /'s full scorecard$/ });
  return (await links.evaluateAll((els) => els.map((a) => a.getAttribute("href")))).map((h) =>
    h.replace("/president/", "")
  );
}

const FLOWS = [
  {
    name: "lens switching reorders rankings",
    role: "anon",
    async run({ page, origin }) {
      await goto(page, `${origin}/`);
      const observed = { default: await rankedSlugs(page) };
      for (const lens of LENSES) {
        const chip = page.getByRole("button", { name: lens, exact: true });
        await chip.click();
        await page.waitForFunction(
          (name) =>
            [...document.querySelectorAll("button[aria-pressed]")].some(
              (b) => b.getAttribute("aria-pressed") === "true" && b.textContent.includes(name)
            ),
          lens
        );
        await page.waitForLoadState("networkidle");
        observed[lens] = await rankedSlugs(page);
        assert.equal(observed[lens].length, 16, `${lens}: 16 rows`);
      }
      assert.notDeepEqual(observed.Progressive, observed.Conservative, "lenses reorder");
      return observed;
    },
  },
  {
    name: "theme toggle persists across reload",
    role: "anon",
    async run({ page, origin }) {
      await goto(page, `${origin}/`);
      const isDark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
      const before = await isDark();
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      assert.equal(await isDark(), true);
      await page.reload({ waitUntil: "networkidle" });
      await waitForHydration(page);
      assert.equal(await isDark(), true, "dark survives reload");
      await page.getByRole("button", { name: "Switch to light mode" }).click();
      assert.equal(await isDark(), false);
      return { before, toggled: true };
    },
  },
  {
    name: "president category and evidence expand",
    role: "anon",
    async run({ page, origin }) {
      await goto(page, `${origin}/president/franklin_d_roosevelt`);
      const card = page.locator("details").filter({ has: page.getByText("Economic outcomes", { exact: true }) });
      await card.locator("summary").first().click();
      assert.equal(await card.first().getAttribute("open"), "", "category opens");
      const evidence = card.getByText(/View \d+ sources? →/).first();
      await evidence.click();
      const sourceCount = Number((await evidence.textContent()).match(/\d+/)[0]);
      const subRows = await card.getByRole("link", { name: /^\d+\.\d+$/ }).count();
      return { subRows, sourceCount };
    },
  },
  {
    name: "vote agree then retract",
    role: "user",
    async run({ page, origin, db, userId }) {
      await goto(page, `${origin}/president/franklin_d_roosevelt`);
      const widget = page.getByText("Agree with this ranking?", { exact: true }).locator("..");
      const agree = widget.getByRole("button", { name: "Agree", exact: true });
      await agree.click();
      await page.waitForFunction((el) => el.getAttribute("aria-pressed") === "true", await agree.elementHandle());
      const stored = sql(db, `select direction from user_votes where user_id='${userId}' and target_type='president'`);
      assert.equal(stored, "agree");
      await agree.click();
      await page.waitForFunction((el) => el.getAttribute("aria-pressed") === "false", await agree.elementHandle());
      const after = sql(db, `select count(*) from user_votes where user_id='${userId}' and target_type='president'`);
      assert.equal(after, "0");
      return { stored, after };
    },
  },
  {
    name: "bookmark then remove from /me/bookmarks",
    role: "user",
    async run({ page, origin, db, userId }) {
      await goto(page, `${origin}/president/franklin_d_roosevelt`);
      await page.getByRole("button", { name: "Bookmark", exact: true }).click();
      await page.getByRole("button", { name: "Bookmarked", exact: true }).waitFor();
      assert.equal(sql(db, `select count(*) from bookmarks where user_id='${userId}'`), "1");
      await goto(page, `${origin}/me/bookmarks`);
      const listed = await page.getByRole("link", { name: "Franklin D. Roosevelt" }).count();
      await page.getByRole("button", { name: "Remove bookmark" }).first().click();
      await page.getByText(/No bookmarks yet/).waitFor();
      assert.equal(sql(db, `select count(*) from bookmarks where user_id='${userId}'`), "0");
      return { listed };
    },
  },
  {
    name: "submit score, see it in contributions, delete it",
    role: "user",
    async run({ page, origin, db, userId }) {
      await goto(page, `${origin}/sub-criterion/1.1`);
      await page.getByText("Add your score →").first().click();
      // The one score form that is now open.
      const row = page
        .locator("details[open]")
        .filter({ has: page.getByRole("button", { name: "Submit score" }) })
        .last();
      const sliders = row.locator("input[type=range]");
      await sliders.nth(0).focus();
      await page.keyboard.press("Home");
      for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
      await sliders.nth(1).focus();
      await page.keyboard.press("Home");
      for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
      await row.getByLabel(/Your reasoning/).fill("Regression harness test submission reasoning.");
      await row.getByLabel("Source URL").fill("https://example.org/regression-source");
      await row.getByLabel(/^Claim/).fill("Regression harness test claim from the source.");
      await row.getByRole("radio", { name: "Good", exact: true }).check();
      await row.getByRole("button", { name: "Submit score" }).click();
      // After the refresh the button reads "Save changes", so `row` (keyed on
      // "Submit score") no longer matches; wait at page level.
      await page.getByText("Score submitted. Thanks for contributing.").waitFor();
      const stored = sql(db, `select good_score||'/'||harm_score from user_scores where user_id='${userId}'`);
      assert.equal(stored, "7/2");

      await goto(page, `${origin}/me/contributions`);
      await page.getByText("Regression harness test submission reasoning.").waitFor();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      await page.getByText(/You haven't submitted any scores yet/).waitFor();
      assert.equal(sql(db, `select count(*) from user_scores where user_id='${userId}'`), "0");
      return { stored };
    },
  },
  {
    name: "save and clear personal weights",
    role: "user",
    async run({ page, origin, db, userId }) {
      await goto(page, `${origin}/me/weights`);
      const slider = page.locator("li").filter({ hasText: "Economic outcomes" }).locator("input[type=range]");
      await slider.focus();
      await page.keyboard.press("End");
      await page.getByRole("button", { name: "Save weights" }).click();
      await page.getByText("Saved · Yours lens unlocked on the home page.").waitFor();
      const rows = sql(db, `select count(*) from user_weights where user_id='${userId}'`);
      assert.equal(rows, "13");
      await goto(page, `${origin}/`);
      const yoursChip = await page.getByRole("button", { name: "Yours", exact: true }).count();
      assert.equal(yoursChip, 1, "Yours lens appears");
      await goto(page, `${origin}/me/weights`);
      await page.getByRole("button", { name: "Clear saved weights" }).click();
      await page.getByText("Cleared · home page returns to default lens.").waitFor();
      assert.equal(sql(db, `select count(*) from user_weights where user_id='${userId}'`), "0");
      return { rows, yoursChip };
    },
  },
  {
    name: "sign out via user menu",
    role: "user",
    async run({ page, origin }) {
      await goto(page, `${origin}/`);
      await page.locator('button[aria-haspopup="menu"]').click();
      await page.getByRole("menu").getByRole("button", { name: "Sign out" }).click();
      await page.getByRole("link", { name: "Sign in", exact: true }).waitFor();
      await goto(page, `${origin}/me/account`);
      return { redirectedTo: new URL(page.url()).pathname };
    },
  },
  {
    name: "admin unlock (wrong, then right token) and lock",
    role: "admin-locked",
    async run({ page, origin }) {
      await goto(page, `${origin}/admin/unlock`);
      await page.getByLabel("Admin token").fill("not-the-token");
      await page.getByRole("button", { name: "Unlock" }).click();
      await page.getByText("Token did not match.").waitFor();
      await page.getByLabel("Admin token").fill(ADMIN_TOKEN);
      await page.getByRole("button", { name: "Unlock" }).click();
      await page.getByRole("heading", { name: "Site operations" }).waitFor();
      await page.getByRole("button", { name: "Lock", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Lock", exact: true }).click();
      await page.waitForURL(/\/admin\/unlock$/);
      return { endedOn: new URL(page.url()).pathname };
    },
  },
  {
    name: "admin grant/revoke role and soft-delete/restore",
    role: "admin",
    async run({ page, origin, db }) {
      await goto(page, `${origin}/admin/users`);
      const flag = (email, col) => sql(db, `select ${col} from user_profiles where email='${email}'`);
      const alex = () => page.getByRole("row").filter({ hasText: "alex@example.com" });
      await alex().getByRole("button", { name: "user", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Grant", exact: true }).click();
      await alex().getByRole("button", { name: "admin", exact: true }).waitFor();
      const granted = flag("alex@example.com", "is_admin");
      await alex().getByRole("button", { name: "admin", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Revoke", exact: true }).click();
      await alex().getByRole("button", { name: "user", exact: true }).waitFor();
      const revoked = flag("alex@example.com", "is_admin");

      const sam = () => page.getByRole("row").filter({ hasText: "newbie@example.com" });
      await sam().getByRole("button", { name: "Soft-delete", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Soft-delete", exact: true }).click();
      await sam().getByRole("button", { name: "Restore", exact: true }).waitFor();
      const deleted = flag("newbie@example.com", "deleted_at is not null");
      await sam().getByRole("button", { name: "Restore", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Restore", exact: true }).click();
      await sam().getByRole("button", { name: "Soft-delete", exact: true }).waitFor();
      const restored = flag("newbie@example.com", "deleted_at is not null");
      assert.deepEqual([granted, revoked, deleted, restored], ["t", "f", "t", "f"]);
      return { granted, revoked, deleted, restored };
    },
  },
  {
    name: "delete own account (throwaway user)",
    role: "throwaway",
    async run({ page, origin, db }) {
      await goto(page, `${origin}/me/account`);
      await page.getByPlaceholder(THROWAWAY.email).fill(THROWAWAY.email);
      await page.getByRole("button", { name: "Delete my account" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
      await page.getByRole("link", { name: "Sign in", exact: true }).waitFor();
      const remaining = sql(db, `select count(*) from user_profiles where email='${THROWAWAY.email}'`);
      assert.equal(remaining, "0");
      return { remaining };
    },
  },
];

function insertThrowaway(db) {
  sql(
    db,
    `insert into user_profiles (id, auth_id, display_name, email, email_verified, email_verified_at, account_created_at, reputation_score, is_admin, updated_at)
     values (gen_random_uuid()::text, 'regress:throwaway', '${THROWAWAY.name}', '${THROWAWAY.email}', true, now(), now() - interval '10 days', 1.0, false, now())
     on conflict (email) do nothing`
  );
}

export async function runFlows(browser, side, outDir) {
  mkdirSync(join(outDir, "flows"), { recursive: true });
  const origin = side.server.origin;
  const db = side.db;
  const userId = sql(db, `select id from user_profiles where email='${ROLE_USERS.user.email}'`);
  insertThrowaway(db);
  const results = [];
  for (const flow of FLOWS) {
    const ctx = await newContext(browser);
    ctx.setDefaultTimeout(15000);
    const cookies = [];
    if (flow.role === "user") cookies.push(await sessionCookie(origin, ROLE_USERS.user));
    if (flow.role === "admin" || flow.role === "admin-locked") cookies.push(await sessionCookie(origin, ROLE_USERS.admin));
    if (flow.role === "admin") cookies.push(adminUnlockCookie(origin));
    if (flow.role === "throwaway") cookies.push(await sessionCookie(origin, THROWAWAY));
    if (cookies.length) await ctx.addCookies(cookies);
    const page = await ctx.newPage();
    try {
      const observed = await flow.run({ page, origin, db, userId });
      results.push({ name: flow.name, ok: true, observed });
    } catch (e) {
      const shot = join(outDir, "flows", `${flow.name.replace(/[^a-z0-9]+/gi, "-")}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      results.push({
        name: flow.name,
        ok: false,
        error: String(e.message ?? e).split("\n")[0],
        screenshot: shot,
      });
    } finally {
      await ctx.close();
    }
  }
  return results;
}

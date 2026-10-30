// Browser checks for the @moosematrix/tokens header, theme toggle and search overlay on moosematrix (P1 redesign).
// Replaces the Oct 22 shared .mmx-header e2e for this repo; the other sites keep theirs until they adopt the tokens.
// No new repo dependency: loads puppeteer-core from MMX_AUDIT_TOOLS (default /workspace/tools/audit), system Chrome.
// Usage: node tests/e2e/header.e2e.mjs <base-url>   or   MMX_BASE_URL=<base-url> npm run test:e2e
import { createRequire } from "node:module";
import { test, after } from "node:test";
import assert from "node:assert/strict";

const tools = process.env.MMX_AUDIT_TOOLS || "/workspace/tools/audit";
const puppeteer = createRequire(tools + "/package.json")("puppeteer-core");
const base = (process.env.MMX_BASE_URL || process.argv.slice(2).find((a) => /^https?:/.test(a)) || "").replace(/\/$/, "");
if (!base) throw new Error("usage: header.e2e.mjs <base-url>");
const NAV = ["Projects", "Library", "Lab", "Shop", "About"];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
after(() => browser.close());

async function open(width, path = "/") {
  const p = await browser.newPage();
  await p.setViewport({ width, height: 800, isMobile: width < 600, hasTouch: width < 600 });
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base + path, { waitUntil: "load" });
  return { p, errors };
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("desktop: the five nav links in order, no overflow, no console or CSP errors", async () => {
  for (const w of [1280, 768]) {
    const { p, errors } = await open(w);
    assert.deepEqual(await p.$$eval(".mm-nav > a", (as) => as.map((a) => a.textContent.trim())), NAV);
    assert.equal(await overflow(p), 0, `overflow at ${w}`);
    assert.deepEqual(errors, []);
    await p.close();
  }
});

test("360: menu opens, lists the nav, no overflow", async () => {
  const { p, errors } = await open(360);
  assert.equal(await overflow(p), 0);
  await p.click("details.mm-menu > summary");
  assert.equal(await p.$eval("details.mm-menu", (d) => d.open), true);
  const items = await p.$$eval("details.mm-menu a", (as) => as.map((a) => a.textContent.trim()));
  for (const n of NAV) assert.ok(items.includes(n), n);
  assert.deepEqual(errors, []);
  await p.close();
});

test("theme toggle (desktop bar) persists across a reload", async () => {
  const { p } = await open(1280);
  await p.click('[data-mm-theme] [data-theme-set="dark"]');
  await p.reload({ waitUntil: "load" });
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "dark");
  await p.click('[data-mm-theme] [data-theme-set="light"]');
  await p.reload({ waitUntil: "load" });
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), "light");
  await p.close();
});

test("search overlay: Ctrl+K opens it, the same-origin index returns results, Escape closes it", async () => {
  const { p, errors } = await open(1280);
  await p.keyboard.down("Control"); await p.keyboard.press("k"); await p.keyboard.up("Control");
  await p.waitForFunction(() => document.getElementById("mm-search")?.open);
  await p.keyboard.type("money");
  await p.waitForFunction(() => document.querySelectorAll("#mm-search [data-mm-results] li").length > 0, { timeout: 5000 });
  await p.keyboard.press("Escape");
  assert.equal(await p.$eval("#mm-search", (d) => d.open), false);
  assert.deepEqual(errors, []);
  await p.close();
});

test("/search filters by ?q and ?type with JS on", async () => {
  const { p } = await open(1280, "/search?q=money&type=Project");
  const shown = await p.$$eval(".mm-lib-list li", (li) => li.filter((l) => !l.hidden).length);
  assert.equal(shown, 1);
  assert.match(await p.$eval("[data-mm-count]", (e) => e.textContent), /^1 of \d+ shown$/);
  await p.close();
});

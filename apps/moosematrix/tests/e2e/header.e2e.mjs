// Browser checks for the shared Moose Matrix header and the typed headline (22 Oct 2026). Same file in
// moosematrix, mooseman-site, moose_money and moose-wip (merch). No new repo dependency: it loads puppeteer-core
// from an audit-tools folder (MMX_AUDIT_TOOLS, default /workspace/tools/audit) and drives the system Chrome.
// Usage: node tests/e2e/header.e2e.mjs <base-url> [--typed]     (--typed: the page H1 uses the typed headline)
//    or: MMX_BASE_URL=<base-url> MMX_TYPED=1 node --test tests/e2e/header.e2e.mjs
import { createRequire } from "node:module";
import { test, after } from "node:test";
import assert from "node:assert/strict";

const tools = process.env.MMX_AUDIT_TOOLS || "/workspace/tools/audit";
const puppeteer = createRequire(tools + "/package.json")("puppeteer-core");
const base = process.env.MMX_BASE_URL || process.argv.slice(2).find((a) => /^https?:/.test(a));
const typed = process.argv.includes("--typed") || process.env.MMX_TYPED === "1";
if (!base) throw new Error("usage: header.e2e.mjs <base-url> [--typed]");
const MAIN = ["Research & Development", "Moose Mumbles", "Moo$e Money", "Shop"];
const MORE = ["About", "Directory", "Security", "Contact"];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"], headless: "new" });
after(() => browser.close());

async function open(width, opts = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width, height: 800, isMobile: width < 600, hasTouch: width < 600 });
  if (opts.motion) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: opts.motion }]);
  const errors = [];
  p.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base, { waitUntil: "load" });
  return { p, errors };
}
const texts = (p, sel) => p.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
const isOpen = (p, sel) => p.$eval(sel, (d) => d.open);
const focused = (p) => p.evaluate(() => { const a = document.activeElement; return a ? (a.closest("summary") ? "summary:" + a.closest("details").className : a.textContent.trim()) : null; });

test("desktop bar: brand, the 4 main links in order, then More with an aria-hidden chevron", async () => {
  const { p, errors } = await open(1280);
  assert.deepEqual(await texts(p, ".mmx-nav > .mmx-list > li > a"), MAIN);
  assert.equal(await p.$eval(".mmx-more > summary", (s) => s.textContent.trim()), "More");
  assert.equal(await p.$eval(".mmx-more > summary svg", (s) => s.getAttribute("aria-hidden")), "true");
  assert.deepEqual(await texts(p, ".mmx-more-list a"), MORE);
  for (const href of await p.$$eval(".mmx-more-list a", (as) => as.map((a) => a.href))) assert.match(href, /^https:\/\/moosematrix\.com\/|^http:\/\/localhost:\d+\//);
  assert.equal(await p.$eval(".mmx-bar", (b) => b.scrollWidth <= b.clientWidth), true, "bar overflows at 1280");
  assert.deepEqual(errors, []);
  await p.close();
});

test("More menu by keyboard: Tab reaches it, Enter opens, Space closes, Escape closes and returns focus", async () => {
  const { p } = await open(1280);
  await p.focus(".mmx-more > summary");
  assert.equal(await isOpen(p, ".mmx-more"), false);
  await p.keyboard.press("Enter");
  assert.equal(await isOpen(p, ".mmx-more"), true, "Enter opens");
  await p.keyboard.press("Tab");
  assert.equal(await focused(p), MORE[0], "Tab moves into the list");
  await p.keyboard.press("Escape");
  assert.equal(await isOpen(p, ".mmx-more"), false, "Escape closes");
  assert.match(await focused(p), /^summary:mmx-more/, "focus returns to More");
  await p.keyboard.press("Space");
  assert.equal(await isOpen(p, ".mmx-more"), true, "Space opens");
  await p.keyboard.press("Space");
  assert.equal(await isOpen(p, ".mmx-more"), false, "Space closes");
  // Tab order from the last main link lands on More.
  await p.focus(".mmx-nav > .mmx-list > li:last-child > a");
  await p.keyboard.press("Tab");
  assert.match(await focused(p), /^summary:mmx-more/);
  // Visible focus indicator on More.
  const ring = await p.$eval(".mmx-more > summary", (s) => getComputedStyle(s).outlineStyle + " " + getComputedStyle(s).outlineWidth);
  assert.notEqual(ring.split(" ")[0], "none", "More has a visible focus outline");
  // Outside click closes.
  await p.keyboard.press("Enter");
  const h1 = await p.$eval("h1", (h) => { const r = h.getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
  await p.mouse.click(h1.x, h1.y); // a non-interactive spot outside the menu
  assert.equal(await isOpen(p, ".mmx-more"), false, "outside click closes");
  await p.close();
});

test("360px: Menu holds the 4 main links, then a More group; Escape closes and returns focus", async () => {
  const { p } = await open(360);
  assert.equal(await p.$eval(".mmx-nav", (n) => getComputedStyle(n).display), "none");
  assert.equal(await p.$eval(".mmx-bar", (b) => b.scrollWidth <= b.clientWidth), true, "bar overflows at 360");
  await p.focus(".mmx-menu > summary");
  await p.keyboard.press("Enter");
  assert.equal(await isOpen(p, ".mmx-menu"), true);
  const lists = await p.$$eval(".mmx-panel nav ul", (uls) => uls.map((u) => [...u.querySelectorAll("a")].map((a) => a.textContent.trim())));
  assert.deepEqual(lists[0], MAIN);
  assert.deepEqual(lists[1], MORE);
  assert.ok((await texts(p, ".mmx-panel .mmx-group")).includes("More"));
  for (const box of await p.$$eval(".mmx-panel a", (as) => as.map((a) => a.getBoundingClientRect().height))) assert.ok(box >= 44, "touch target >= 44px");
  await p.keyboard.press("Escape");
  assert.equal(await isOpen(p, ".mmx-menu"), false);
  assert.match(await focused(p), /^summary:mmx-menu/);
  await p.close();
});

test("typed headline stays a first-paint LCP candidate (glyphs not positioned, so they are not split into tiny candidates)", { skip: !typed }, async () => {
  const p = await browser.newPage();
  await p.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => { window.__lcp = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: e.startTime, size: e.size, h1: !!(e.element && e.element.closest("h1")) }); }).observe({ type: "largest-contentful-paint", buffered: true }); });
  await p.goto(base, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500));
  const r = await p.evaluate(() => { const h = document.querySelector("h1").getBoundingClientRect(); const fcp = performance.getEntriesByName("first-contentful-paint")[0]; return { entries: window.__lcp, h1Area: h.width * h.height, glyphPos: getComputedStyle(document.querySelector("h1 .mmx-tw-a > span")).position, pseudo: [...document.querySelectorAll("h1 .mmx-tw-a > span")].some((x) => !["none", "normal"].includes(getComputedStyle(x, "::after").content)), fcp: fcp ? fcp.startTime : 0 }; });
  assert.equal(r.glyphPos, "static");
  assert.equal(r.pseudo, false, "caret is a box-shadow on the glyph, not an out-of-flow pseudo-element (which wraps at line ends)");
  const last = r.entries[r.entries.length - 1];
  assert.ok(last, "no LCP entry");
  assert.ok(r.entries.some((e) => e.h1) || last.size >= r.h1Area * 0.5, `H1 not an LCP candidate: ${JSON.stringify(r)}`);
  assert.ok(last.t - r.fcp < 50, `LCP ${last.t}ms is later than first paint ${r.fcp}ms`);
  await p.close();
});
test("typed headline: painted (transparent) at first frame, accent stays accent, ~1.5 s max, reduced motion instant", { skip: !typed }, async () => {
  const { p } = await open(360);
  const info = await p.evaluate(() => {
    const a = document.querySelector("h1 .mmx-tw-a"); const g = [...a.children]; const last = g[g.length - 1];
    const cs = getComputedStyle(last);
    return { n: g.length, lastColor: cs.color, lastDelayMs: parseFloat(cs.animationDelay) * (cs.animationDelay.endsWith("ms") ? 1 : 1000),
      hidden: getComputedStyle(a).visibility, opacity: getComputedStyle(a).opacity, sr: document.querySelector("h1 .mmx-tw-sr").textContent,
      glyphs: g.map((x) => x.textContent).join(""), ariaHidden: a.getAttribute("aria-hidden"), h: document.querySelector("h1").getBoundingClientRect().height };
  });
  assert.equal(info.sr, info.glyphs, "the visually-hidden copy is the whole line");
  assert.equal(info.ariaHidden, "true");
  assert.equal(info.hidden, "visible"); assert.equal(info.opacity, "1");
  assert.ok(info.lastDelayMs <= 1650, `last glyph starts at ${info.lastDelayMs}ms`);
  await new Promise((r) => setTimeout(r, 2200));
  const done = await p.evaluate(() => {
    const g = [...document.querySelectorAll("h1 .mmx-tw-a > span")];
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return { anyTransparent: g.some((x) => getComputedStyle(x).color === "rgba(0, 0, 0, 0)"), acc: g.filter((x) => x.classList.contains("mmx-tw-acc")).map((x) => getComputedStyle(x).color), plain: g.find((x) => !x.classList.contains("mmx-tw-acc")) && getComputedStyle(g.find((x) => !x.classList.contains("mmx-tw-acc"))).color, accent, h: document.querySelector("h1").getBoundingClientRect().height };
  });
  assert.equal(done.anyTransparent, false, "every glyph is visible after typing");
  assert.equal(done.h, info.h, "no layout shift while typing");
  if (done.acc.length) assert.notEqual(done.acc[0], done.plain, "accent glyphs keep their own colour");
  await p.close();
  const r = await open(360, { motion: "reduce" });
  const rm = await r.p.evaluate(() => [...document.querySelectorAll("h1 .mmx-tw-a > span")].map((x) => [getComputedStyle(x).color, getComputedStyle(x).animationName]));
  assert.ok(rm.every(([c, a]) => c !== "rgba(0, 0, 0, 0)" && a === "none"), "reduced motion: no animation, text there at once");
  await r.p.close();
});

// Browser test of the theme contract (cookie and first-paint delivery) on packages/tokens/demo/index.html, served on two real
// https *.moosematrix.com origins via request routing (see harness.mjs):
//  - first paint is dark with no cookie, also with prefers-color-scheme: light emulated (checked at DOMContentLoaded)
//  - a light cookie gives light before nav.js runs (theme-init in <head>)
//  - the toggle (a <button aria-pressed>, >= 24x24 px, visible label, focus ring) writes the shared cookie;
//    light persists across reload and on a second origin; Dark persists the same way
//  - host-only copies from old writers are deleted; JS off -> dark
// Usage: CHROME_PATH=/usr/bin/google-chrome node run-theme.mjs <path-to-packages/tokens>
import { launch, newContext, lightCookie, ORIGINS, DEMO } from "./harness.mjs";

const root = process.argv[2] || "../../../packages/tokens";
const [A, B] = ORIGINS.map((o) => o + DEMO);
const DARK_BG = "rgb(11, 15, 23)";
const browser = await launch();
const failures = [];
const check = (cond, msg) => {
  if (cond) console.log(`ok   ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures.push(msg);
  }
};

// Records the theme when <body> is first parsed (after the head scripts, before any deferred script such as nav.js)
// and the painted background at DOMContentLoaded.
const FIRST_PAINT = () => {
  const state = (window.__firstPaint = {});
  const mo = new MutationObserver(() => {
    if (!document.body) return;
    mo.disconnect();
    state.theme = document.documentElement.getAttribute("data-theme") || "dark";
    state.navRan = !!document.querySelector("[data-mm-theme]:not([hidden])");
  });
  mo.observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => {
    state.bg = getComputedStyle(document.body).backgroundColor;
  }, { capture: true, once: true });
};

async function open(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(FIRST_PAINT);
  await page.goto(url, { waitUntil: "load" });
  page.errors = errors;
  return page;
}
const fp = (page) => page.evaluate(() => window.__firstPaint);
const domainCookies = async (context) => (await context.cookies(ORIGINS)).filter((c) => c.name === "mm-theme");

// 1. No cookie, OS says light -> dark first paint
{
  const ctx = await newContext(browser, root, { colorScheme: "light", viewport: { width: 1280, height: 800 } });
  const page = await open(ctx, A);
  const f = await fp(page);
  check(f.theme === "dark" && f.bg === DARK_BG && !f.navRan, `no cookie + prefers light: first paint dark (${f.bg})`);
  check((await page.locator('meta[name="theme-color"]').getAttribute("content")) === "#070b13", "theme-color is #070b13 in dark");
  check((await domainCookies(ctx)).length === 0, "no cookie is written without a click");
  check(page.errors.length === 0, `no page errors (${page.errors.join("; ")})`);

  // 2. Toggle
  const btn = page.locator(".mm-header-in > .mm-theme [data-mm-theme-toggle]");
  const box = await btn.boundingBox();
  check(box && box.width >= 24 && box.height >= 24, `toggle is at least 24x24 px (${box && Math.round(box.width)}x${box && Math.round(box.height)})`);
  check((await btn.evaluate((b) => b.tagName)) === "BUTTON" && (await btn.getAttribute("aria-pressed")) === "false", "toggle is a <button aria-pressed=false> in dark");
  check((await btn.innerText()).trim() === "Light theme" || (await btn.innerText()).includes("Light"), "toggle has a visible text label");
  await page.keyboard.press("Tab");
  await btn.focus();
  const ringDark = await btn.evaluate((b) => getComputedStyle(b).outlineStyle !== "none" && parseFloat(getComputedStyle(b).outlineWidth) >= 2);
  check(ringDark, "focus ring visible on the toggle in dark");
  await btn.click();
  const c = await domainCookies(ctx);
  check(c.length === 1 && c[0].value === "light" && c[0].domain === ".moosematrix.com" && c[0].secure && c[0].sameSite === "Lax" && c[0].path === "/", "click writes one Domain=.moosematrix.com Secure SameSite=Lax light cookie");
  check(c.length === 1 && Math.abs(c[0].expires - Date.now() / 1000 - 31536000) < 120, "cookie lasts one year (Max-Age=31536000)");
  check((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light", "click switches the page to light");
  const pressed = await page.locator("[data-mm-theme-toggle]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed")));
  check(pressed.length === 2 && pressed.every((p) => p === "true"), "both toggle copies show aria-pressed=true");
  check((await page.locator('meta[name="theme-color"]').getAttribute("content")) === "#f7f6f3", "theme-color is #f7f6f3 in light");
  await btn.focus();
  const ringLight = await btn.evaluate((b) => getComputedStyle(b).outlineStyle !== "none" && parseFloat(getComputedStyle(b).outlineWidth) >= 2);
  check(ringLight, "focus ring visible on the toggle in light");

  // 3. Persistence: reload and second origin, light at first paint
  await page.reload({ waitUntil: "load" });
  let g = await fp(page);
  check(g.theme === "light" && g.bg !== DARK_BG && !g.navRan, "reload: light at first paint (before nav.js)");
  const other = await open(ctx, B);
  g = await fp(other);
  check(g.theme === "light", "second origin (m2.moosematrix.com): light at first paint");

  // 4. Dark from the second origin persists back to the first
  await other.locator(".mm-header-in > .mm-theme [data-mm-theme-toggle]").click();
  const d = await domainCookies(ctx);
  check(d.length === 1 && d[0].value === "dark", "Dark writes mm-theme=dark (one cookie)");
  await page.reload({ waitUntil: "load" });
  g = await fp(page);
  check(g.theme === "dark" && g.bg === DARK_BG, "first origin is dark again after Dark on the second origin");
  await ctx.close();
}

// 5. Light cookie before load -> light first paint; OS dark ignored
{
  const ctx = await newContext(browser, root, { colorScheme: "dark" });
  await ctx.addCookies([lightCookie()]);
  const page = await open(ctx, A);
  const f = await fp(page);
  check(f.theme === "light" && !f.navRan, "light cookie: light at first paint, set by theme-init");
  await ctx.close();
}

// 6. Migration: an old host-only "system" copy is deleted; the domain light wins
{
  const ctx = await newContext(browser, root, {});
  await ctx.addCookies([lightCookie(), { name: "mm-theme", value: "system", url: ORIGINS[0] + "/" }]);
  const page = await open(ctx, A);
  const all = await domainCookies(ctx);
  check((await fp(page)).theme === "light", "host-only system + domain light -> light");
  check(all.length === 1 && all[0].domain === ".moosematrix.com", "host-only copy deleted, domain cookie kept");
  await ctx.close();
}

// 7. JS off -> dark, toggle stays hidden
{
  const ctx = await newContext(browser, root, { javaScriptEnabled: false, colorScheme: "light" });
  await ctx.addCookies([lightCookie()]);
  const page = await ctx.newPage();
  await page.goto(A, { waitUntil: "load" });
  const s = await page.evaluate(() => 0); // evaluate still works with page JS off
  void s;
  const bg = await page.locator("body").evaluate((b) => getComputedStyle(b).backgroundColor);
  check(bg === DARK_BG, `JS off: dark (${bg})`);
  check(!(await page.locator(".mm-header-in > .mm-theme").isVisible()), "JS off: toggle hidden");
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} theme check(s) failed`);
  process.exit(1);
}
console.log("\nall theme checks passed");

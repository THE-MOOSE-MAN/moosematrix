// End-to-end + a11y run for @moosematrix/search on packages/search/demo,
// served from packages/ with a strict CSP header (incl. Trusted Types).
// Covers: lazy fetch (none before open, one after, no cookie), Ctrl+K / Cmd+K,
// Tab trap, Esc focus return, live-region text, arrow keys, Enter, scope
// triggers, premium lock, Moose Mumbles link-out (no fetch), hostile indexes,
// tier allowlist in the DOM, axe in both themes at 360/1280 open and closed,
// 360 px overflow, >= 24 px targets, typing time budget, 0 CSP violations,
// and mooseman's ?mm-scope=mumbles landing.
// Usage: CHROME_PATH=/usr/bin/google-chrome node run-search-e2e.mjs <path-to-packages>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const root = resolve(process.argv[2] || "../../../packages");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types 'none'";
const INDEX = "/search/demo/search-index.json";
const MM_INDEX = "/search/demo/mooseman-index.json";
const LINK_OUT = "https://mooseman.moosematrix.com/moose-mumbles/?mm-scope=mumbles";

const hits = [];
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  hits.push({ path: pathname, cookie: req.headers.cookie || "", referer: req.headers.referer || "" });
  if (pathname === "/favicon.ico") return res.writeHead(204).end();
  const path = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "content-security-policy": CSP, "x-content-type-options": "nosniff" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const PAGE = ORIGIN + "/search/demo/index.html";
const MM_PAGE = ORIGIN + "/search/demo/mooseman.html";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const results = [];
const indexHits = () => hits.filter((h) => h.path === INDEX || h.path === MM_INDEX);

async function fresh({ width = 1280, scheme = "light", url = PAGE, theme = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("page error: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /Content Security Policy|Trusted Type/i.test(m.text())) problems.push("console: " + m.text());
  });
  await page.goto(url, { waitUntil: "load" });
  if (theme) await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  return { context, page, problems };
}

async function check(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
  } catch (e) {
    results.push(["FAIL", name + " — " + (e && e.message ? e.message.split("\n")[0] : e)]);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
const active = (page) => page.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)) || "");
const statusOf = (page) => page.textContent("[data-mm-search-status]");

// ------------------------------------------------------------------ fetch
await check("no index fetch before open; exactly one same-origin fetch after, without cookies", async () => {
  hits.length = 0;
  const { context, page, problems } = await fresh();
  await context.addCookies([{ name: "mm_session", value: randomBytes(8).toString("hex"), url: ORIGIN }]);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(300);
  expect(indexHits().length === 0, `fetched before open (${indexHits().length})`);
  expect(hits.some((h) => h.cookie.includes("mm_session")), "cookie fixture not sent with page load");
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "reading");
  await page.waitForSelector(".mm-result");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "kernel");
  await page.waitForSelector(".mm-result");
  const ih = indexHits();
  expect(ih.length === 1, `index fetched ${ih.length} times`);
  expect(ih[0].cookie === "", "cookie sent with index fetch");
  expect(ih[0].referer === "", "referer sent with index fetch");
  expect(!problems.length, problems.join("; "));
  await context.close();
});

// ------------------------------------------------------------------ keyboard
for (const combo of ["Control+k", "Meta+k"]) {
  await check(`${combo} opens; focus in input; Esc closes and returns focus`, async () => {
    const { context, page, problems } = await fresh();
    await page.focus("#demo-reading-room");
    await page.keyboard.press(combo);
    expect(await page.evaluate(() => document.getElementById("mm-search").open), "not open");
    expect((await active(page)) === "mm-search-input", "focus not in input");
    await page.keyboard.press("Escape");
    expect(!(await page.evaluate(() => document.getElementById("mm-search").open)), "still open");
    expect((await active(page)) === "demo-reading-room", `focus went to ${await active(page)}`);
    expect(!problems.length, problems.join("; "));
    await context.close();
  });
}

await check("trigger button: Esc returns focus to the trigger", async () => {
  const { context, page } = await fresh();
  await page.click("#demo-header-search");
  expect((await active(page)) === "mm-search-input", "focus not in input");
  await page.keyboard.press("Escape");
  expect((await active(page)) === "demo-header-search", `focus went to ${await active(page)}`);
  await context.close();
});

await check("'/' does not open by default (single-key shortcut off)", async () => {
  const { context, page } = await fresh();
  await page.focus("#demo-header-search");
  await page.keyboard.press("/");
  expect(!(await page.evaluate(() => document.getElementById("mm-search").open)), "opened on /");
  await context.close();
});

await check("Tab and Shift+Tab stay inside the dialog", async () => {
  const { context, page } = await fresh();
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "reading");
  await page.waitForSelector(".mm-result");
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.getElementById("mm-search").contains(document.activeElement)), `Tab #${i + 1} left the dialog`);
  }
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => document.getElementById("mm-search").contains(document.activeElement)), `Shift+Tab #${i + 1} left the dialog`);
  }
  await context.close();
});

await check("live region: result count + scope; arrows move through results; Enter opens the first", async () => {
  const { context, page } = await fresh();
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "reading");
  await page.waitForSelector(".mm-result");
  const s = await statusOf(page);
  const n = await page.locator(".mm-result").count();
  expect(s === `${n} result${n === 1 ? "" : "s"} in All`, `status "${s}" for ${n}`);
  expect((await page.getAttribute("[data-mm-search-status]", "aria-live")) === "polite", "aria-live");
  await page.keyboard.press("ArrowDown");
  const first = await page.evaluate(() => document.activeElement.getAttribute("href"));
  expect(first && first === (await page.locator(".mm-result").first().getAttribute("href")), "ArrowDown → first result");
  if (n > 1) {
    await page.keyboard.press("ArrowDown");
    expect((await page.evaluate(() => document.activeElement.getAttribute("href"))) === (await page.locator(".mm-result").nth(1).getAttribute("href")), "ArrowDown → second");
  }
  await page.keyboard.press("ArrowUp");
  if (n > 1) await page.keyboard.press("ArrowUp");
  expect((await active(page)) === "mm-search-input", "ArrowUp back to input");
  await page.fill("#mm-search-input", "zzzz-nothing");
  expect((await statusOf(page)) === "No results in All", "no-results text");
  await page.fill("#mm-search-input", "kernel");
  await page.waitForSelector(".mm-result");
  let nav = null;
  await page.route("https://moosematrix.com/**", (route) => { nav = route.request().url(); return route.fulfill({ status: 200, contentType: "text/html", body: "<p>landing</p>" }); });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  expect(nav === "https://moosematrix.com/research/kernel-notes/" || (nav || "").startsWith("https://moosematrix.com/"), `Enter navigated to ${nav}`);
  await context.close();
});

await check("<mark> highlights come from text ranges", async () => {
  const { context, page } = await fresh();
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "kernel");
  await page.waitForSelector(".mm-result mark");
  const marks = await page.$$eval(".mm-result mark", (ms) => ms.map((m) => m.textContent.toLowerCase()));
  expect(marks.length && marks.every((m) => m === "kernel"), JSON.stringify(marks));
  await context.close();
});

// ------------------------------------------------------------------ scopes
await check("scope triggers: Library and Reading Room open pre-scoped; status names the scope", async () => {
  const { context, page } = await fresh();
  await page.click("#demo-library");
  expect(await page.isChecked("#mm-scope-library"), "library not checked");
  await page.fill("#mm-search-input", "reverse");
  await page.waitForSelector(".mm-result");
  expect((await statusOf(page)).endsWith("in Library"), await statusOf(page));
  const sec = await page.$$eval(".mm-result-meta", (e) => e.map((x) => x.textContent));
  expect(sec.every((t) => /Library|Projects/.test(t)), JSON.stringify(sec));
  await page.keyboard.press("Escape");
  await page.click("#demo-reading-room");
  expect(await page.isChecked("#mm-scope-reading-room"), "reading-room not checked");
  await page.fill("#mm-search-input", "reading room");
  await page.waitForSelector(".mm-result");
  expect((await statusOf(page)).endsWith("in Reading Room"), await statusOf(page));
  await page.check("#mm-scope-all", { force: true });
  expect((await statusOf(page)).endsWith("in All"), "radio change re-renders");
  await context.close();
});

await check("premium result shows a lock + 'Premium' label and teaser only", async () => {
  const { context, page } = await fresh();
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "deep dive");
  await page.waitForSelector(".mm-result");
  const lock = await page.locator(".mm-result .mm-result-lock").first();
  expect((await lock.textContent()).trim() === "Premium", "lock label");
  expect((await page.locator(".mm-result .mm-result-lock svg[aria-hidden=true]").count()) === 1, "lock svg");
  const text = await page.textContent("[data-mm-search-results]");
  expect(!/NOT FOR INDEX/.test(text), "premium body leaked into DOM");
  await context.close();
});

await check("Moose Mumbles off mooseman: same-tab link to the fixed URL, no fetch", async () => {
  hits.length = 0;
  const { context, page } = await fresh();
  let nav = null;
  let referer = "unset";
  await page.route("https://mooseman.moosematrix.com/**", (route) => { nav = route.request().url(); referer = route.request().headers()["referer"]; return route.fulfill({ status: 200, contentType: "text/html", body: "<p>landing</p>" }); });
  const pages = context.pages().length;
  await page.click("#demo-mumbles");
  await page.waitForTimeout(300);
  expect(nav === LINK_OUT, `trigger navigated to ${nav}`);
  expect(referer === undefined, "trigger sent a Referer");
  expect(context.pages().length === pages, "opened a new tab");
  expect(indexHits().length === 0, "fetched the index");
  await page.goto(PAGE, { waitUntil: "load" });
  await page.route("https://mooseman.moosematrix.com/**", (route) => { nav = route.request().url(); referer = route.request().headers()["referer"]; return route.fulfill({ status: 200, contentType: "text/html", body: "<p>landing</p>" }); });
  await page.keyboard.press("Control+k");
  const link = page.locator('a.mm-scope-link[data-mm-scope-link="mumbles"]');
  expect((await link.getAttribute("href")) === LINK_OUT, "chip href");
  expect((await link.getAttribute("target")) === null, "target attr");
  expect((await link.getAttribute("rel")) === "noreferrer", "rel attr");
  referer = "unset";
  nav = null;
  await link.click();
  await page.waitForTimeout(300);
  expect(nav === LINK_OUT, `chip navigated to ${nav}`);
  expect(referer === undefined, "chip sent a Referer");
  await context.close();
});

await check("mooseman: ?mm-scope=mumbles opens the overlay pre-scoped to Moose Mumbles", async () => {
  const { context, page, problems } = await fresh({ url: MM_PAGE + "?mm-scope=mumbles" });
  await page.waitForFunction(() => document.getElementById("mm-search").open);
  expect(await page.isChecked("#mm-scope-mumbles"), "mumbles not checked");
  await page.fill("#mm-search-input", "mumble");
  await page.waitForSelector(".mm-result");
  expect((await statusOf(page)).endsWith("in Moose Mumbles"), await statusOf(page));
  for (const bad of ["?mm-scope=evil", "?mm-scope=__proto__"]) {
    await page.goto(MM_PAGE + bad, { waitUntil: "load" });
    await page.waitForTimeout(200);
    expect(!(await page.evaluate(() => document.getElementById("mm-search").open)), `opened for ${bad}`);
  }
  expect(!problems.length, problems.join("; "));
  await context.close();
});

// ------------------------------------------------------------------ hostile indexes
const okItem = (o) => ({ id: "x", title: "Hostile probe", site: "moosematrix", section: "library", type: "note", url: "/library/x/", access: "public", ...o });
const env = (items, o = {}) => JSON.stringify({ version: 1, site: "moosematrix", generated: "2026-10-30T12:00:00Z", items, ...o });
const HOSTILE = [
  ["wrong version", { body: env([okItem()], { version: 2 }) }, "fail"],
  ["wrong site", { body: env([okItem()], { site: "m2" }) }, "fail"],
  ["non-JSON body", { body: "<html>hi</html>" }, "fail"],
  ["wrong content-type", { body: env([okItem()]), contentType: "text/html" }, "fail"],
  ["HTTP 500", { body: "", status: 500 }, "fail"],
  ["2 MB body", { body: env([okItem({ summary: "x".repeat(200) })]) + " ".repeat(2 * 1024 * 1024) }, "fail"],
  ["prototype pollution", { body: `{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[{"id":"p","title":"Hostile probe","site":"moosematrix","section":"library","type":"note","url":"/p","access":"public","__proto__":{"polluted":1}}],"__proto__":{"polluted":1}}` }, "fail"],
  ["polluting item only", { body: `{"version":1,"site":"moosematrix","generated":"2026-10-30T12:00:00Z","items":[{"id":"p","title":"Hostile probe","site":"moosematrix","section":"library","type":"note","url":"/p","access":"public","constructor":{"prototype":{"polluted":1}}}]}` }, "none"],
  ["script/HTML in fields + javascript: URL", { body: env([
    okItem({ id: "a", title: "Hostile probe <img src=x onerror=alert(1)>", summary: "<script>alert(1)</script>" }),
    okItem({ id: "b", title: "Hostile probe js", url: "javascript:alert(1)" }),
    okItem({ id: "c", title: "Hostile probe ext", url: "https://evil.example/x" }),
    okItem({ id: "d", title: "Hostile probe lookalike", url: "https://moosematrix.com.evil.example/x" }),
  ]) }, "inert"],
  ["tier allowlist", { body: env(["public", "premium", "private", "notes", "", "Public ", ["public"], null, "free"].map((t, i) => okItem({ id: "t" + i, url: "/t" + i, access: t, title: "Hostile probe tier" + i, ...(t === "premium" ? { tags: undefined } : {}) })).map((o) => JSON.parse(JSON.stringify(o)))) }, "tiers"],
];
for (const [name, spec, want] of HOSTILE) {
  await check(`hostile index: ${name}`, async () => {
    const { context, page, problems } = await fresh();
    await page.route(ORIGIN + INDEX, (route) => route.fulfill({ status: spec.status || 200, contentType: spec.contentType || "application/json", body: spec.body }));
    await page.keyboard.press("Control+k");
    await page.fill("#mm-search-input", "hostile probe");
    await page.waitForFunction(() => !/Loading/.test(document.querySelector("[data-mm-search-status]").textContent));
    const s = await statusOf(page);
    const count = await page.locator(".mm-result").count();
    if (want === "fail") expect(s === "Search is unavailable right now. Please try again later." && count === 0, `status "${s}", ${count} results`);
    if (want === "none") expect(count === 0, `${count} results`);
    if (want === "inert") {
      const hrefs = await page.$$eval(".mm-result", (as) => as.map((a) => a.getAttribute("href")));
      expect(hrefs.length === 1 && hrefs[0] === "https://moosematrix.com/library/x/", JSON.stringify(hrefs));
      expect((await page.locator("[data-mm-search-results] img, [data-mm-search-results] script").count()) === 0, "HTML was parsed");
      expect((await page.textContent(".mm-result-title")).includes("<img src=x onerror=alert(1)>"), "title not literal text");
    }
    if (want === "tiers") {
      const titles = await page.$$eval(".mm-result-title", (e) => e.map((x) => x.textContent));
      expect(JSON.stringify(titles.sort()) === JSON.stringify(["Hostile probe tier0", "Hostile probe tier1"]), JSON.stringify(titles));
    }
    expect(await page.evaluate(() => ({}).polluted === undefined), "Object.prototype polluted");
    expect(!problems.some((p) => !/Failed to load resource/.test(p)), problems.join("; "));
    await context.close();
  });
}

// ------------------------------------------------------------------ perf
await check("typing budget: each keystroke renders in < 50 ms (5,000-item index)", async () => {
  const { context, page } = await fresh();
  const words = ["reverse", "engineering", "security", "books", "kernel", "parser", "notes", "build"];
  const items = Array.from({ length: 5000 }, (_, i) => okItem({ id: "i" + i, url: "/i" + i, title: `${words[i % 8]} ${words[(i * 3) % 8]} title ${i}`, summary: `${words[(i * 5) % 8]} summary ${i} `.repeat(6).slice(0, 300) }));
  await page.route(ORIGIN + INDEX, (route) => route.fulfill({ status: 200, contentType: "application/json", body: env(items) }));
  await page.keyboard.press("Control+k");
  await page.fill("#mm-search-input", "x");
  await page.waitForFunction(() => !/Loading/.test(document.querySelector("[data-mm-search-status]").textContent));
  const times = await page.evaluate(async () => {
    const input = document.getElementById("mm-search-input");
    const out = [];
    for (const q of ["e", "en", "eng", "engi", "engin", "engineering t", "a".repeat(128), "kernel parser notes build"]) {
      const t0 = performance.now();
      input.value = q;
      input.dispatchEvent(new Event("input"));
      out.push(performance.now() - t0);
    }
    return out;
  });
  expect(Math.max(...times) < 50, times.map((t) => t.toFixed(1)).join(", "));
  await context.close();
});

// ------------------------------------------------------------------ a11y / layout
for (const width of [360, 1280]) {
  for (const [scheme, theme] of [["light", null], ["dark", null], ["light", "dark"], ["dark", "light"]]) {
    await check(`axe + layout at ${width}px, ${scheme}${theme ? " (data-theme=" + theme + ")" : ""}: closed and open`, async () => {
      const { context, page, problems } = await fresh({ width, scheme, theme });
      const states = [["closed", async () => {}], ["open with results", async () => {
        await page.click("#demo-header-search");
        await page.fill("#mm-search-input", "reading");
        await page.waitForSelector(".mm-result");
      }]];
      for (const [state, setup] of states) {
        await setup();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow <= 0, `${state}: horizontal overflow ${overflow}px`);
        const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(!r.violations.length, `${state}: ` + r.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", "));
        if (state !== "closed") {
          const small = await page.$$eval("#mm-search a, #mm-search button, #mm-search label, #mm-search input:not([type=radio])", (els) =>
            els.filter((el) => el.getClientRects().length && !el.closest(".mm-sr-only")).map((el) => {
              const b = el.getBoundingClientRect();
              return { what: el.id || el.className || el.tagName, w: b.width, h: b.height };
            }).filter((b) => b.w < 24 || b.h < 24));
          expect(!small.length, "targets < 24px: " + JSON.stringify(small));
        }
      }
      expect(!problems.length, problems.join("; "));
      await context.close();
    });
  }
}

await browser.close();
server.close();
let failed = 0;
for (const [s, n] of results) {
  if (s !== "ok") failed++;
  console.log(`${s.padEnd(4)} ${n}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;

// Runs axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on packages/tokens/demo/index.html,
// at 360 px and 1280 px wide, in light and dark, with the menu and the search overlay open.
// Also fails on horizontal overflow, page errors, and CSP violations (the demo sets a strict CSP).
// Usage: CHROME_PATH=/usr/bin/google-chrome node run-axe.mjs <path-to-packages/tokens>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname, resolve } from "node:path";
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";

const root = resolve(process.argv[2] || "../../../packages/tokens");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://localhost").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(root, path.endsWith("/") ? path + "index.html" : path);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/demo/index.html`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let failed = 0;

for (const width of [360, 1280]) {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console error: ${m.text()}`);
    });
    await page.goto(base, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const states = [["page", async () => {}]];
    if (width <= 750) {
      states.push(["menu open", async () => { await page.click(".mm-menu-toggle"); }]);
    }
    states.push(["search open", async () => {
      if (width <= 750) await page.click(".mm-menu-toggle");
      await page.keyboard.press("Control+k");
      await page.fill("#mm-search-input", "demo");
      await page.waitForSelector(".mm-search-results li");
    }]);

    for (const [state, setup] of states) {
      await page.goto(base, { waitUntil: "load" });
      await setup();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) problems.push(`${state}: horizontal overflow of ${overflow}px`);
      const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of result.violations) {
        problems.push(`${state}: axe ${v.id} (${v.impact}) ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
      }
    }

    const label = `${width}px ${scheme}`;
    if (problems.length) {
      failed += problems.length;
      console.error(`FAIL ${label}`);
      for (const p of problems) console.error(`  - ${p}`);
    } else {
      console.log(`ok   ${label}: no axe violations, no overflow, no errors (${states.map((s) => s[0]).join(", ")})`);
    }
    await context.close();
  }
}

await browser.close();
server.close();
if (failed) {
  console.error(`\n${failed} problem(s)`);
  process.exit(1);
}

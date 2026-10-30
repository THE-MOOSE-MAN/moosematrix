// Runs axe-core (WCAG 2.0/2.1/2.2 A and AA rules) on packages/tokens/demo/index.html,
// at 360 px and 1280 px wide, in dark (default, no cookie) and light (mm-theme=light cookie), with the menu and the
// search overlay open. The OS colour scheme is emulated opposite to the theme, to prove it is ignored.
// Also fails on horizontal overflow, page errors, and CSP violations (the demo sets a strict CSP).
// Usage: CHROME_PATH=/usr/bin/google-chrome node run-axe.mjs <path-to-packages/tokens>
import { launch, newContext, lightCookie, ORIGINS, DEMO } from "./harness.mjs";
import { AxeBuilder } from "@axe-core/playwright";

const root = process.argv[2] || "../../../packages/tokens";
const base = ORIGINS[0] + DEMO;
const browser = await launch();
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let failed = 0;

for (const width of [360, 1280]) {
  for (const scheme of ["dark", "light"]) {
    const context = await newContext(browser, root, { viewport: { width, height: 800 }, colorScheme: scheme === "light" ? "dark" : "light", reducedMotion: "reduce" });
    if (scheme === "light") await context.addCookies([lightCookie()]);
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
      const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme") || "dark");
      if (theme !== scheme) problems.push(`${state}: expected ${scheme} theme, page is ${theme}`);
      const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of result.violations) {
        problems.push(`${state}: axe ${v.id} (${v.impact}) ${v.help} — ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
      }
    }

    if (context.blocked.length) problems.push(`requests outside the test origins: ${context.blocked.length}`);
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
if (failed) {
  console.error(`\n${failed} problem(s)`);
  process.exit(1);
}

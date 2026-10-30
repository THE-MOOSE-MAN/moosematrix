// Checks the prerendered HTML (run after `next build`): tokens header/footer/search partials, the v5 Home, Library,
// Search and Lab pages, the typed headlines on the older pages, and CSP-safe markup.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..", ".next", "server", "app");
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const strip = (h) => h.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&rsquo;/g, "\u2019").replace(/\s+/g, " ").trim();
const between = (h, a, b) => { const i = h.indexOf(a); assert.ok(i >= 0, a); const j = h.indexOf(b, i); return h.slice(i, j); };
// Text of the visually-hidden copy inside a TypedLine heading.
const srText = (h1) => { const m = h1.match(/<span class="mmx-tw-sr">(.*?)<\/span><span class="mmx-tw-a"/); assert.ok(m, "mmx-tw-sr"); return { html: m[1], text: strip(m[1]) }; };
const links = (h) => [...h.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], strip(m[2])]);
const pages = ["index.html", "library.html", "search.html", "lab.html", "builds.html", "about.html", "contact.html", "security.html", "subsidiaries.html", "privacy.html", "terms.html"];
const NAV = [["/builds", "Projects"], ["/library", "Library"], ["/lab", "Lab"], ["https://merch.moosematrix.com/", "Shop"], ["/about", "About"]];

test("every page: tokens header with the moose-head nav, search overlay and footer; skip link targets #main", () => {
  for (const f of pages) {
    const h = read(f);
    const header = between(h, '<header class="mm-header"', "</header>");
    assert.match(h, /<a class="mm-skip" href="#main">/, f);
    assert.match(h, /<main id="main" tabindex="-1"/, f);
    const nav = between(header, '<nav class="mm-nav"', "</nav>");
    assert.deepEqual(links(nav), NAV, f);
    assert.match(h, /<dialog class="mm-search" id="mm-search"[^>]* data-mm-index="\/search-index.json"/, f + ": same-origin index only");
    assert.match(h, /<footer class="mm-footer"/, f);
    assert.match(h, /<script src="\/mm\/nav.js" defer="">/, f);
    assert.match(h, /<script src="\/mm\/search.js" defer="">/, f);
  }
});

test("CSP-safe and policy-safe markup on every page", () => {
  for (const f of pages) {
    const h = read(f);
    assert.ok(!/ style="/.test(h), f + ": no style attributes");
    assert.ok(!/\son[a-z]+="/.test(h), f + ": no inline handlers");
    assert.ok(!new RegExp("target=.?_" + "blank").test(h), f + ": same-tab links only"); // split so the CI new-tab grep does not flag this test
    assert.ok(!/https:\/\/moosematrix\.com\/(projects|lab|shop|library|search)\//.test(h), f + ": v5 placeholder paths are mapped");
    for (const [href] of links(h)) assert.match(href, /^(\/|#|mailto:[a-z]+@moosematrix\.com$|https:\/\/([a-z0-9-]+\.)?(moosematrix\.com|wardoglabs\.com)(\/|$))/, `${f}: ${href}`);
    const ext = [...h.matchAll(/<script[^>]+src="([^"]+)"|<link[^>]+rel="(?:stylesheet|preload|modulepreload|icon|manifest)"[^>]+href="([^"]+)"/g)].map((m) => m.slice(1).find(Boolean)).filter((u) => /^(https?:)?\/\//.test(u));
    assert.deepEqual(ext, [], f + ": no third-party scripts, styles or fonts");
  }
});

test("Home: v5 hero, three selected projects, editorial row, merch and studio sections", () => {
  const i = read("index.html");
  const hero = between(i, '<section class="mm-hero"', "</section>");
  assert.equal(strip(between(hero, "<h1", "</h1>").replace(/<br\/?>/g, " ")).replace(/^[^>]*>/, ""), "THE MOOSE MATRIX");
  assert.match(strip(hero), /FOR A MORE OPEN TOMORROW/);
  assert.match(hero, /<a class="mm-chip-link" href="\/search" data-mm-search-open="">/);
  const titles = [...i.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((m) => strip(m[1]));
  assert.deepEqual(titles, ["Assembly Stack Visualizer", "PROMETHEUS", "Moose Money / M2 \u2192"]);
  const h2 = [...between(i, "<main", "</main>").matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1].replace(/<br\/?>/g, " ")));
  assert.deepEqual(h2, ["SELECTED PROJECTS", "FROM THE LIBRARY", "THE MOOSE LAB", "FROM THE MOOSE MAN", "TOOLS FOR CURIOUS MINDS.", "ABOUT THE STUDIO", "CONTACT"]);
  assert.ok(!/SAMPLE/.test(strip(i)), "no sample content on prod");
});

test("Library, Search, Lab: v5 page heroes; full list in the HTML; filtering is an external script", () => {
  const l = read("library.html");
  assert.match(strip(between(l, "<h1", "</h1>")), /THE LIBRARY/);
  assert.match(l, /<form class="mm-lib-form" role="search" action="\/library" method="get">/);
  assert.match(l, /<script src="\/js\/mm-list.js" defer="">/);
  const s = read("search.html");
  const index = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "public", "search-index.json"), "utf8"));
  const rows = [...s.matchAll(/<li data-mm-type="([^"]+)"/g)];
  assert.equal(rows.length, index.items.length, "/search lists every index item with JS off");
  assert.match(s, /aria-live="polite"/);
  assert.match(strip(between(read("lab.html"), "<h1", "</h1>")), /THE MOOSE LAB/);
});

test("every TypedLine heading has the full text in its visually-hidden copy", () => {
  const want = { "builds.html": "What I\u2019m building", "about.html": "About", "contact.html": "Contact", "security.html": "Security", "subsidiaries.html": "Subsidiaries & subdomains", "privacy.html": "Privacy Policy", "terms.html": "Terms of Service", "_not-found.html": "Page not found" };
  for (const [f, text] of Object.entries(want)) {
    const h1 = between(read(f), "<h1", "</h1>");
    assert.equal(srText(h1).text, text, f);
    assert.match(h1, /class="mmx-tw-a" aria-hidden="true"/, f);
  }
});

test("no old labels in visible text of any page", () => {
  for (const f of pages) {
    const t = strip(read(f).replace(/<script[\s\S]*?<\/script>/g, ""));
    for (const old of ["Write-ups", "Money tools", "the Builds page"]) assert.ok(!t.includes(old), `${f}: ${old}`);
    assert.ok(!/\bBuilds\b/.test(t), `${f}: Builds`);
  }
});

test("CSS: reduced motion turns the typing off; glyphs hide with colour only (never visibility/opacity)", () => {
  const cssDir = path.join(import.meta.dirname, "..", ".next", "static");
  const css = fs.readdirSync(cssDir, { recursive: true }).filter((f) => String(f).endsWith(".css")).map((f) => fs.readFileSync(path.join(cssDir, String(f)), "utf8")).join("\n");
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\{[^}]*\.mmx-tw-a>span[^}]*animation:none!important/);
  assert.match(css, /@keyframes mmx-tw-in\{(0%|from)\{color:(transparent|#0000)\}\}/, "glyph colour-reveal keyframes");
  assert.ok(!/@keyframes mmx-tw-in\{[^}]*(visibility|opacity)/.test(css));
});

// Checks the prerendered HTML (run after `next build`): header markup, homepage hero/cards/labels, typed headline.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..", ".next", "server", "app");
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const strip = (h) => h.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&rsquo;/g, "\u2019").replace(/\s+/g, " ").trim();
const between = (h, a, b) => { const i = h.indexOf(a); assert.ok(i >= 0, a); const j = h.indexOf(b, i); return h.slice(i, j); };
const MAIN = ["Research & Development", "Moose Mumbles", "Moo$e Money", "Shop"]; // cards, headings
const HEADER = ["R&D", "Moose Mumbles", "Moo$e Money", "Shop"]; // top menu (Dustin 22 Oct 7:31)
const MORE = ["About", "Directory", "Security", "Contact"];
// Text of the visually-hidden copy inside a TypedLine heading.
const srText = (h1) => { const m = h1.match(/<span class="mmx-tw-sr">(.*?)<\/span><span class="mmx-tw-a"/); assert.ok(m, "mmx-tw-sr"); return { html: m[1], text: strip(m[1]) }; };
const anchors = (h) => [...h.matchAll(/<a [^>]*>(.*?)<\/a>/g)].map((m) => strip(m[1]));
const pages = ["index.html", "builds.html", "about.html", "contact.html", "security.html", "subsidiaries.html", "privacy.html", "terms.html"];

test("header: brand, 4 main links in order, then a More <details> with About/Directory/Security/Contact", () => {
  for (const f of pages) {
    const h = read(f);
    const header = between(h, '<header class="mmx-header"', "</header>");
    const bar = between(header, 'aria-label="Moose Matrix"', "</nav>");
    const [main, more] = bar.split('<details class="mmx-more"');
    assert.deepEqual(anchors(main), HEADER, f);
    assert.match(main, /href="\/builds"[^>]* title="Research &amp; Development">R&amp;D</, f + ": full name kept as the title");
    assert.ok(!main.includes(">Home<"), f + ": no Home link on moosematrix.com itself");
    assert.match(more, /<summary[^>]*><span>More<\/span><svg class="mmx-chev"[^>]*aria-hidden="true"/, f);
    assert.deepEqual(anchors(more), MORE, f);
    const menu = between(header, 'aria-label="Moose Matrix (menu)"', "</nav>");
    assert.deepEqual(anchors(menu), [...HEADER, ...MORE], f + " menu");
    assert.match(menu, /<p class="mmx-group" id="mmx-menu-more">More<\/p>/);
    assert.ok(!/ style="/.test(header), "no inline styles in the header (CSP)");
    assert.ok(!/<script(?![^>]*src=)[^>]*>[^<]+/.test(header), "no inline script in the header");
  }
});

test("aria-current: R&D on /builds, About on /about (and More underlined), nothing extra on /", () => {
  const b = read("builds.html");
  assert.match(b, /<a class="mmx-link" href="\/builds" aria-current="page" title="Research &amp; Development">R&amp;D<\/a>/);
  const a = read("about.html");
  assert.match(a, /<a class="mmx-link" href="\/about" aria-current="page">About<\/a>/);
  assert.match(a, /<summary class="mmx-more-cur">/);
  const i = read("index.html");
  const nav = between(i, 'aria-label="Moose Matrix"', "</nav>");
  assert.ok(!nav.includes("aria-current"), "no section is current on the homepage");
  assert.ok(!nav.includes("mmx-more-cur"));
});

test("hero: new line and sub-line, accent phrase, no 'Dustin Warren' or 'gear'", () => {
  const i = read("index.html");
  const hero = between(i, '<section id="home"', "</section>");
  const h1 = between(hero, "<h1", "</h1>");
  const sr = srText(h1);
  assert.equal(sr.text, "Breaking things, building things, and writing it all down.");
  assert.match(sr.html, /<span class="mmx-tw-acc">building things<\/span>/);
  assert.match(h1, /class="mmx-tw mmx-tw-s25"/, "59 characters -> 25ms per character (1.475 s)");
  assert.match(hero, /Built security-first by The Moose Man\./);
  assert.ok(!/Dustin Warren/.test(hero));
  assert.ok(!/\bgear\b/i.test(strip(hero)));
  const accGlyphs = [...h1.matchAll(/<span class="mmx-tw-acc">(.)<\/span>/g)].map((m) => m[1]).join("");
  assert.equal(accGlyphs, "building things");
});

test("homepage cards follow the nav order; CTA wording; Latest line", () => {
  const i = read("index.html");
  const tiles = between(i, '<div class="mm-tiles">', "</main>");
  const labels = [...tiles.matchAll(/<h2 [^>]*>(.*?)<\/h2>/g)].map((m) => strip(m[1]));
  assert.deepEqual(labels, MAIN);
  const t = strip(tiles);
  for (const cta of ["See what I\u2019m building", "Read Moose Mumbles", "Open the calculators", "Browse the shop"]) assert.ok(t.includes(cta), cta);
  assert.ok(!/Read the write-ups/.test(t));
  assert.match(strip(between(i, '<p class="mm-latest"', "</p>")), /the Research & Development page/);
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

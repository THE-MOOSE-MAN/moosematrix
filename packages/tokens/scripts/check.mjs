// Package lint for @moosematrix/tokens. Plain Node, no dependencies. Exit 1 on any failure.
//  - CSP: no inline <script> bodies, no style= attributes, no <style> blocks, no on*= handlers
//  - DOM safety: no innerHTML / outerHTML / insertAdjacentHTML / document.write / eval / new Function
//  - links: no target= attributes (same-tab only); no remote url()/@import in CSS (self-hosted only)
//  - version: package.json == CHANGELOG top entry == tokens.css marker == file header comments
//  - fonts: fonts/SHA256SUMS verifies
//  - JS parses (node --check)
//  - logos: inline SVG path data equals brand/main-mark-dark.svg
//  - contrast: WCAG 2.2 AA pairs in both themes (:root = dark default, [data-theme="light"] = light)
//  - theme: no OS colour-scheme media block, no decodeURIComponent / dataset writes in theme code
//  - IPs: no public or tailnet IPs, IPv6 literals, SSH port or MagicDNS names (scripts/check-ips.mjs)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { scan as scanIps } from "./check-ips.mjs";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(pkg, f), "utf8");
const failures = [];
const fail = (msg) => failures.push(msg);
const ok = (msg) => console.log(`ok  ${msg}`);

function files(dir = pkg) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else out.push(relative(pkg, p));
  }
  return out;
}
const all = files();
const by = (...exts) => all.filter((f) => exts.includes(extname(f)));
const html = by(".html");
const js = by(".js", ".mjs");
const css = by(".css");

// CSP and same-tab rules (markup)
let n = failures.length;
for (const f of [...html, ...by(".svg")]) {
  const s = read(f);
  if (/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(s)) fail(`${f}: inline <script> (needs a src)`);
  if (/<style\b/i.test(s)) fail(`${f}: <style> block`);
  if (/\sstyle\s*=/i.test(s)) fail(`${f}: style= attribute`);
  if (/\son[a-z]+\s*=/i.test(s)) fail(`${f}: inline event handler`);
  if (/\starget\s*=/i.test(s)) fail(`${f}: target= attribute (links must open in the same tab)`);
  if (/href\s*=\s*["']?\s*javascript:/i.test(s)) fail(`${f}: javascript: URL`);
}
if (failures.length === n) ok(`markup: no inline script/style/handlers, no target= (${html.length} HTML, ${by(".svg").length} SVG)`);

// DOM safety (script)
n = failures.length;
for (const f of js.filter((f) => !f.startsWith("scripts/"))) {
  const s = read(f).replace(/^\s*\/\/.*$/gm, "");
  for (const [re, what] of [
    [/\.innerHTML\b/, "innerHTML"],
    [/\.outerHTML\b/, "outerHTML"],
    [/insertAdjacentHTML/, "insertAdjacentHTML"],
    [/document\.write/, "document.write"],
    [/\beval\s*\(/, "eval"],
    [/new\s+Function\b/, "new Function"],
    [/\.style\.|\.style\s*=|setAttribute\(\s*["']style/, "inline style from JS"],
    [/["']_blank["']|\.target\s*=(?!=)|window\.open\s*\(/, "new-tab link"],
  ]) {
    if (re.test(s)) fail(`${f}: ${what}`);
  }
}
if (failures.length === n) ok("scripts: no HTML sinks, eval, inline styles or new-tab links (nav.js, search.js)");

// Theme code: constants only reach the DOM and the cookie
n = failures.length;
for (const f of ["theme-core.js", "theme-init.js", "nav.js"]) {
  const s = read(f);
  if (/decodeURIComponent|decodeURI\b|unescape\(/.test(s)) fail(`${f}: decodes the cookie value`);
  if (/\.dataset\b/.test(s)) fail(`${f}: dataset write (use the constant setAttribute)`);
  if (/render <html data-theme>|on the server/i.test(s)) fail(`${f}: server-side theming comment (no server reads mm-theme)`);
}
if (failures.length === n) ok("theme: no cookie decoding, no dataset writes, no server-theming comment");

// Self-hosted only (CSS)
n = failures.length;
for (const f of css) {
  const s = read(f);
  if (/url\(\s*["']?\s*(https?:)?\/\//i.test(s)) fail(`${f}: remote url()`);
  if (/@import\s+(url\()?\s*["']?\s*(https?:)?\/\//i.test(s)) fail(`${f}: remote @import`);
}
if (failures.length === n) ok(`styles: no remote url() or @import (${css.length} files)`);

// Version
n = failures.length;
const version = JSON.parse(read("package.json")).version;
const changelog = (read("CHANGELOG.md").match(/^##\s+\[?(\d+\.\d+\.\d+)/m) || [])[1];
const marker = (read("tokens.css").match(/--mm-tokens-version:\s*"([^"]+)"/) || [])[1];
if (changelog !== version) fail(`version: CHANGELOG top entry ${changelog} != package.json ${version}`);
if (marker !== version) fail(`version: tokens.css marker ${marker} != package.json ${version}`);
for (const f of [...css.filter((f) => !f.startsWith("demo/")), "nav.js", "search.js", "theme-core.js", "theme-init.js", "render.mjs", ...html.filter((f) => !f.startsWith("demo/") && !f.startsWith("tests/"))]) {
  const m = read(f).match(/@moosematrix\/tokens (\d+\.\d+\.\d+)/);
  if (!m) fail(`version: ${f} has no "@moosematrix/tokens x.y.z" header`);
  else if (m[1] !== version) fail(`version: ${f} header says ${m[1]}, package.json ${version}`);
}
if (failures.length === n) ok(`version ${version} matches CHANGELOG, tokens.css and file headers`);

// Fonts
n = failures.length;
const sums = read("fonts/SHA256SUMS").trim().split("\n");
for (const line of sums) {
  const [hash, name] = line.trim().split(/\s+\*?/);
  const actual = createHash("sha256").update(readFileSync(join(pkg, "fonts", name))).digest("hex");
  if (actual !== hash) fail(`fonts: ${name} sha256 mismatch`);
}
const listed = new Set(sums.map((l) => l.trim().split(/\s+\*?/)[1]));
for (const f of all.filter((f) => f.startsWith("fonts/") && /\.(woff2|txt)$/.test(f))) {
  if (!listed.has(f.slice(6))) fail(`fonts: ${f} is not in SHA256SUMS`);
}
for (const m of read("fonts.css").matchAll(/url\("([^"]+)"\)/g)) {
  if (!all.includes(m[1])) fail(`fonts.css: ${m[1]} does not exist`);
}
if (failures.length === n) ok(`fonts: ${sums.length} SHA256SUMS entries verify, fonts.css URLs resolve`);

// JS parses
n = failures.length;
for (const f of js) {
  try {
    execFileSync(process.execPath, ["--check", join(pkg, f)], { stdio: "pipe" });
  } catch {
    fail(`${f}: syntax error`);
  }
}
if (failures.length === n) ok(`node --check: ${js.length} files parse`);

// Logo integrity
n = failures.length;
const brandPaths = [...read("brand/main-mark-dark.svg").matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const iconPaths = [...read("brand/main-icon-dark.svg").matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
if (brandPaths.join() !== iconPaths.join()) fail("logos: main-icon and main-mark path data differ");
for (const f of ["header.html", "footer.html"]) {
  const s = read(f);
  for (const svg of s.matchAll(/<svg class="(mm-brand-icon|mm-crest-mark|mm-menu-mark)"[\s\S]*?<\/svg>/g)) {
    const d = [...svg[0].matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    if (d.join() !== brandPaths.join()) fail(`logos: ${f} ${svg[1]} path data differs from brand/main-mark-dark.svg`);
  }
}
if (failures.length === n) ok("logos: inline marks match brand/ path data");

// Contrast
n = failures.length;
const tokens = read("tokens.css");
const block = (re) => {
  const m = tokens.match(re);
  if (!m) return null;
  return Object.fromEntries([...m[1].matchAll(/--mm-(?:color|logo)-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1], x[2].toLowerCase()]));
};
const dark = block(/^:root\s*\{([\s\S]*?)^\}/m);
const light = block(/^:root\[data-theme="light"\]\s*\{([\s\S]*?)^\}/m);
if (/prefers-color-scheme/.test(tokens)) fail("tokens: prefers-color-scheme block present (the OS setting must never pick the theme)");
if (/data-theme="dark"/.test(tokens)) fail('tokens: [data-theme="dark"] block present (dark is the :root default)');
if (!/^:root\s*\{[^}]*color-scheme:\s*dark;/m.test(tokens)) fail("tokens: :root must set color-scheme: dark");
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const TEXT = 4.5;
const UI = 3;
const pairs = [
  ["ink", "ground", TEXT], ["ink", "panel", TEXT], ["ink", "panel-2", TEXT], ["ink", "selection", TEXT],
  ["ink-2", "ground", TEXT], ["ink-2", "panel", TEXT], ["ink-2", "panel-2", TEXT],
  ["accent", "ground", TEXT], ["accent", "panel", TEXT], ["accent", "panel-2", TEXT],
  ["on-accent", "accent-fill", TEXT], ["on-accent", "accent-fill-hover", TEXT],
  ["money", "ground", TEXT], ["money", "panel", TEXT], ["store", "ground", TEXT], ["store", "panel", TEXT],
  ["edge", "ground", UI], ["edge", "panel", UI], ["edge", "panel-2", UI],
  ["accent", "ground", UI], ["mark", "tile", UI],
];
for (const [theme, t] of [["dark", dark], ["light", light]]) {
  if (!t) {
    fail(`tokens: ${theme} block not found`);
    continue;
  }
  for (const [fg, bg, min] of pairs) {
    if (!t[fg] || !t[bg]) {
      fail(`contrast: ${theme} missing ${t[fg] ? bg : fg}`);
      continue;
    }
    const r = ratio(t[fg], t[bg]);
    if (r < min) fail(`contrast: ${theme} ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min}:1`);
  }
}
if (failures.length === n) ok(`contrast: ${pairs.length} pairs pass in light and dark`);

// IPs
n = failures.length;
for (const hit of scanIps([pkg])) fail(`ip: address/host/port leak at ${relative(pkg, hit)}`);
if (failures.length === n) ok("ip: no public/tailnet IPs, IPv6, SSH port or MagicDNS names");

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nall package checks passed");

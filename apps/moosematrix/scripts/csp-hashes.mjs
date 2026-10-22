// Post-build CSP generator (22 Oct 2026, hardened after VB review). Identical file in moosematrix
// (apps/moosematrix/scripts) and mooseman-site (scripts).
//
// Every page is prerendered, so the exact inline <script>s Next.js emits are known after `next build`. This script
// reads the prerendered HTML, checks that every inline script is one Next.js itself emits (or a pinned app script),
// hashes them and writes .next/csp.json with the policy. Pages stay static: no per-request nonce, which would force
// dynamic rendering and slow first paint. The build FAILS (exit 1) when:
//   - a page is not prerendered, or is ISR (revalidates at runtime), or a dynamic route can render at runtime:
//     its inline scripts would not match these build-time hashes;
//   - an inline script is not one of Next's own shapes or a pinned app script (PINNED below): new inline code must
//     be a deliberate change, never silently allowed by a fresh hash;
//   - a page has an inline event handler (quoted, single-quoted or unquoted);
//   - a style="" attribute would need 'unsafe-hashes' and --allow-style-attrs was not passed;
//   - the policy is over 3000 bytes (nginx proxy_buffer_size 4k must still fit every other response header).
// Next's built-in static error pages (app/_global-error.html, pages/500.html) are styled with style="" attributes; at
// build time each one is moved into a rule in the page's own <style> block (hashed), so they render styled without
// 'unsafe-hashes'.
//
// Usage: node scripts/csp-hashes.mjs [--check] [--allow-style-attrs] [--patch-routes-manifest]
//   --check                 print the policy and inventory; write nothing
//   --allow-style-attrs     allow style="" attributes via 'unsafe-hashes' (mooseman: framer-motion, next/image, not-found)
//   --patch-routes-manifest replace __MMX_CSP_FROM_BUILD__ in the routes manifests (mooseman, Next standalone server)
// CSP_HASHES_ROOT=<dir> runs against another project root (used by the tests' fixtures).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.env.CSP_HASHES_ROOT || process.cwd();
const next = path.join(root, ".next");
const appDir = path.join(next, "server", "app");
const standalone = path.join(next, "standalone", ".next");
const args = new Set(process.argv.slice(2));
const check = args.has("--check"), allowStyleAttrs = args.has("--allow-style-attrs"), patchManifest = args.has("--patch-routes-manifest");
const MAX_POLICY_BYTES = 3000;
// App-owned inline scripts, pinned by id AND content hash. Changing the script means updating its hash here, on purpose.
// mm-theme-init: moosematrix src/app/layout.tsx THEME_INIT (sets data-theme from the mm-theme cookie before first paint).
const PINNED = { "mm-theme-init": "'sha256-Px/x5qVSmgUsFk3ra9wHVBtWlKytn7Og+YzUxfdYr4Y='" };

const sha = (s) => `'sha256-${crypto.createHash("sha256").update(s, "utf8").digest("base64")}'`;
const unescapeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const fail = (msg) => { console.error(`csp-hashes: ${msg}`); process.exit(1); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []));
const write = (f, s) => { if (!check) fs.writeFileSync(f, s); };

if (!fs.existsSync(appDir)) fail("run `next build` first (.next/server/app missing)");

// ---- 1. Every page is static: prerendered, never revalidated, no runtime-rendered dynamic routes ----
{
  const routes = readJson(path.join(next, "app-path-routes-manifest.json"));
  const pm = readJson(path.join(next, "prerender-manifest.json"));
  const prerendered = new Set(Object.keys(pm.routes));
  const dynamicPages = Object.entries(routes).filter(([k, r]) => k.endsWith("/page") && !prerendered.has(r)).map(([, r]) => r);
  if (dynamicPages.length) fail(`not prerendered (needs a nonce-based CSP instead): ${dynamicPages.join(", ")}`);
  const isr = Object.entries(pm.routes).filter(([, r]) => r.initialRevalidateSeconds !== false).map(([k, r]) => `${k} (revalidate ${r.initialRevalidateSeconds})`);
  if (isr.length) fail(`ISR page(s) re-render at runtime and their inline scripts would no longer match the hashes: ${isr.join(", ")}`);
  const runtime = Object.entries(pm.dynamicRoutes || {}).filter(([, r]) => r.fallback !== false).map(([k]) => k);
  if (runtime.length) fail(`dynamic route(s) can render new paths at runtime (set dynamicParams = false): ${runtime.join(", ")}`);
}

// ---- 2. Built-in error pages: move style="" attributes into the page's own <style> block ----
const keepStyleHashes = []; // each page's original <style>: React may re-insert it on the client after hydration
const errorPages = [path.join("app", "_global-error.html"), path.join("pages", "500.html")];
for (const rel of errorPages) {
  const f = path.join(next, "server", rel);
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, "utf8");
  const map = new Map();
  html = html.replace(/\sstyle="([^"]*)"/g, (_, v) => {
    const css = unescapeAttr(v);
    if (/[<>{}]/.test(css)) fail(`${rel}: unexpected characters in a style attribute`);
    if (!map.has(css)) map.set(css, `mmx-ge${map.size}`);
    return ` data-mmx-ge="${map.get(css)}"`;
  });
  if (!map.size) continue;
  const orig = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);
  if (!orig) fail(`${rel} has style attributes but no <style> block to move them into`);
  keepStyleHashes.push(sha(orig[1]));
  const rules = [...map].map(([css, c]) => `[data-mmx-ge="${c}"]{${css}}`).join("");
  html = html.replace(/<\/style>/i, `${rules}</style>`);
  write(f, html);
  const copy = path.join(standalone, "server", rel); // what the standalone container serves
  if (fs.existsSync(copy)) write(copy, html);
}

// ---- 3. Inventory and hashes ----
// Next's own inline script shapes. Each must match in full; the data part must be plain JSON.
const isJson = (s) => { try { JSON.parse(s); return true; } catch { return false; } };
function knownScript(body, attrs) {
  const id = (attrs.match(/\sid="([^"]*)"/) || [])[1];
  if (id && PINNED[id]) return sha(body) === PINNED[id] ? `pinned:${id}` : null;
  if (attrs.trim() === "" && body === "(self.__next_f=self.__next_f||[]).push([0])") return "next-flight-init";
  let m;
  if (attrs.trim() === "" && (m = body.match(/^self\.__next_f\.push\((\[\d+,[\s\S]*\])\)$/)) && isJson(m[1])) {
    const a = JSON.parse(m[1]);
    if (a.length === 2 && Number.isInteger(a[0]) && (typeof a[1] === "string" || a[1] === null)) return "next-flight";
  }
  if (id === "_R_" && (m = body.match(/^\(globalThis\["TURBOPACK"\] \|\| \(globalThis\["TURBOPACK"\] = \[\]\)\)\.push\((\{[\s\S]*\})\);$/)) && isJson(m[1])) {
    const o = JSON.parse(m[1]);
    const ok = Object.keys(o).every((k) => ["otherChunks", "runtimeModuleIds"].includes(k)) &&
      (o.otherChunks || []).every((c) => typeof c === "string" && /^static\/chunks\/[\w.-]+\.js$/.test(c)) &&
      (o.runtimeModuleIds || []).every((n) => Number.isInteger(n));
    if (ok) return "turbopack-runtime";
  }
  return null;
}

const pages = [...walk(appDir), ...errorPages.map((r) => path.join(next, "server", r)).filter((f) => f.includes(`${path.sep}pages${path.sep}`) && fs.existsSync(f))];
const scripts = new Set(), styles = new Set(), styleAttrs = new Set(), inventory = {};
for (const f of pages.sort()) {
  let html = fs.readFileSync(f, "utf8");
  if (check) for (const rel of errorPages) if (f.endsWith(rel) && /\sstyle="/.test(html)) html = html.replace(/\sstyle="[^"]*"/g, ""); // --check: show the transformed view
  const page = path.relative(path.join(next, "server"), f);
  const inv = (inventory[page] = { inlineScripts: 0, inlineStyles: 0, styleAttrs: 0, kinds: {} });
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\ssrc\s*=/i.test(m[1])) continue;
    if (/\stype\s*=\s*["']?application\/(ld\+)?json["']?/i.test(m[1])) continue; // data blocks never execute
    const kind = knownScript(m[2], m[1]);
    if (!kind) fail(`unexpected inline script in ${page}: ${JSON.stringify(m[2].slice(0, 80))}. Move it to a file under public/, or pin it in PINNED if the site really needs it inline.`);
    scripts.add(sha(m[2])); inv.inlineScripts++; inv.kinds[kind] = (inv.kinds[kind] || 0) + 1;
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) { styles.add(sha(m[1])); inv.inlineStyles++; }
  const noScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  for (const m of noScripts.matchAll(/<[a-z][^>]*?\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) { styleAttrs.add(sha(unescapeAttr(m[1] ?? m[2] ?? m[3]))); inv.styleAttrs++; }
  if (/<[a-z][^>]*?\son[a-z]+\s*=/i.test(noScripts)) fail(`inline event handler in ${page}; move it to a script file`);
  if (/\s(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/i.test(noScripts)) fail(`javascript: URL in ${page}`);
}
if (styleAttrs.size && !allowStyleAttrs) fail(`${styleAttrs.size} style="" attribute value(s) would need 'unsafe-hashes'. Use a class instead, or pass --allow-style-attrs (mooseman only). Pages: ${Object.entries(inventory).filter(([, v]) => v.styleAttrs).map(([k]) => k).join(", ")}`);

// ---- 4. Policy: the nginx baseline directives (security-headers.conf on moose-web) minus 'unsafe-inline' ----
const styleSrc = ["'self'", ...(styleAttrs.size ? ["'unsafe-hashes'", ...styleAttrs] : []), ...styles, ...keepStyleHashes];
const directives = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "img-src 'self' data: https:", "font-src 'self' data:",
  `script-src 'self' ${[...scripts].sort().join(" ")}`.trim(),
  `style-src ${[...new Set(styleSrc)].join(" ")}`,
  "connect-src 'self'", "manifest-src 'self'", "worker-src 'self' blob:", "upgrade-insecure-requests",
];
const policy = directives.join("; ");
if (Buffer.byteLength(policy) > MAX_POLICY_BYTES) fail(`policy is ${Buffer.byteLength(policy)} bytes (cap ${MAX_POLICY_BYTES}): nginx proxy_buffer_size (4k) must still fit every other response header`);

const out = { generated: new Date().toISOString(), policy, bytes: Buffer.byteLength(policy), counts: { scriptHashes: scripts.size, styleHashes: new Set([...styles, ...keepStyleHashes]).size, styleAttrHashes: styleAttrs.size }, inventory };
if (check) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

// ---- 5. Deliver ----
if (patchManifest) {
  // Next standalone server: the policy goes out through next.config.js headers(); replace the build placeholder in
  // both routes manifests (the standalone one is what the container serves).
  const PLACEHOLDER = "__MMX_CSP_FROM_BUILD__";
  for (const m of [path.join(next, "routes-manifest.json"), path.join(standalone, "routes-manifest.json")]) {
    if (!fs.existsSync(m)) fail(`${m} missing`);
    const txt = fs.readFileSync(m, "utf8");
    if (!txt.includes(PLACEHOLDER)) fail(`placeholder not found in ${m}`);
    fs.writeFileSync(m, txt.split(PLACEHOLDER).join(policy.replace(/\\/g, "\\\\").replace(/"/g, '\\"')));
  }
  // The standalone server serves its own copy of every page: it must be byte-identical to what was hashed.
  for (const f of pages) {
    const copy = path.join(standalone, path.relative(next, f));
    if (fs.existsSync(copy) && fs.readFileSync(copy, "utf8") !== fs.readFileSync(f, "utf8")) fail(`standalone copy differs from the hashed page: ${copy}`);
  }
}
fs.writeFileSync(path.join(next, "csp.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`csp-hashes: ${out.counts.scriptHashes} script, ${out.counts.styleHashes} style, ${styleAttrs.size} style-attribute hashes from ${pages.length} pages; policy ${out.bytes} bytes -> .next/csp.json`);

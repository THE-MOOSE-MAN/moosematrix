// Post-build CSP generator (22 Oct 2026). Same file in moosematrix (apps/moosematrix/scripts) and mooseman-site (scripts).
// Next.js always emits a few inline <script>s (Turbopack runtime, the RSC "flight" payload, bootstrap). Every page here
// is prerendered at build time, so their exact bytes are known after `next build`: this script reads every
// prerendered HTML file, hashes each inline script (and inline <style> / style="" attribute, if any) and writes
// .next/csp.json with the policy string. The server sends that policy, so script-src needs no 'unsafe-inline'
// and pages stay static (no per-request nonce, which would force dynamic rendering and slow first paint).
// Usage: node scripts/csp-hashes.mjs [--check]    (--check: print the policy and inventory, write nothing)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const appDir = path.join(root, ".next", "server", "app");
const check = process.argv.includes("--check");
const sha = (s) => `'sha256-${crypto.createHash("sha256").update(s, "utf8").digest("base64")}'`;
const unescapeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []));
}
if (!fs.existsSync(appDir)) { console.error("csp-hashes: run `next build` first (.next/server/app missing)"); process.exit(1); }

// Every page must be prerendered: a page rendered per request would emit inline scripts no build-time hash covers
// (it would load without JS under this CSP). Fail the build instead, so it gets noticed.
{
  const routes = JSON.parse(fs.readFileSync(path.join(root, ".next", "app-path-routes-manifest.json"), "utf8"));
  const prerendered = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(root, ".next", "prerender-manifest.json"), "utf8")).routes));
  const dynamicPages = Object.entries(routes).filter(([k, r]) => k.endsWith("/page") && !prerendered.has(r)).map(([, r]) => r);
  if (dynamicPages.length) { console.error(`csp-hashes: not prerendered (needs a nonce-based CSP instead): ${dynamicPages.join(", ")}`); process.exit(1); }
}

const scripts = new Set(), styles = new Set(), styleAttrs = new Set(), inventory = {};
for (const f of walk(appDir).sort()) {
  const html = fs.readFileSync(f, "utf8");
  const page = path.relative(appDir, f);
  const inv = (inventory[page] = { inlineScripts: 0, inlineStyles: 0, styleAttrs: 0, eventHandlers: 0 });
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\ssrc=/i.test(m[1])) continue;
    if (/type="application\/(ld\+)?json"/i.test(m[1])) continue; // data blocks never execute; CSP does not apply
    scripts.add(sha(m[2])); inv.inlineScripts++;
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) { styles.add(sha(m[1])); inv.inlineStyles++; }
  // Next's synthetic _global-error.html (the built-in static 500 page) is styled with style="" attributes. Allowing
  // those would need 'unsafe-hashes' on every page for a page that only shows on a server error, so it is left
  // out: under the CSP that page shows its text unstyled. Its inline scripts and <style> block are still hashed.
  if (page !== "_global-error.html") for (const m of html.matchAll(/\sstyle="([^"]*)"/gi)) { styleAttrs.add(sha(unescapeAttr(m[1]))); inv.styleAttrs++; }
  inv.eventHandlers = (html.match(/\son[a-z]+="/gi) || []).length;
  if (inv.eventHandlers) { console.error(`csp-hashes: inline event handler in ${page}; move it to a script`); process.exit(1); }
}

// Same directives as the nginx baseline (security-headers.conf on moose-web), minus 'unsafe-inline'.
const styleSrc = ["'self'", ...(styleAttrs.size ? ["'unsafe-hashes'", ...styleAttrs] : []), ...styles];
const directives = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "img-src 'self' data: https:", "font-src 'self' data:",
  `script-src 'self' ${[...scripts].sort().join(" ")}`.trim(),
  `style-src ${[...new Set(styleSrc)].join(" ")}`,
  "connect-src 'self'", "manifest-src 'self'", "worker-src 'self' blob:", "upgrade-insecure-requests",
];
const policy = directives.join("; ");
const out = { generated: new Date().toISOString(), policy, counts: { scriptHashes: scripts.size, styleHashes: styles.size, styleAttrHashes: styleAttrs.size }, inventory };
if (check) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
fs.writeFileSync(path.join(root, ".next", "csp.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`csp-hashes: ${scripts.size} script, ${styles.size} style, ${styleAttrs.size} style-attribute hashes from ${Object.keys(inventory).length} pages; policy ${policy.length} bytes -> .next/csp.json`);

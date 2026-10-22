// CSP built by scripts/csp-hashes.mjs (22 Oct 2026). Run after `npm run build`.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.join(import.meta.dirname, "..");
const csp = JSON.parse(fs.readFileSync(path.join(root, ".next", "csp.json"), "utf8"));
const dir = (d) => Object.fromEntries(csp.policy.split(/;\s*/).map((x) => { const [k, ...v] = x.trim().split(/\s+/); return [k, v]; }));
const D = dir();
const sha = (s) => `'sha256-${crypto.createHash("sha256").update(s, "utf8").digest("base64")}'`;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []));

test("no 'unsafe-inline' or 'unsafe-eval' anywhere; the fixed directives match the nginx baseline", () => {
  assert.doesNotMatch(csp.policy, /'unsafe-inline'|'unsafe-eval'|'strict-dynamic'|\*/);
  assert.deepEqual(D["default-src"], ["'self'"]);
  assert.deepEqual(D["frame-ancestors"], ["'none'"]);
  assert.deepEqual(D["object-src"], ["'none'"]);
  assert.deepEqual(D["base-uri"], ["'self'"]);
  assert.deepEqual(D["form-action"], ["'self'"]);
  assert.deepEqual(D["connect-src"], ["'self'"]);
  assert.ok("upgrade-insecure-requests" in D);
  assert.equal(D["script-src"][0], "'self'");
  assert.ok(D["script-src"].slice(1).every((s) => /^'sha256-[A-Za-z0-9+/]{43}='$/.test(s)), "script-src is 'self' plus hashes only");
});

test("every inline script in every prerendered page is covered by a hash (and nothing else is inline-executable)", () => {
  const pages = walk(path.join(root, ".next", "server", "app"));
  assert.ok(pages.length >= 4);
  for (const f of pages) {
    const h = fs.readFileSync(f, "utf8");
    for (const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\ssrc=/.test(m[1]) || /type="application\/(ld\+)?json"/.test(m[1])) continue;
      assert.ok(D["script-src"].includes(sha(m[2])), `${path.basename(f)}: inline script not hashed: ${m[2].slice(0, 60)}`);
    }
    assert.doesNotMatch(h, /\son[a-z]+="/i, `${path.basename(f)}: inline event handler`);
  }
});

test("server.js sends the generated policy in production only", () => {
  const s = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(s, /if \(!dev\)/);
  assert.match(s, /\.next", "csp\.json"/);
  assert.match(s, /res\.setHeader\(header, csp\)/);
  assert.deepEqual(D["style-src"].filter((x) => !x.startsWith("'sha256-")), ["'self'"], "style-src: 'self' + <style> hashes only (no 'unsafe-hashes')");
});

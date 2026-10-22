// Guard tests for scripts/csp-hashes.mjs (22 Oct 2026, after VB review M1/M2/M3/L1/L3/L5). They run the real
// generator against small synthetic .next/ fixtures, so they need no build and run in the Dockerfile and CI.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.join(import.meta.dirname, "..", "scripts", "csp-hashes.mjs");
const INIT = "<script>(self.__next_f=self.__next_f||[]).push([0])</script>";
const push = (s) => `<script>self.__next_f.push([1,${JSON.stringify(s)}])</script>`;
const doc = (body) => `<!DOCTYPE html><html><head><script src="/_next/static/chunks/a.js" async=""></script></head><body>${body}${INIT}${push("0:x")}</body></html>`;

function fixture({ pages = { "index.html": doc("<h1>Hi</h1>") }, revalidate = false, dynamicRoutes = {}, dynamicPage = false, errorPage } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "csp-guard-"));
  const app = path.join(root, ".next", "server", "app");
  fs.mkdirSync(app, { recursive: true });
  const routes = {}, pr = {};
  for (const [f, html] of Object.entries(pages)) {
    fs.writeFileSync(path.join(app, f), html);
    const r = f === "index.html" ? "/" : "/" + f.replace(/\.html$/, "");
    routes[`${r === "/" ? "" : r}/page`] = r;
    pr[r] = { initialRevalidateSeconds: revalidate, srcRoute: r };
  }
  if (dynamicPage) routes["/live/page"] = "/live";
  if (errorPage) fs.writeFileSync(path.join(app, "_global-error.html"), errorPage);
  fs.writeFileSync(path.join(root, ".next", "app-path-routes-manifest.json"), JSON.stringify(routes));
  fs.writeFileSync(path.join(root, ".next", "prerender-manifest.json"), JSON.stringify({ routes: pr, dynamicRoutes }));
  return root;
}
function run(root, ...args) {
  const r = spawnSync(process.execPath, [script, ...args], { env: { ...process.env, CSP_HASHES_ROOT: root }, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, csp: fs.existsSync(path.join(root, ".next", "csp.json")) ? JSON.parse(fs.readFileSync(path.join(root, ".next", "csp.json"), "utf8")) : null };
}
const fails = (r, re) => { assert.equal(r.code, 1, `expected build failure, got ${r.code}: ${r.out}`); assert.match(r.err, re); assert.equal(r.csp, null, "no policy written"); };

test("clean fixture builds: 'self' + hashes only", () => {
  const r = run(fixture());
  assert.equal(r.code, 0, r.err);
  assert.match(r.csp.policy, /script-src 'self' 'sha256-[^;]+; style-src 'self'; /);
  assert.doesNotMatch(r.csp.policy, /'unsafe-inline'|'unsafe-eval'|'unsafe-hashes'/);
});

test("M1: an injected inline alert(1) fails the build", () => {
  fails(run(fixture({ pages: { "index.html": doc("<script>alert(1)</script>") } })), /unexpected inline script in app\/index\.html: "alert\(1\)"/);
});

test("M1: look-alikes of Next's shapes fail too", () => {
  for (const s of [
    '<script>self.__next_f.push([1,"x"]);alert(1)</script>',
    '<script>self.__next_f.push([1,alert(1)])</script>',
    '<script>(self.__next_f=self.__next_f||[]).push([0]);alert(1)</script>',
    '<script id="_R_">(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push({"otherChunks":["https://evil.example/x.js"]});</script>',
    '<script id="mm-theme-init">alert(1)</script>',
    '<script type="module">alert(1)</script>',
    '<script type="text/javascript">alert(1)</script>',
  ]) fails(run(fixture({ pages: { "index.html": doc(s) } })), /unexpected inline script/);
});

test("M1: JSON data blocks and external scripts are not hashed and do not fail", () => {
  const r = run(fixture({ pages: { "index.html": doc('<script type="application/ld+json">{"@type":"Thing"}</script><script src="/x.js"></script>') } }));
  assert.equal(r.code, 0, r.err);
  assert.equal(r.csp.counts.scriptHashes, 2);
});

test("M2: an ISR page (revalidate 60) fails the build", () => {
  fails(run(fixture({ revalidate: 60 })), /ISR page\(s\).*\/ \(revalidate 60\)/);
});

test("M2: runtime-rendered dynamic routes and non-prerendered pages fail the build", () => {
  fails(run(fixture({ dynamicRoutes: { "/p/[slug]": { fallback: null } } })), /dynamic route/);
  fails(run(fixture({ dynamicPage: true })), /not prerendered.*\/live/);
});

test("M3: style attributes fail unless --allow-style-attrs", () => {
  const root = fixture({ pages: { "index.html": doc('<p style="color:red">x</p>') } });
  fails(run(root), /would need 'unsafe-hashes'.*--allow-style-attrs/);
  const ok = run(root, "--allow-style-attrs");
  assert.equal(ok.code, 0, ok.err);
  assert.match(ok.csp.policy, /style-src 'self' 'unsafe-hashes' 'sha256-/);
});

test("L3: inline event handlers fail whether quoted, single-quoted or unquoted; javascript: URLs fail", () => {
  for (const h of ['<img src=x onerror="alert(1)">', "<img src=x onerror='alert(1)'>", "<img src=x onerror=alert(1)>", "<body onload = alert(1)>", "<svg><a ONCLICK=alert(1)></a></svg>"])
    fails(run(fixture({ pages: { "index.html": doc(h) } })), /inline event handler/);
  fails(run(fixture({ pages: { "index.html": doc('<a href="javascript:alert(1)">x</a>') } })), /javascript: URL/);
  // Text that merely mentions "onclick=" inside a script payload is not an attribute.
  assert.equal(run(fixture({ pages: { "index.html": doc(push("<b onclick=x>")) } })).code, 0);
});

test("L5: a policy over 3000 bytes fails the build", () => {
  const many = Array.from({ length: 60 }, (_, i) => push(`chunk ${i}`)).join("");
  fails(run(fixture({ pages: { "index.html": doc(many) } })), /policy is \d+ bytes \(cap 3000\)/);
});

test("L1: the built-in error page's style attributes move into its hashed <style> block", () => {
  const ge = doc('<style>body{margin:0}</style><div style="font-family:system-ui,&quot;Segoe UI&quot;;height:100vh"><h1 style="display:inline-block">500</h1><p style="display:inline-block">x</p></div>');
  const root = fixture({ errorPage: ge });
  const r = run(root);
  assert.equal(r.code, 0, r.err);
  const out = fs.readFileSync(path.join(root, ".next", "server", "app", "_global-error.html"), "utf8");
  assert.doesNotMatch(out, /\sstyle=/);
  assert.match(out, /<html lang="en">/, "lang added for screen readers");
  assert.match(out, /<style>body\{margin:0\}\[data-mmx-ge="mmx-ge0"\]\{font-family:system-ui,"Segoe UI";height:100vh\}\[data-mmx-ge="mmx-ge1"\]\{display:inline-block\}<\/style>/);
  assert.equal((out.match(/ data-mmx-ge="mmx-ge1"/g) || []).length, 2, "identical values share one rule");
  assert.equal((out.match(/\[data-mmx-ge="mmx-ge1"\]/g) || []).length, 1);
  assert.doesNotMatch(r.csp.policy, /'unsafe-hashes'/);
  assert.equal(r.csp.counts.styleHashes, 2, "transformed <style> + original <style> (React re-inserts it after hydration)");
});

// Overlay markup, static guards, bundle budget, generated files and pack contents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderOverlay, esc } from "../overlay.mjs";
import { reference } from "../scripts/write-overlay.mjs";
import { build, CSP } from "../scripts/build-demo.mjs";
import { lint } from "../scripts/lint.mjs";
import { validateIndexFile } from "../scripts/validate-index.mjs";
import { MUMBLES_LINK_OUT, SCOPES } from "../search-core.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(PKG, p), "utf8");

test("overlay.html is the generated reference (in sync with overlay.mjs)", () => {
  assert.equal(read("overlay.html"), reference());
});

test("overlay: one dialog, aria-modal, labelled, scope radios in the defined order, input capped at 128", () => {
  const h = renderOverlay({ site: "moosematrix" });
  assert.equal(h.match(/<dialog\b/g).length, 1);
  assert.match(h, /<dialog class="mm-search" id="mm-search" aria-modal="true" aria-labelledby="mm-search-title"/);
  assert.match(h, /<h2 class="mm-search-title" id="mm-search-title">Search /);
  assert.match(h, /<input id="mm-search-input" type="search" maxlength="128"/);
  assert.match(h, /role="status" aria-live="polite"/);
  const radios = [...h.matchAll(/name="mm-scope" id="mm-scope-([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(radios, ["all", "library", "reading-room", "ctf", "money"]);
  assert.equal((h.match(/type="search"/g) || []).length, 1);
  assert.ok(!/<script|\son[a-z]+=|\sstyle=/i.test(h));
});

test("Moose Mumbles chip: exact allowlisted link-out off mooseman, local radio on mooseman", () => {
  assert.equal(MUMBLES_LINK_OUT, "https://mooseman.moosematrix.com/moose-mumbles/?mm-scope=mumbles");
  for (const site of ["moosematrix", "m2", "merch"]) {
    const h = renderOverlay({ site });
    const links = [...h.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(links, [MUMBLES_LINK_OUT], site);
    assert.ok(!/target=/.test(h));
    assert.ok(h.includes('rel="noreferrer" referrerpolicy="no-referrer"'), site);
    assert.ok(!h.includes('id="mm-scope-mumbles"'));
  }
  const own = renderOverlay({ site: "mooseman" });
  assert.ok(own.includes('id="mm-scope-mumbles"'));
  assert.ok(!own.includes("<a "));
  assert.equal(SCOPES.find((s) => s.id === "mumbles").linkOutUnlessSite, "mooseman");
});

test("'/' shortcut is off by default and opt-in only (WCAG 2.1.4)", () => {
  assert.ok(!renderOverlay({ site: "moosematrix" }).includes("data-mm-slash"));
  assert.ok(!renderOverlay({ site: "moosematrix", slash: "yes" }).includes("data-mm-slash"));
  assert.ok(renderOverlay({ site: "moosematrix", slash: true }).includes('data-mm-slash="on"'));
});

test("renderOverlay rejects unknown sites and non-same-origin index paths; esc escapes", () => {
  assert.throws(() => renderOverlay({ site: "evil" }));
  for (const index of ["https://evil.com/i.json", "//evil.com/i.json", "i.json", "/\\evil.com", 5]) {
    assert.throws(() => renderOverlay({ site: "moosematrix", index }));
  }
  assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

test("static guards: lint is clean on packages/", () => {
  assert.deepEqual(lint(), []);
});

test("static guards catch planted sinks, runtime RegExp, third-party URLs and new-tab links", () => {
  const d = mkdtempSync(join(tmpdir(), "mm-lint-"));
  try {
    const pk = join(d, "search");
    cpSync(PKG, pk, { recursive: true, filter: (s) => !s.includes("node_modules") });
    mkdirSync(join(d, "other"));
    const sinks = [
      "el.innerHTML = x;", "el.outerHTML = x;", "el.insertAdjacentHTML('a', x);", "document.write(x);",
      "eval(x);", "new Function(x);", "setTimeout('x()', 1);", "el.onclick = f;", "el.setAttribute('onclick', x);",
      "range.createContextualFragment(x);", "<div dangerouslySetInnerHTML={{__html:x}} />", "new DOMParser();",
    ];
    sinks.forEach((s, i) => writeFileSync(join(d, "other", `f${i}.${i === 10 ? "tsx" : "js"}`), s + "\n"));
    // Built from parts so this test file does not itself trip the repo-wide new-tab grep in CI.
    const NEW_TAB_CALL = ["window", "open"].join(".") + "(u);";
    writeFileSync(join(pk, "search.js"), read("search.js") + "\nnew RegExp(q);\nObject.assign(a, b);\nconst u = 'https://cdn.example.com/x.js';\n" + NEW_TAB_CALL + "\nlocalStorage.x = 1;\nindexedDB.open(u);\nnew EventSource(u);\n");
    const p = lint({ packagesDir: d, pkgDir: pk });
    assert.equal(p.filter((x) => x.startsWith("other/")).length, sinks.length, p.join("\n"));
    for (const what of ["RegExp built at runtime", "Object.assign", "URL outside the four site origins", "new-tab link", "storage/beacon/other network API"]) {
      assert.ok(p.some((x) => x.startsWith("search/search.js") && x.endsWith(what)), what);
    }
    // localStorage, indexedDB and EventSource are each flagged on their own line
    assert.equal(p.filter((x) => x.startsWith("search/search.js") && x.endsWith("storage/beacon/other network API")).length, 3, p.join("\n"));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("bundle budget: search.js + search-core.mjs + search.css ≤ 15 KB gzipped", () => {
  const gz = ["search.js", "search-core.mjs", "search.css"].reduce((n, f) => n + gzipSync(readFileSync(join(PKG, f)), { level: 9 }).byteLength, 0);
  assert.ok(gz <= 15 * 1024, `${gz} B gz`);
});

test("demo files are up to date and their indexes pass the strict validator", () => {
  for (const [name, text] of Object.entries(build())) assert.equal(read("demo/" + name), text, name);
  assert.ok(validateIndexFile(join(PKG, "demo/search-index.json"), "moosematrix").ok);
  assert.ok(validateIndexFile(join(PKG, "demo/mooseman-index.json"), "mooseman").ok);
  assert.ok(!validateIndexFile(join(PKG, "demo/mooseman-index.json"), "moosematrix").ok);
  assert.ok(!CSP.includes("unsafe-inline") && !CSP.includes("unsafe-eval") && CSP.includes("default-src 'self'"));
  for (const f of ["demo/search-index.json", "demo/mooseman-index.json", "demo/index.html"]) {
    const t = read(f);
    for (const bad of ["NOT FOR INDEX", "private note", "Draft"]) assert.ok(!t.includes(bad), `${f}: ${bad}`);
  }
});

test("build-side validator fails premium items carrying body/body_premium/content/html/tags or a > 160 summary", () => {
  const d = mkdtempSync(join(tmpdir(), "mm-val-"));
  try {
    const base = { id: "p", title: "P", site: "moosematrix", section: "library", type: "note", url: "/p", access: "premium" };
    for (const extra of [{ body: "x" }, { body_premium: "x" }, { content: "x" }, { html: "x" }, { tags: ["x"] }, { summary: "x".repeat(161) }]) {
      const f = join(d, "i.json");
      writeFileSync(f, JSON.stringify({ version: 1, site: "moosematrix", generated: "2026-10-30T12:00:00Z", items: [{ ...base, ...extra }] }));
      assert.equal(validateIndexFile(f, "moosematrix").ok, false, Object.keys(extra)[0]);
    }
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("npm pack ships exactly the declared files (no demo, tests or fixtures)", () => {
  const out = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: PKG, encoding: "utf8" }));
  const files = out[0].files.map((f) => f.path).sort();
  assert.deepEqual(files, [
    "CHANGELOG.md", "README.md", "index.schema.json", "overlay.html", "overlay.mjs", "package.json", "scopes.json",
    "scripts/projection.mjs", "scripts/scan-terms.mjs", "scripts/validate-index.mjs", "search-core.mjs", "search.css", "search.js",
  ]);
});

// F2 theme cookie contract: theme-core.js (and its bundled copies in theme-init.js and nav.js) against a fake
// document with spies. No browser; the browser side is .github/ci-tools/a11y/run-theme.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "../scripts/build.mjs";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(pkg, f), "utf8");
const CORE = read("theme-core.js");
const LIGHT = "mm-theme=light; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";
const DARK = "mm-theme=dark; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";

// A document whose cookie getter returns a fixed string and whose writes are recorded.
function fakeDoc(cookie = "") {
  const calls = { cookieWrites: [], setAttribute: [], removeAttribute: [], dataset: [], meta: [] };
  const dataset = new Proxy({}, { set: (_t, k, v) => (calls.dataset.push([k, v]), true) });
  const root = {
    dataset,
    attrs: {},
    setAttribute(k, v) { calls.setAttribute.push([k, v]); this.attrs[k] = v; },
    removeAttribute(k) { calls.removeAttribute.push(k); delete this.attrs[k]; },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
  };
  const meta = { setAttribute: (k, v) => calls.meta.push([k, v]) };
  const doc = {
    documentElement: root,
    querySelectorAll: (sel) => (sel === 'meta[name="theme-color"]' ? [meta] : []),
    querySelector: () => null,
    get cookie() { return cookie; },
    set cookie(v) { calls.cookieWrites.push(v); },
  };
  return { doc, calls, root };
}
function core() {
  const ctx = createContext({});
  runInContext(CORE, ctx);
  return ctx;
}
function runInit(cookie, pathname = "/") {
  const f = fakeDoc(cookie);
  const ctx = createContext({ document: f.doc, window: { location: { pathname } } });
  runInContext(read("theme-init.js"), ctx);
  return f;
}

test("writer strings are the contract, byte for byte", () => {
  const c = core();
  assert.equal(c.MM_THEME_LIGHT, LIGHT);
  assert.equal(c.MM_THEME_DARK, DARK);
  for (const [mode, want] of [["light", LIGHT], ["dark", DARK]]) {
    const f = fakeDoc("");
    c.mmThemeWrite(f.doc, mode, "/");
    assert.equal(f.calls.cookieWrites.at(-1), want);
  }
  // anything that is not "light" writes dark
  const f = fakeDoc("");
  c.mmThemeWrite(f.doc, "<script>", "/");
  assert.equal(f.calls.cookieWrites.at(-1), DARK);
});

test("reader: only a raw exact light is light", () => {
  const c = core();
  assert.equal(c.mmThemeRead("mm-theme=light"), "light");
  assert.equal(c.mmThemeRead("a=1; mm-theme=light; b=2"), "light");
  const hostile = ["mm-theme=dark", "mm-theme=LIGHT", "mm-theme= light", "mm-theme=light ", "mm-theme=%", "mm-theme=%E0%A4%A",
    "mm-theme=li%67ht", "mm-theme=<script>", "mm-theme=" + "x".repeat(4096), "mm-theme=", "mm-theme=system", "xmm-theme=light",
    "mm-theme-old=light", "mm-themes=light", "", "foo", "mm-theme", "mm-theme=\"light\""];
  for (const v of hostile) assert.equal(c.mmThemeRead(v), "dark", v.slice(0, 40));
  // "light;x=1" as a cookie string: the value is "light" up to the separator, which is the documented rule
  assert.equal(c.mmThemeRead("mm-theme=light;x=1"), "light");
  assert.equal(c.mmThemeRead(undefined), "dark");
  assert.equal(c.mmThemeRead(null), "dark");
});

test("duplicates: any light wins, independent of order; dark+dark is dark", () => {
  const c = core();
  assert.equal(c.mmThemeRead("mm-theme=dark; mm-theme=light"), "light");
  assert.equal(c.mmThemeRead("mm-theme=light; mm-theme=dark"), "light");
  assert.equal(c.mmThemeRead("mm-theme=dark; mm-theme=dark"), "dark");
  assert.equal(c.mmThemeRead("mm-theme=system; mm-theme=light"), "light");
});

test("theme-init: hostile values never throw, never reach the DOM, never get written back", () => {
  const hostile = ["mm-theme=%", "mm-theme=%E0%A4%A", "mm-theme=<script>", "mm-theme=li%67ht", "mm-theme=LIGHT", "mm-theme=" + "%".repeat(4096), "xmm-theme=light", "mm-theme-old=light"];
  for (const v of hostile) {
    const f = runInit(v);
    assert.deepEqual(f.calls.setAttribute, [], v.slice(0, 30));
    assert.deepEqual(f.calls.dataset, []);
    for (const w of f.calls.cookieWrites) {
      assert.match(w, /^mm-theme=; Path=\/[^;]*; Max-Age=0; Secure; SameSite=Lax$/, "only migration deletes");
      assert.ok(!w.includes(v.split("=")[1] || "\u0000") || v.split("=")[1] === "", "value never written back");
    }
  }
});

test("theme-init: light sets only the constant attribute; no write for a single valid value", () => {
  let f = runInit("mm-theme=light");
  assert.deepEqual(f.calls.setAttribute, [["data-theme", "light"]]);
  assert.deepEqual(f.calls.cookieWrites, []);
  f = runInit("mm-theme=dark");
  assert.deepEqual(f.calls.setAttribute, []);
  assert.deepEqual(f.calls.cookieWrites, []);
  f = runInit("");
  assert.deepEqual(f.calls.setAttribute, []);
  assert.deepEqual(f.calls.cookieWrites, [], "no cookie write without user action");
});

test("migration: deletes host-only copies on / and the current path (and its directory) only when needed", () => {
  const c = core();
  for (const cookie of ["mm-theme=dark; mm-theme=light", "mm-theme=system"]) {
    const f = fakeDoc(cookie);
    assert.equal(c.mmThemeMigrate(f.doc, "/research/notes"), true);
    assert.deepEqual(f.calls.cookieWrites, [
      "mm-theme=; Path=/; Max-Age=0; Secure; SameSite=Lax",
      "mm-theme=; Path=/research; Max-Age=0; Secure; SameSite=Lax",
      "mm-theme=; Path=/research/notes; Max-Age=0; Secure; SameSite=Lax",
    ]);
    for (const w of f.calls.cookieWrites) assert.ok(!/Domain/i.test(w), "host-only delete has no Domain");
  }
  const f = fakeDoc("mm-theme=light");
  assert.equal(c.mmThemeMigrate(f.doc, "/x"), false);
  assert.deepEqual(f.calls.cookieWrites, []);
  // a crafted path can't add attributes
  const g = fakeDoc("mm-theme=system");
  c.mmThemeMigrate(g.doc, "/a;Domain=evil.com");
  assert.deepEqual(g.calls.cookieWrites, ["mm-theme=; Path=/; Max-Age=0; Secure; SameSite=Lax"]);
  // theme-init runs the migration
  const h = runInit("mm-theme=system", "/lab/");
  assert.deepEqual(h.calls.cookieWrites.map((w) => w.split(";")[1].trim()), ["Path=/", "Path=/lab", "Path=/lab/"]);
  assert.deepEqual(h.calls.setAttribute, []);
});

test("writer deletes host-only copies first, then writes the domain cookie", () => {
  const c = core();
  const f = fakeDoc("mm-theme=light");
  c.mmThemeWrite(f.doc, "dark", "/about/");
  assert.equal(f.calls.cookieWrites.at(-1), DARK);
  assert.ok(f.calls.cookieWrites.slice(0, -1).every((w) => /Max-Age=0/.test(w) && !/Domain/.test(w)));
});

test("apply: constants only; theme-color literals", () => {
  const c = core();
  const f = fakeDoc("");
  c.mmThemeApply(f.doc, "light");
  assert.deepEqual(f.calls.setAttribute, [["data-theme", "light"]]);
  assert.deepEqual(f.calls.meta, [["content", "#f7f6f3"]]);
  c.mmThemeApply(f.doc, "<x>");
  assert.deepEqual(f.calls.removeAttribute, ["data-theme"]);
  assert.deepEqual(f.calls.meta.at(-1), ["content", "#070b13"]);
  assert.deepEqual(f.calls.dataset, []);
});

test("theme-init.js and nav.js carry exactly the current theme-core.js block", () => {
  for (const f of ["theme-init.js", "nav.js"]) assert.equal(read(f), bundle(read(f)), `${f}: run npm run build`);
  for (const f of ["theme-init.js", "nav.js"]) {
    assert.ok(read(f).includes(LIGHT) && read(f).includes(DARK), `${f} has the writer strings`);
  }
});

test("no decodeURIComponent in theme code; nav.js SSR comment is gone; no dataset writes", () => {
  for (const f of ["theme-core.js", "theme-init.js", "nav.js"]) {
    const s = read(f);
    assert.ok(!/decodeURI|unescape\(/.test(s), f);
    assert.ok(!/\.dataset\b/.test(s), f);
  }
  assert.ok(!/render\s+`?<html data-theme/i.test(read("nav.js")));
  assert.ok(!/on the server/i.test(read("nav.js")));
  assert.ok(!/prefers-color-scheme/.test(read("tokens.css")));
});

test("nav.js: the toggle is the only interactive writer and flips light/dark", () => {
  const f = fakeDoc("");
  let click;
  const btn = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener: (_e, fn) => (click = fn) };
  const group = { hidden: true };
  f.doc.querySelectorAll = (sel) => (sel === "[data-mm-theme-toggle]" ? [btn] : sel === "[data-mm-theme]" ? [group] : sel.includes("theme-color") ? [] : []);
  f.doc.addEventListener = () => {};
  const ctx = createContext({ document: f.doc, window: { location: { pathname: "/", href: "https://moosematrix.com/", host: "moosematrix.com" } }, URL });
  runInContext(read("nav.js"), ctx);
  assert.deepEqual(f.calls.cookieWrites, [], "no write on load");
  assert.equal(group.hidden, false);
  assert.equal(btn.attrs["aria-pressed"], "false");
  click();
  assert.equal(f.calls.cookieWrites.at(-1), LIGHT);
  assert.equal(btn.attrs["aria-pressed"], "true");
  click();
  assert.equal(f.calls.cookieWrites.at(-1), DARK);
  assert.equal(btn.attrs["aria-pressed"], "false");
});

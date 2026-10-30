// theme-init delivery and package contents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(pkg, f), "utf8");
const manifest = JSON.parse(read("hashed/manifest.json"));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

test("hashed theme-init: name carries the first 8 hex of its sha256 and equals theme-init.js", () => {
  const m = manifest.current.match(/^theme-init\.([0-9a-f]{8})\.js$/);
  assert.ok(m, manifest.current);
  const body = readFileSync(join(pkg, "hashed", manifest.current));
  assert.equal(sha256(body).slice(0, 8), m[1]);
  assert.equal(body.toString("utf8"), read("theme-init.js"));
  assert.equal(manifest.version, JSON.parse(read("package.json")).version);
});

test("previous release's hashed file is kept (0.1.1: none, 0.1.0 had no theme-init)", () => {
  if (manifest.version === "0.1.1") assert.equal(manifest.previous, null);
  else {
    assert.ok(manifest.previous && /^theme-init\.[0-9a-f]{8}\.js$/.test(manifest.previous.file), "a later release must name the previous file");
    const body = readFileSync(join(pkg, "hashed", manifest.previous.file));
    assert.equal(sha256(body).slice(0, 8), manifest.previous.file.slice(11, 19));
  }
  const want = ["manifest.json", manifest.current, ...(manifest.previous ? [manifest.previous.file] : [])].sort();
  assert.deepEqual(readdirSync(join(pkg, "hashed")).sort(), want, "hashed/ holds exactly current + previous");
});

test("demo: exactly one theme-init script, first child of <head>, synchronous", () => {
  const html = read("demo/index.html");
  const all = [...html.matchAll(/<script\b[^>]*theme-init[^>]*>/g)];
  assert.equal(all.length, 1);
  const head = html.match(/<head>\s*([\s\S]*?)<\/head>/)[1];
  const first = head.match(/^<[^>]+>/)[0];
  assert.equal(first, `<script src="../hashed/${manifest.current}">`);
  assert.ok(!/\b(async|defer|type=)/.test(first));
  assert.match(html, /<meta name="color-scheme" content="dark">/);
  assert.match(html, /<meta name="theme-color" content="#070b13">/);
  assert.ok(existsSync(join(pkg, "hashed", manifest.current)));
});

const FILES = ["CHANGELOG.md", "README.md", "brand/", "fonts/", "fonts.css", "footer.css", "footer.html", "hashed/", "header.css", "header.html",
  "nav.js", "nav.json", "nav.schema.json", "package.json", "render.mjs", "search.css", "search.html", "search.js", "theme-core.js", "theme-init.js", "theme.css", "tokens.css"];

function pack(dest) {
  const out = execFileSync("npm", ["pack", "--json", "--pack-destination", dest], { cwd: pkg, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out)[0];
}

test("npm pack is reproducible and ships only the files whitelist", () => {
  const a = mkdtempSync(join(tmpdir(), "mm-pack-a-"));
  const b = mkdtempSync(join(tmpdir(), "mm-pack-b-"));
  try {
    const p1 = pack(a);
    const p2 = pack(b);
    const s1 = sha256(readFileSync(join(a, p1.filename)));
    const s2 = sha256(readFileSync(join(b, p2.filename)));
    assert.equal(s1, s2, "same sha256 twice");
    for (const f of p1.files.map((x) => x.path)) {
      assert.ok(FILES.some((w) => (w.endsWith("/") ? f.startsWith(w) : f === w)), `unexpected file in tarball: ${f}`);
      assert.ok(!/^(demo|scripts|tests)\//.test(f), f);
    }
    for (const w of FILES.filter((w) => !w.endsWith("/"))) assert.ok(p1.files.some((x) => x.path === w), `missing ${w}`);
    assert.deepEqual(JSON.parse(read("package.json")).files.concat(["package.json"]).sort(), FILES.slice().sort());
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

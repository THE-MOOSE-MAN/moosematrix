// Self-tests for the privacy scan. Only canary placeholders are used here, never a real term.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { gzipSync, brotliCompressSync, deflateSync, crc32 } from "node:zlib";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BINARY_PROFILES } from "./config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
const SCAN = join(here, "scan.mjs");
const C = "MMCANARY-field-q7z3w";
const C2 = "MMCANARY alpha";

const tmp = () => mkdtempSync(join(tmpdir(), "mm-scan-test-"));
function termsFile(content) {
  const d = tmp();
  const f = join(d, "terms");
  writeFileSync(f, content, { mode: 0o600 });
  return f;
}
const TERMS = termsFile(`${C},${C2}`);
function run(args, terms = TERMS) {
  const r = spawnSync(process.execPath, [SCAN, ...(terms === null ? [] : ["--terms", terms]), ...args], { encoding: "utf8" });
  const all = r.stdout + r.stderr;
  for (const t of [C, C2]) assert.ok(!all.toLowerCase().includes(t.toLowerCase()), "a term was printed");
  return { code: r.status, out: all };
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}
function png(extra = []) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 0;
  const idat = deflateSync(Buffer.from([0, 0]));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), ...extra, chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}
// A directory whose binaries match the fixed "tree" profile exactly.
function treeLike({ pngs = BINARY_PROFILES.tree.png, extraPng } = {}) {
  const d = tmp();
  for (let i = 0; i < pngs; i++) writeFileSync(join(d, `img${i}.png`), i === 0 && extraPng ? extraPng : png([chunk("tEXt", Buffer.from("Software\0test"))]));
  const fonts = join(repo, "packages/tokens/fonts");
  readdirSync(fonts).filter((f) => f.endsWith(".woff2")).forEach((f) => copyFileSync(join(fonts, f), join(d, f)));
  copyFileSync(join(repo, "apps/moosematrix/public/favicon.ico"), join(d, "favicon.ico"));
  writeFileSync(join(d, "readme.md"), "clean text\n");
  return d;
}
function textDir(content, name = "f.txt") {
  const d = tmp();
  writeFileSync(join(d, name), content);
  return d;
}

test("config: the tree profile matches the tracked binaries in this repo", () => {
  const files = execFileSync("git", ["-C", repo, "ls-files", "-z"]).toString().split("\0").filter(Boolean);
  const count = {};
  for (const f of files) {
    const e = f.split(".").pop().toLowerCase();
    if (Object.hasOwn(BINARY_PROFILES.tree, e)) count[e] = (count[e] || 0) + 1;
  }
  assert.deepEqual(count, { ...BINARY_PROFILES.tree });
  assert.ok(Object.isFrozen(BINARY_PROFILES.tree));
});

test("whole tree with canary terms: clean, every file counted", () => {
  const r = run(["--tree", repo]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /ico 1\/1, png 6\/6, woff2 4\/4/);
  assert.match(r.out, /positive control ok/);
});

test("allowlisted binaries are counted and pass when the count matches", () => {
  const r = run(["--dir", treeLike(), "--profile", "tree"]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /binaries actual\/expected: ico 1\/1, png 6\/6, woff2 4\/4/);
});

test("adding or removing one allowlisted binary without a config change fails", () => {
  let r = run(["--dir", treeLike({ pngs: 7 }), "--profile", "tree"]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /binary count mismatch: \.png actual 7, expected 6/);
  r = run(["--dir", treeLike({ pngs: 5 }), "--profile", "tree"]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /\.png actual 5, expected 6/);
  const d = treeLike();
  rmSync(join(d, "favicon.ico"));
  assert.equal(run(["--dir", d, "--profile", "tree"]).code, 2);
});

test("a PNG with the canary in a tEXt / zTXt / iTXt chunk fails", () => {
  const forms = [
    chunk("tEXt", Buffer.from(`Author\0${C}`, "latin1")),
    chunk("zTXt", Buffer.concat([Buffer.from("Author\0\0"), deflateSync(Buffer.from(C))])),
    chunk("iTXt", Buffer.concat([Buffer.from("XML:com.adobe.xmp\0\0\0\0\0"), Buffer.from(`<x:xmpmeta><dc:creator>${C}</dc:creator></x:xmpmeta>`)])),
    chunk("iTXt", Buffer.concat([Buffer.from("Author\0\x01\0en\0\0", "latin1"), deflateSync(Buffer.from(C))])),
  ];
  for (const c of forms) {
    const r = run(["--dir", treeLike({ extraPng: png([c]) }), "--profile", "tree"]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /term #1 in img0\.png:0/);
  }
  // bytes appended after IEND are scanned too
  const r = run(["--dir", treeLike({ extraPng: Buffer.concat([png(), Buffer.from(C)]) }), "--profile", "tree"]);
  assert.equal(r.code, 1);
});

test("an unknown binary type fails, and a malformed allowlisted binary fails closed", () => {
  const d = treeLike();
  writeFileSync(join(d, "blob.bin"), Buffer.from([0xde, 0xad, 0xbe, 0xef, 0xff, 0xfe, 0x00, 0x81]));
  let r = run(["--dir", d, "--profile", "tree"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /term-scan error in blob\.bin/);
  r = run(["--dir", treeLike({ extraPng: Buffer.from("not a png") }), "--profile", "tree"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /term-scan error in img0\.png/);
  r = run(["--dir", treeLike({ extraPng: png().subarray(0, 30) }), "--profile", "tree"]);
  assert.equal(r.code, 2);
});

test("encoded variants are caught", () => {
  const ent = [...C].map((c) => `&#${c.codePointAt(0)};`).join("");
  const hex = [...C].map((c) => `&#x${c.codePointAt(0).toString(16)};`).join("");
  const url = [...C].map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  const uesc = [...C].map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("");
  const b64 = `<img src="data:text/plain;base64,${Buffer.from(`x ${C} y`).toString("base64")}">`;
  const forms = [
    C, C.toLowerCase(), C.toUpperCase(), ent, hex, url, uesc, b64,
    [...C].join("\u200b"), [...C].join("\u00ad"), [...C].join("\u2060"), "\ufeff" + [...C].join("\u200d"),
    C.replace("A", "Á").replace("Y", "Ÿ"), C.replace("a", "a\u0301"),
    C.replace(/A/g, "\u0410").replace(/C/g, "\u0421").replace(/M/g, "\u041c"), // Cyrillic homoglyphs
    C.replace(/a/gi, "\u03b1"), // Greek alpha
    [...C].map((c) => (c >= "!" && c <= "~" ? String.fromCharCode(c.charCodeAt(0) + 0xfee0) : c)).join(""), // fullwidth
    C.replace(/-/g, " "), C.replace(/-/g, "_"), C.replace(/-/g, "."), C.replace(/-/g, "/"), C.replace(/-/g, "+"), C.replace(/-/g, "%20"), C.replace(/-/g, ""),
    `MMCANARY-<b>field</b>-q7z3w`, `MMCA<!-- x -->NARY-field-q7z3w`, `"author": "${C}"`,
  ];
  for (const f of forms) {
    const r = run(["--dir", textDir(`line one\nprefix ${f} suffix\n`), "--profile", "none"]);
    assert.equal(r.code, 1, `not caught: ${JSON.stringify(f).slice(0, 60)}`);
    assert.match(r.out, /term #1 in f\.txt:2/);
  }
  for (const f of ["mmcanary_alpha", "MMCANARY.Alpha", "mmcanaryalpha", "alpha mmcanary", "MMCANARY%20alpha", "mmcanary\nalpha"]) {
    const r = run(["--dir", textDir(`x ${f} y\n`), "--profile", "none"]);
    assert.equal(r.code, 1, f);
    assert.match(r.out, /term #2 in f\.txt/);
  }
  // .gz and .br are decompressed; UTF-16 text is decoded
  const d = tmp();
  writeFileSync(join(d, "a.js.gz"), gzipSync(Buffer.from(`var a="${C}"`)));
  writeFileSync(join(d, "b.js.br"), brotliCompressSync(Buffer.from(`var b="${C}"`)));
  writeFileSync(join(d, "c.txt"), Buffer.concat([Buffer.from("plain\n"), Buffer.from(`tail ${C}\n`, "utf16le")]));
  writeFileSync(join(d, "d.txt"), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`bom ${C}`, "utf16le")]));
  const r = run(["--dir", d, "--profile", "none"]);
  assert.equal(r.code, 1);
  for (const f of ["a.js", "b.js", "c.txt", "d.txt"]) assert.match(r.out, new RegExp(`term #1 in ${f.replace(".", "\\.")}:`));
});

test("clean text is not flagged", () => {
  const r = run(["--dir", textDir("MMCANARY-field-other and canary field alone\n"), "--profile", "none"]);
  assert.equal(r.code, 0, r.out);
});

test("a path that matches is reported without printing the path", () => {
  const d = tmp();
  writeFileSync(join(d, `${C}.md`), "clean\n");
  const r = run(["--dir", d, "--profile", "none"]);
  assert.equal(r.code, 1);
  assert.match(r.out, /term #1 in \[path withheld: file #1 in list order\]:0/);
});

test("fail closed: empty terms, missing terms, 0 files, forced crash, unknown profile", () => {
  const clean = textDir("ok\n");
  for (const t of [termsFile(""), termsFile(" , \n"), join(tmp(), "missing"), null]) {
    const r = run(["--dir", clean, "--profile", "none"], t);
    assert.equal(r.code, 2);
    assert.match(r.out, /DENYLIST NOT RUN – secret missing/);
  }
  assert.equal(run(["--dir", clean, "--profile", "none"], termsFile("ab")).code, 2, "too-short term");
  let r = run(["--dir", tmp(), "--profile", "none"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /0 files scanned/);
  r = run(["--dir", clean, "--profile", "none", "--test-crash"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /crashed \(fail closed\)/);
  assert.equal(run(["--dir", clean]).code, 2, "dir needs a profile");
  assert.equal(run(["--dir", clean, "--profile", "nope"]).code, 2);
  assert.equal(run(["--tarball", join(tmp(), "none.tgz"), "--profile", "none"]).code, 2);
});

test("tarball mode scans every entry", () => {
  const d = tmp();
  mkdirSync(join(d, "package"));
  writeFileSync(join(d, "package", "a.txt"), "ok\n");
  writeFileSync(join(d, "package", "b.css"), `/* ${C} */\n`);
  const tgz = join(d, "p.tgz");
  execFileSync("tar", ["czf", tgz, "-C", d, "package"]);
  const r = run(["--tarball", tgz, "--profile", "none"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /term #1 in package\/b\.css:1/);
});

test("nav canary fixture: a mooseman-row label with the canary fails the scan of the rendered nav", async () => {
  const { renderHeader, renderFooter, SITES } = await import("../../../packages/tokens/render.mjs");
  const nav = JSON.parse(readFileSync(join(repo, "packages/tokens/nav.json"), "utf8"));
  // the real nav renders clean for every site
  const clean = tmp();
  for (const s of SITES) writeFileSync(join(clean, `header-${s}.html`), renderHeader({ site: s }));
  writeFileSync(join(clean, "footer.html"), renderFooter());
  writeFileSync(join(clean, "nav.json"), JSON.stringify(nav));
  assert.equal(run(["--dir", clean, "--profile", "none"]).code, 0);
  // the fixture fails
  const bad = structuredClone(nav);
  bad.siteRows.mooseman.label = `Posts by ${C}`;
  const d = tmp();
  writeFileSync(join(d, "header-mooseman.html"), renderHeader({ site: "mooseman", nav: bad }));
  writeFileSync(join(d, "nav.json"), JSON.stringify(bad));
  const r = run(["--dir", d, "--profile", "none"]);
  assert.equal(r.code, 1);
  assert.match(r.out, /term #1 in header-mooseman\.html:\d+/);
  assert.match(r.out, /term #1 in nav\.json:1/);
});

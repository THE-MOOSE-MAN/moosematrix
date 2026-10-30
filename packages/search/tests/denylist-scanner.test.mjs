// Name-denylist matcher (encoded variants, positive control, fail closed),
// with posts A–D carrying canary placeholders only (never a real name).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { NOT_RUN, loadTerms, matchText, compileTerms, scanPaths, positiveControl, formatHit, main } from "../scripts/scan-terms.mjs";
import { buildIndex } from "../scripts/projection.mjs";
import { canary, rec, NOW } from "./fixtures/corpus.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SCAN = join(PKG, "scripts", "scan-terms.mjs");

function tmp() {
  const d = mkdtempSync(join(tmpdir(), "mm-scan-test-"));
  return { d, done: () => rmSync(d, { recursive: true, force: true }) };
}
const run = (argv, env = {}) => {
  const out = [];
  const err = [];
  const code = main(argv, env, (s) => out.push(s), (s) => err.push(s));
  return { code, out: out.join("\n"), err: err.join("\n") };
};

// Two-word canary so separator/joined forms are meaningful.
const first = canary("first").toLowerCase().replace(/-/g, "");
const last = canary("last").toLowerCase().replace(/-/g, "");
const TWO = `${first} ${last}`;
const ONE = canary("one");
const TERMS = [ONE, TWO];

test("terms: missing or empty term list → DENYLIST NOT RUN, exit 2", () => {
  const { d, done } = tmp();
  try {
    writeFileSync(join(d, "a.txt"), "x");
    for (const env of [{}, { REGISTRY_DENYLIST: "" }, { REGISTRY_DENYLIST: " ,\n , " }]) {
      const r = run([d], env);
      assert.equal(r.code, 2);
      assert.equal(r.err, NOT_RUN);
    }
    assert.throws(() => loadTerms(undefined), { message: NOT_RUN });
  } finally { done(); }
});

test("fail closed: 0 files, missing path, empty dir, unreadable file, forced crash → exit 2", () => {
  const { d, done } = tmp();
  try {
    const env = { REGISTRY_DENYLIST: TERMS.join("\n") };
    assert.equal(run([], env).code, 2);
    assert.equal(run([join(d, "missing")], env).code, 2);
    mkdirSync(join(d, "empty"));
    assert.equal(run([join(d, "empty")], env).code, 2);
    writeFileSync(join(d, "bad.gz"), "not gzip");
    assert.equal(run([join(d, "bad.gz")], env).code, 2);
    writeFileSync(join(d, "ok.txt"), "x");
    assert.throws(() => scanPaths([join(d, "ok.txt")], TERMS, { readFile: () => { throw new Error("boom"); } }));
    // errors never echo a term
    for (const r of [run([join(d, "missing")], env), run([join(d, "bad.gz")], env)]) {
      assert.ok(!r.err.includes(ONE) && !r.err.includes(first));
    }
  } finally { done(); }
});

test("positive control: planted encoded + gzipped copy of term #1 is found", () => {
  assert.equal(positiveControl(TERMS), true);
  assert.equal(positiveControl([TWO, ONE]), true);
});

test("encoded variants are all caught", () => {
  const c = compileTerms(TERMS);
  const ent = [...ONE].map((ch) => "&#x" + ch.codePointAt(0).toString(16) + ";").join("");
  const variants = {
    plain: ONE,
    entityHex: ent,
    entityDec: [...ONE].map((ch) => "&#" + ch.codePointAt(0) + ";").join(""),
    url: encodeURIComponent(ONE).replace(/[A-Za-z0-9]/g, (ch) => "%" + ch.charCodeAt(0).toString(16)),
    uEscape: [...ONE].map((ch) => "\\u" + ch.codePointAt(0).toString(16).padStart(4, "0")).join(""),
    zeroWidth: [...ONE].join("\u200b"),
    wordJoiner: [...ONE].join("\u2060"),
    softHyphen: [...ONE].join("\u00ad"),
    softHyphenEntity: [...ONE].join("&shy;"),
    diacritic: [...ONE].map((ch) => ch + "\u0301").join(""),
    upper: ONE.toUpperCase(),
    fullwidth: [...ONE].map((ch) => (ch >= "!" && ch <= "~" ? String.fromCodePoint(ch.codePointAt(0) + 0xfee0) : ch)).join(""),
    homoglyph: ONE.replace(/a/g, "а").replace(/e/g, "е").replace(/c/g, "с").replace(/o/g, "о").replace("M", "М"),
    tagSplit: ONE.slice(0, 4) + "<b>" + ONE.slice(4) + "</b>",
    comment: ONE.slice(0, 4) + "<!-- x -->" + ONE.slice(4),
    dataB64: "data:text/plain;base64," + Buffer.from(ONE).toString("base64"),
    jsonEscaped: JSON.stringify(ONE).replace(/[a-z]/g, (ch) => "\\u00" + ch.charCodeAt(0).toString(16)),
  };
  for (const [name, text] of Object.entries(variants)) assert.ok(matchText(`x ${text} y`, c).has(1), name);
  for (const sep of [" ", "-", "_", ".", "/", "+", "%20", "", "&nbsp;"]) {
    assert.ok(matchText(`by ${first}${sep}${last}!`, c).has(2), `separator ${JSON.stringify(sep)}`);
  }
  assert.ok(matchText(`${first.toUpperCase()}-${last}`, c).has(2));
  assert.equal(matchText("nothing to see " + first, c).size, 0);
});

test("compressed and packaged forms: .gz, .br, .tgz, .map sourcesContent, file names, symlinks", () => {
  const { d, done } = tmp();
  try {
    writeFileSync(join(d, "a.html.gz"), gzipSync(Buffer.from("<p>" + ONE + "</p>")));
    writeFileSync(join(d, "b.js.br"), brotliCompressSync(Buffer.from("x='" + TWO.replace(" ", "_") + "'")));
    writeFileSync(join(d, "c.js.map"), JSON.stringify({ version: 3, sources: ["x"], sourcesContent: ["// " + JSON.stringify(ONE).slice(1, -1).replace(/[a-z]/g, (ch) => "\\u00" + ch.charCodeAt(0).toString(16))] }));
    mkdirSync(join(d, "pkg"));
    writeFileSync(join(d, "pkg", "inner.txt"), "zero\u200bwidth " + ONE);
    execFileSync("tar", ["-czf", join(d, "p.tgz"), "-C", d, "pkg"]);
    rmSync(join(d, "pkg"), { recursive: true });
    writeFileSync(join(d, ONE + ".txt"), "clean");
    symlinkSync("/" + ONE, join(d, "link"));
    const r = scanPaths([d], TERMS);
    const where = r.hits.map(formatHit);
    for (const want of [/a\.html\(gz\)/, /b\.js\(br\)/, /c\.js\.map/, /p\.tgz!pkg\/inner\.txt/, /\.txt$/, /link\(symlink\)/]) {
      assert.ok(where.some((w) => want.test(w)), `missing ${want}: ${where.join(" | ")}`);
    }
  } finally { done(); }
});

test("output is only 'term #n in path:line' plus counts; terms are never printed", () => {
  const { d, done } = tmp();
  try {
    writeFileSync(join(d, "x.html"), "line1\nline2 " + ONE + "\n");
    const r = run([d], { REGISTRY_DENYLIST: TERMS.join(",") });
    assert.equal(r.code, 1);
    assert.match(r.err, /^term #1 in .*x\.html:2$/);
    assert.match(r.out, /^denylist: 2 term\(s\), 1 file\(s\), \d+ byte\(s\) scanned, 1 hit\(s\); positive control ok$/);
    for (const t of [ONE, first, last]) assert.ok(!(r.out + r.err).includes(t));
    // clean dir → 0
    writeFileSync(join(d, "x.html"), "clean");
    assert.equal(run([d], { REGISTRY_DENYLIST: TERMS.join(",") }).code, 0);
    // --terms-file works the same
    const tf = join(d, "..", "mm-terms-" + process.pid);
    writeFileSync(tf, TERMS.join("\n"), { mode: 0o600 });
    try { assert.equal(run(["--terms-file", tf, d], {}).code, 0); } finally { rmSync(tf, { force: true }); }
  } finally { done(); }
});

test("CLI process exit codes: 2 without terms, 0 clean, 1 on a hit", () => {
  const { d, done } = tmp();
  try {
    writeFileSync(join(d, "a.txt"), "clean");
    const env = { PATH: process.env.PATH };
    let p = spawnSync(process.execPath, [SCAN, d], { env, encoding: "utf8" });
    assert.equal(p.status, 2);
    assert.match(p.stderr, /DENYLIST NOT RUN – secret missing/);
    p = spawnSync(process.execPath, [SCAN, d], { env: { ...env, REGISTRY_DENYLIST: ONE }, encoding: "utf8" });
    assert.equal(p.status, 0);
    writeFileSync(join(d, "b.txt"), ONE);
    p = spawnSync(process.execPath, [SCAN, d], { env: { ...env, REGISTRY_DENYLIST: ONE }, encoding: "utf8" });
    assert.equal(p.status, 1);
  } finally { done(); }
});

test("a canary planted inside packages/search/ is caught (exemption is not path-based)", () => {
  const f = join(PKG, "tests", "fixtures", `planted-${process.pid}.txt`);
  writeFileSync(f, "x " + ONE);
  try {
    const r = scanPaths([PKG], [ONE]);
    assert.ok(r.hits.some((h) => h.path === f));
    assert.ok(r.files > 10);
  } finally { rmSync(f, { force: true }); }
});

test("package sources, search.js and the built demo carry no fixture canary", () => {
  const r = scanPaths([PKG], TERMS);
  assert.deepEqual(r.hits, []);
});

test("posts A–D: no mooseman item in any other site's index; canaries absent; clean items still present", () => {
  const A = { title: canary("a-title"), teaser: canary("a-teaser"), id: canary("a-id").toLowerCase(), slug: canary("a-slug"), author: canary("a-author"), label: canary("a-label"), alt: canary("a-alt") };
  const B = { author: canary("b-author"), body: canary("b-body"), id: canary("b-id").toLowerCase(), slug: canary("b-slug"), label: canary("b-label"), alt: canary("b-alt") };
  const D = { slug: canary("d-slug") };
  const base = { site: "mooseman", section: "mumbles", type: "post" };
  const url = (slug) => `https://mooseman.moosematrix.com/moose-mumbles/${slug}/`;
  const records = [
    rec({ ...base, id: A.id, title: A.title, summary: A.teaser, url: url(A.slug), author: A.author, label: A.label, alt: A.alt }),
    rec({ ...base, id: B.id, title: "Clean title B", summary: "Clean teaser B", url: url(B.slug), author: B.author, body: B.body, label: B.label, alt: B.alt }),
    rec({ ...base, id: "post-c", title: "Clean title C", summary: "Clean teaser C", url: url("post-c") }),
    rec({ ...base, id: "post-d", title: "Clean title D", summary: "Clean teaser D", url: url(D.slug) }),
    rec({ id: "lib-clean", title: "Library clean" }),
  ];
  const all = [...Object.values(A), ...Object.values(B), ...Object.values(D)];
  const { d, done } = tmp();
  try {
    for (const site of ["moosematrix", "m2", "merch"]) {
      const env = buildIndex(records.map((r) => (site === "m2" && r.id === "lib-clean" ? { ...r, site: "m2", section: "money", url: "/tools/x/" } : site === "merch" && r.id === "lib-clean" ? { ...r, site: "merch", section: "shop", url: "/shop/x/" } : r)), { site, now: NOW });
      assert.deepEqual(env.items.map((i) => i.id), ["lib-clean"], site); // C and every other mooseman item absent; clean item present
      writeFileSync(join(d, site + "-index.json"), JSON.stringify(env));
    }
    const hits = scanPaths([d], all).hits;
    assert.deepEqual(hits, []);
    const own = buildIndex(records, { site: "mooseman", now: NOW });
    assert.deepEqual(own.items.map((i) => i.id), [A.id, B.id, "post-c", "post-d"]);
    const ownText = JSON.stringify(own);
    for (const v of [A.author, A.label, A.alt, B.author, B.body, B.label, B.alt]) assert.ok(!ownText.includes(v), "non-allowlisted field projected");
    for (const it of own.items) for (const k of ["author", "byline", "by", "creator", "body"]) assert.ok(!(k in it));
  } finally { done(); }
});

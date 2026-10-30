#!/usr/bin/env node
// Privacy scan (card §F6-X b/c/d, §T1). Fails closed.
//
//   node scan.mjs --terms <file> --tree [<repo>]                    every `git ls-files` file
//   node scan.mjs --terms <file> --tarball <x.tgz> --profile <p>    every file in an npm pack tarball
//   node scan.mjs --terms <file> --dir <path> --profile <p>         every file under a directory
//
// <file> holds the terms, comma- and/or newline-separated (CI writes the REGISTRY_DENYLIST secret there
// under umask 077). Terms are never printed: a hit is "term #n in <path>:<line>" (line 0 = file name or
// binary metadata). If a path itself matches, it is withheld and shown as its index in the file list.
//
// Exit 0: clean. Exit 1: hits. Exit 2: did not run cleanly (missing/empty terms, 0 files, unreadable or
// undecodable file, unknown binary, binary count different from config.mjs, extractor error, failed
// positive control, crash). Every run first plants each term and a random canary in a temp file and
// must find them (positive control).
import { readFileSync, readdirSync, readlinkSync, lstatSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { BINARY_PROFILES, EXTRACTORS, CONTAINERS } from "./config.mjs";
import { extract } from "./extract.mjs";
import { compileTerms, matchText } from "./matcher.mjs";

class ScanError extends Error {}
const fail = (msg) => { console.error(msg); process.exit(2); };
process.on("uncaughtException", () => fail("privacy-scan: crashed (fail closed)"));
process.on("unhandledRejection", () => fail("privacy-scan: crashed (fail closed)"));

function parseArgs(argv) {
  const a = { mode: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) fail(`privacy-scan: ${k} needs a value`); return v; };
    if (k === "--terms") a.terms = next();
    else if (k === "--profile") a.profile = next();
    else if (k === "--tree") { a.mode = "tree"; a.target = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "."; }
    else if (k === "--tarball") { a.mode = "tarball"; a.target = next(); }
    else if (k === "--dir") { a.mode = "dir"; a.target = next(); }
    else if (k === "--test-crash") a.crash = true; // test hook: proves a crash fails the gate
    else fail(`privacy-scan: unknown argument ${k}`);
  }
  if (!a.mode) fail("privacy-scan: give --tree, --tarball or --dir");
  if (!a.profile) a.profile = a.mode === "tree" ? "tree" : null;
  if (!a.profile || !Object.hasOwn(BINARY_PROFILES, a.profile)) fail("privacy-scan: --profile must be one of " + Object.keys(BINARY_PROFILES).join(", "));
  return a;
}

function loadTerms(file) {
  let raw;
  try { raw = file ? readFileSync(file, "utf8") : ""; } catch { raw = ""; }
  const terms = raw.split(/[,\n\r]+/).map((t) => t.trim()).filter(Boolean);
  if (!terms.length) fail("DENYLIST NOT RUN – secret missing");
  try { return { count: terms.length, terms, compiled: compileTerms(terms) }; } catch (e) { fail(`DENYLIST NOT RUN – ${e.message}`); }
}

const utf8 = new TextDecoder("utf-8", { fatal: true });
const ext = (p) => { const b = p.split("/").pop(); const i = b.lastIndexOf("."); return i > 0 ? b.slice(i + 1).toLowerCase() : ""; };
const swap16 = (b) => { const c = Buffer.from(b.subarray(0, b.length & ~1)); c.swap16(); return c; };

// The strings to match for one text buffer: UTF-8, NUL-stripped (UTF-16 ASCII), UTF-16LE/BE at both alignments.
function textViews(buf, strict) {
  let s;
  if (buf[0] === 0xff && buf[1] === 0xfe) s = buf.subarray(2).toString("utf16le");
  else if (buf[0] === 0xfe && buf[1] === 0xff) s = swap16(buf.subarray(2)).toString("utf16le");
  else {
    try { s = utf8.decode(buf); } catch { if (strict) return null; s = buf.toString("latin1"); }
  }
  const out = [s];
  if (s.includes("\u0000")) out.push(s.replace(/\u0000/g, ""));
  if (buf.includes(0)) {
    for (const off of [0, 1]) {
      const b = buf.subarray(off);
      out.push(b.subarray(0, b.length & ~1).toString("utf16le"), swap16(b).toString("utf16le"));
    }
  }
  return out;
}

function scanStrings(strings, state, label, withLines) {
  for (const s of strings) {
    const lines = withLines ? s.split("\n") : [s];
    const lineHits = new Set();
    lines.forEach((line, n) => {
      for (const t of matchText(line, state.terms.compiled)) {
        lineHits.add(t);
        state.report(t, label, withLines ? n + 1 : 0);
      }
    });
    if (withLines) for (const t of matchText(s, state.terms.compiled)) if (!lineHits.has(t)) state.report(t, label, 0); // split across lines
  }
}

function scanBuffer(path, buf, state, depth = 0) {
  state.files++;
  state.bytes += buf.length;
  const label = state.label(path);
  const e = ext(path);
  if (Object.hasOwn(CONTAINERS, e) && depth < 3) {
    const inner = CONTAINERS[e] === "gzip" ? gunzipSync(buf) : brotliDecompressSync(buf);
    state.files--; // the container is not a file of its own
    return scanBuffer(path.slice(0, -(e.length + 1)), inner, state, depth + 1);
  }
  if (Object.hasOwn(state.profile, e)) {
    state.census[e] = (state.census[e] || 0) + 1;
    const parts = EXTRACTORS[e] ? extract(EXTRACTORS[e], buf) : [];
    for (const p of parts) scanStrings([p.toString("utf8"), p.toString("latin1"), p.toString("utf16le"), swap16(p).toString("utf16le")], state, label, false);
    return;
  }
  const v = textViews(buf, true);
  if (!v) throw new ScanError(`unknown binary${e ? ` (.${e})` : ""} not in config.mjs`);
  scanStrings(v, state, label, true);
}

function newState(terms, profile, paths) {
  const state = {
    terms, profile: BINARY_PROFILES[profile], profileName: profile, files: 0, bytes: 0, census: {}, hits: 0, errors: 0, seen: new Set(), withheld: new Map(),
    report(t, label, line) {
      const key = `${t}|${label}|${line}`;
      if (this.seen.has(key)) return;
      this.seen.add(key);
      this.hits++;
      if (!this.quiet) console.log(`term #${t + 1} in ${label}:${line}`);
    },
    label(p) { return this.withheld.get(p) ?? p; },
  };
  // a path that itself matches a term is never printed
  paths.forEach((p, i) => {
    const hits = matchText(p, terms.compiled);
    if (hits.length) {
      const l = `[path withheld: file #${i + 1} in list order]`;
      state.withheld.set(p, l);
      for (const t of hits) state.report(t, l, 0);
    }
  });
  return state;
}

function runOne(state, path, read) {
  try {
    scanBuffer(path, read(), state);
  } catch {
    state.errors++;
    console.error(`term-scan error in ${state.label(path)}`);
  }
}

function listTree(root) {
  const out = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached"], { maxBuffer: 1 << 28 });
  return out.toString("utf8").split("\0").filter(Boolean);
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) throw new ScanError(`symlink ${relative(base, p)}`);
    if (st.isDirectory()) walk(p, base, out);
    else if (st.isFile()) out.push(relative(base, p).split(sep).join("/"));
    else throw new ScanError(`special file ${relative(base, p)}`);
  }
  return out;
}

function untar(tgz) {
  const buf = gunzipSync(readFileSync(tgz));
  const files = [];
  let off = 0;
  let pax = null;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a, b) => h.toString("utf8", a, b).replace(/\0.*$/s, "");
    const size = parseInt(str(124, 136).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(345, 500);
    let name = (prefix ? prefix + "/" : "") + str(0, 100);
    const body = buf.subarray(off + 512, off + 512 + size);
    if (body.length !== size) throw new ScanError("truncated tarball");
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === "x") { pax = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(body.toString("utf8"))?.[1] ?? null; continue; }
    if (type === "g") continue;
    if (type === "5") { pax = null; continue; }
    if (type !== "0" && type !== "\0") throw new ScanError(`tar entry type ${type}`);
    if (pax) { name = pax; pax = null; }
    files.push({ name, body });
  }
  return files;
}

function positiveControl(terms) {
  // Each real term, plainly and encoded, plus a random canary, written to a 0600 temp file and scanned
  // through the same file path as real files. Nothing about the terms is printed.
  const canary = `MMCANARY-control-${randomBytes(6).toString("hex")}`;
  const ctrl = { count: terms.count + 1, terms: [...terms.terms, canary], compiled: compileTerms([...terms.terms, canary]) };
  const dir = mkdtempSync(join(tmpdir(), "mm-pc-"));
  try {
    const entity = (t) => [...t].map((c) => `&#x${c.codePointAt(0).toString(16)};`).join("");
    const zw = (t) => [...t].join("\u200b");
    ctrl.terms.forEach((t, i) => {
      for (const form of [t, entity(t), encodeURIComponent(t), zw(t), t.toUpperCase()]) {
        const f = join(dir, "control.txt");
        writeFileSync(f, `x\n${form}\ny\n`, { mode: 0o600 });
        const st = newState(ctrl, "none", []);
        st.quiet = true;
        scanBuffer("control.txt", readFileSync(f), st);
        if (![...st.seen].some((k) => k.startsWith(`${i}|`))) fail(`positive control failed for ${i < terms.count ? `term #${i + 1}` : "the canary"} (fail closed)`);
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return ctrl.count;
}

const args = parseArgs(process.argv.slice(2));
const terms = loadTerms(args.terms);
const controls = positiveControl(terms);

let items;
try {
  if (args.mode === "tree") {
    const root = args.target;
    // a tracked symlink is scanned as its link text (what git stores), never followed
    items = listTree(root).map((p) => ({ path: p, read: () => (lstatSync(join(root, p)).isSymbolicLink() ? Buffer.from(readlinkSync(join(root, p))) : readFileSync(join(root, p))) }));
  } else if (args.mode === "dir") {
    items = walk(args.target).map((p) => ({ path: p, read: () => readFileSync(join(args.target, p)) }));
  } else {
    items = untar(args.target).map((f) => ({ path: f.name, read: () => f.body }));
  }
} catch (e) {
  fail(`term-scan error in ${args.mode} listing (fail closed)`);
}
if (!items.length) fail("privacy-scan: 0 files scanned (fail closed)");

const state = newState(terms, args.profile, items.map((i) => i.path));
for (const it of items) {
  if (args.crash) throw new Error("forced crash");
  runOne(state, it.path, it.read);
}

const exts = [...new Set([...Object.keys(state.profile), ...Object.keys(state.census)])].sort();
let censusOk = true;
const census = exts.map((e) => {
  const a = state.census[e] || 0, x = state.profile[e] || 0;
  if (a !== x) censusOk = false;
  return `${e} ${a}/${x}`;
});
console.log(`privacy-scan: ${args.mode}, profile ${args.profileName ?? args.profile}, files ${state.files}, bytes ${state.bytes}, terms ${terms.count}, positive control ok (${controls}), binaries actual/expected: ${census.join(", ") || "none"}`);
if (!censusOk) {
  for (const e of exts) if ((state.census[e] || 0) !== (state.profile[e] || 0)) console.error(`binary count mismatch: .${e} actual ${state.census[e] || 0}, expected ${state.profile[e] || 0} (update config.mjs in a reviewed change)`);
}
if (state.errors || !censusOk || state.files === 0) fail(`privacy-scan: FAILED CLOSED (${state.errors} error(s)${censusOk ? "" : ", binary count mismatch"})`);
if (state.hits) { console.error(`privacy-scan: ${state.hits} hit(s)`); process.exit(1); }
console.log("privacy-scan: 0 hits");

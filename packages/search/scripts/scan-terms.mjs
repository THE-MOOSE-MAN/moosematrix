#!/usr/bin/env node
// @moosematrix/search 0.1.0 — name-denylist matcher for shared-package output.
//
// Scans every file it is given (no diff, no path exemptions) after normalising
// text and terms the same way: entity / URL / \uXXXX / base64-in-data: decoding,
// tag stripping, NFKC, case-fold, confusable folding, zero-width + soft-hyphen
// stripping and diacritic removal. Multi-part terms also match their separator
// and joined forms. .gz, .br, .tgz/.tar entries and *.map sourcesContent are
// expanded before matching.
//
// Fails closed: missing/empty term list, 0 files scanned, any unreadable or
// undecodable file, or any crash → exit 2. Every run first proves itself on a
// planted, encoded copy of term #1 (positive control) and fails if it misses.
//
// Terms never leave this process: output is "term #n in <path>:<line>" and
// counts only. Terms come from REGISTRY_DENYLIST (env) or --terms-file.
import { lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, brotliDecompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

export const NOT_RUN = "DENYLIST NOT RUN – secret missing";
const MAX_EXPANDED = 256 * 1024 * 1024; // decompression-bomb cap per file

// ---------------------------------------------------------------- terms
export function loadTerms(raw) {
  if (typeof raw !== "string") throw new Error(NOT_RUN);
  const terms = raw.split(/[\n,]/).map((t) => t.trim()).filter(Boolean);
  if (!terms.length) throw new Error(NOT_RUN);
  return terms;
}

// ---------------------------------------------------------------- normalise
const ZERO_WIDTH = /[\u200b-\u200d\u2060\ufeff\u00ad\u180e\u034f]/g;
const MARKS = /\p{M}/gu;
// Confusables skeleton (subset of Unicode TR39 for Latin lookalikes in
// Cyrillic, Greek and other scripts; fullwidth etc. are folded by NFKC).
const CONFUSABLE = new Map(Object.entries({
  "а": "a", "в": "b", "е": "e", "ё": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "і": "i", "ї": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ӏ": "l", "к": "k", "м": "m",
  "н": "h", "т": "t", "ԛ": "q", "ԝ": "w", "ɡ": "g", "ı": "i", "ȷ": "j", "ⅼ": "l",
  "α": "a", "β": "b", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p",
  "τ": "t", "υ": "u", "χ": "x", "ϲ": "c", "ϳ": "j", "ս": "u", "օ": "o", "ց": "g",
}));
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "\u00ad", zwj: "", zwnj: "", hyphen: "-", period: ".", lowbar: "_", sol: "/", plus: "+" };

function decodeEntities(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z]{2,8});?/g, (m, body) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    const v = NAMED[body.toLowerCase()];
    return v === undefined ? m : v;
  });
}
function decodeUnicodeEscapes(s) {
  return s.replace(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g, (m, a, b, c) => {
    const cp = parseInt(a || b || c, 16);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  });
}
function decodePercent(s) {
  return s.replace(/(?:%[0-9a-fA-F]{2})+/g, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
  });
}
function decodeDataBase64(s) {
  let extra = "";
  for (const m of s.matchAll(/data:[^,;\s"']*;base64,([A-Za-z0-9+/=]{4,})/g)) {
    extra += "\n" + Buffer.from(m[1], "base64").toString("utf8");
  }
  return extra ? s + extra : s;
}
export function skeleton(s) {
  let t = s.normalize("NFKC").toLowerCase().replace(ZERO_WIDTH, "");
  t = t.normalize("NFD").replace(MARKS, "");
  let out = "";
  for (const ch of t) out += CONFUSABLE.get(ch) ?? ch;
  return out.normalize("NFKC").replace(/\s+/g, " ");
}
// Linear comment stripping (indexOf, no backtracking); an unclosed comment
// runs to the end of the text, as in HTML.
function stripComments(s) {
  let out = "";
  let at = 0;
  for (;;) {
    const a = s.indexOf("<!--", at);
    if (a < 0) return out + s.slice(at);
    out += s.slice(at, a);
    const b = s.indexOf("-->", a + 4);
    if (b < 0) return out;
    at = b + 3;
  }
}
/** Returns the normalised variants of a text that are matched. */
export function variants(text) {
  let d = text;
  for (let i = 0; i < 2; i++) d = decodePercent(decodeUnicodeEscapes(decodeEntities(d)));
  d = decodeDataBase64(d);
  const noTags = stripComments(d).replace(/<\/?[a-zA-Z][^<>]*>/g, "");
  return [skeleton(d), skeleton(noTags)];
}

const SEPARATORS = [" ", "-", "_", ".", "/", "+", ""];
export function compileTerms(terms) {
  return terms.map((term, i) => {
    const parts = skeleton(term).split(/[\s\-_./+]+/).filter(Boolean);
    const forms = new Set(parts.length > 1 ? SEPARATORS.map((sep) => parts.join(sep)) : parts);
    return { n: i + 1, forms: [...forms] };
  });
}
export function matchText(text, compiled) {
  const hit = new Set();
  for (const v of variants(text)) {
    for (const t of compiled) if (!hit.has(t.n) && t.forms.some((f) => v.includes(f))) hit.add(t.n);
  }
  return hit;
}

// ---------------------------------------------------------------- files
function readTar(buf, label, emit) {
  let off = 0;
  let longName = null;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a, b) => h.subarray(a, b).toString("utf8").replace(/\0.*$/s, "");
    let name = str(0, 100);
    const prefix = str(345, 500);
    if (prefix) name = prefix + "/" + name;
    const size = parseInt(str(124, 136).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    if (!Number.isFinite(size) || size < 0) throw new Error("bad tar header");
    const body = buf.subarray(off + 512, off + 512 + size);
    if (type === "L") longName = body.toString("utf8").replace(/\0.*$/s, "");
    else {
      const entry = longName || name;
      longName = null;
      if (type === "0" || type === "\0" || type === "7") emit(label + "!" + entry, Buffer.from(body));
      else if (type === "x" || type === "g") emit(label + "!" + entry + "(pax)", Buffer.from(body));
      else if (type === "2" || type === "1") emit(label + "!" + entry + "(link)", Buffer.from(str(157, 257)));
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
}

function decodeText(buf) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return buf.toString("latin1"); // binary: metadata chunks are latin1/ASCII
  }
}

/**
 * Scans files/directories. Throws (fail closed) on unreadable input or when
 * nothing was scanned. Returns { files, bytes, hits: [{ n, path, line }] }.
 */
export function scanPaths(paths, terms, { readFile = readFileSync } = {}) {
  const compiled = compileTerms(terms);
  const stats = { files: 0, bytes: 0, hits: [] };

  const scanBuffer = (label, buf, depth = 0) => {
    if (depth > 4) throw new Error("nesting too deep: " + label);
    const lower = label.toLowerCase();
    if (lower.endsWith(".tgz") || lower.endsWith(".tar.gz")) {
      return readTar(gunzipSync(buf, { maxOutputLength: MAX_EXPANDED }), label, (p, b) => scanBuffer(p, b, depth + 1));
    }
    if (lower.endsWith(".tar")) return readTar(buf, label, (p, b) => scanBuffer(p, b, depth + 1));
    if (lower.endsWith(".gz")) return scanBuffer(label.slice(0, -3) + "(gz)", gunzipSync(buf, { maxOutputLength: MAX_EXPANDED }), depth + 1);
    if (lower.endsWith(".br")) return scanBuffer(label.slice(0, -3) + "(br)", brotliDecompressSync(buf, { maxOutputLength: MAX_EXPANDED }), depth + 1);
    stats.files++;
    stats.bytes += buf.length;
    const text = decodeText(buf);
    const pathHits = matchText(label, compiled);
    const fileHits = matchText(text, compiled);
    if (lower.endsWith(".map")) {
      try {
        const m = JSON.parse(text);
        if (m && Array.isArray(m.sourcesContent)) {
          m.sourcesContent.forEach((src, i) => {
            if (typeof src === "string") for (const n of matchText(src, compiled)) report(n, `${label}!sourcesContent[${i}]`, src);
          });
        }
      } catch { /* scanned as text above */ }
    }
    for (const n of pathHits) stats.hits.push({ n, path: label, line: 0 });
    for (const n of fileHits) report(n, label, text);
  };

  function report(n, label, text) {
    const t = compiled.find((c) => c.n === n);
    const lines = text.split("\n");
    let line = 0;
    for (let i = 0; i < lines.length; i++) if (matchText(lines[i], [t]).size) { line = i + 1; break; }
    stats.hits.push({ n, path: label, line });
  }

  const walk = (p) => {
    const st = lstatSync(p);
    if (st.isSymbolicLink()) return scanBuffer(p + "(symlink)", Buffer.from(readlinkSync(p)));
    if (st.isDirectory()) {
      for (const e of readdirSync(p).sort()) {
        if (e === "node_modules" || e === ".git") continue;
        walk(join(p, e));
      }
      return;
    }
    if (!st.isFile()) throw new Error("not a regular file: " + p);
    scanBuffer(p, readFile(p));
  };

  for (const p of paths) walk(p);
  if (stats.files === 0) throw new Error("0 files scanned");
  return stats;
}

/**
 * Positive control: plants an encoded copy of term #1 (entity + zero-width
 * split, gzipped) in a private temp dir and requires a hit.
 */
export function positiveControl(terms, opts) {
  const dir = mkdtempSync(join(tmpdir(), "mm-scan-control-"));
  try {
    const t = terms[0];
    const enc = [...t].map((c, i) => (i === 1 ? "&#" + c.codePointAt(0) + ";" : i === 2 ? "\u200b" + c : c)).join("");
    writeFileSync(join(dir, "control.html.gz"), gzipSync(Buffer.from("<p>" + enc + "</p>")), { mode: 0o600 });
    const r = scanPaths([dir], terms, opts);
    return r.hits.some((h) => h.n === 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function formatHit(h) {
  return `term #${h.n} in ${h.path}${h.line ? ":" + h.line : ""}`;
}

export function main(argv, env, log = console.log, err = console.error) {
  try {
    const args = argv.slice();
    let raw = env.REGISTRY_DENYLIST;
    const tf = args.indexOf("--terms-file");
    if (tf >= 0) {
      raw = readFileSync(args[tf + 1], "utf8");
      args.splice(tf, 2);
    }
    const terms = loadTerms(raw);
    if (!args.length) throw new Error("0 files scanned");
    if (!positiveControl(terms)) throw new Error("positive control missed the planted canary");
    const r = scanPaths(args, terms);
    for (const h of r.hits) err(formatHit(h));
    log(`denylist: ${terms.length} term(s), ${r.files} file(s), ${r.bytes} byte(s) scanned, ${r.hits.length} hit(s); positive control ok`);
    return r.hits.length ? 1 : 0;
  } catch (e) {
    const msg = e && e.message === NOT_RUN ? NOT_RUN : "denylist scan failed closed: " + (e && e.code ? e.code : e && e.message ? e.message.replace(/\s+/g, " ").slice(0, 120) : "error");
    err(msg);
    return 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2), process.env);
}

// @moosematrix/search 0.1.0 — pure core (no DOM, no network, zero dependencies).
// Shared by the browser overlay (search.js), the SSR /search/ page and the
// core-side index builder, so the same rules run everywhere.
//
// Rules this file enforces:
//  - index envelope + items are validated against a fixed allowlist of keys;
//    unknown keys, wrong types, over-cap values or bad URLs drop the item
//    (or fail the whole index when the envelope itself is wrong);
//  - data is held in null-prototype objects; nothing is merged or assigned;
//  - access tiers are default-deny: only "public" and "premium" pass;
//  - URLs must be https on exactly one of the four moosematrix origins;
//  - matching is NFKC + lowercase + indexOf; no RegExp is ever built from
//    data or from the query; queries are capped at 128 chars and 8 terms.

export const INDEX_VERSION = 1;

export const ORIGINS = Object.freeze({
  moosematrix: "https://moosematrix.com",
  mooseman: "https://mooseman.moosematrix.com",
  m2: "https://m2.moosematrix.com",
  merch: "https://merch.moosematrix.com",
});
export const SITES = Object.freeze(Object.keys(ORIGINS));
/** @type {readonly string[]} */
const ALLOWED_ORIGINS = Object.freeze(Object.values(ORIGINS));

export const SITE_LABELS = Object.freeze({
  moosematrix: "The Moose Matrix",
  mooseman: "The Moose Man",
  m2: "Moose Matrix Labs",
  merch: "Moose Matrix Merch",
});

export const SECTIONS = Object.freeze([
  "library", "projects", "lab", "research", "mumbles",
  "reading-room", "ctf", "money", "shop", "pages",
]);
export const SECTION_LABELS = Object.freeze({
  library: "Library", projects: "Projects", lab: "Lab", research: "Research",
  mumbles: "Moose Mumbles", "reading-room": "Reading Room", ctf: "CTF",
  money: "Moo$e Money", shop: "Shop", pages: "Pages",
});

// Default-deny tier allowlist. Exact string equality only.
export const TIERS = Object.freeze(["public", "premium"]);

/** @typedef {Readonly<{ id: string, label: string, sections: readonly string[], linkOutUnlessSite?: string }>} Scope */
// Mirrors scopes.json (tests/index-contract.test.mjs keeps them identical).
/** @type {readonly Scope[]} */
export const SCOPES = Object.freeze([
  Object.freeze({ id: "all", label: "All", sections: Object.freeze([]) }),
  Object.freeze({ id: "library", label: "Library", sections: Object.freeze(["library", "projects"]) }),
  Object.freeze({ id: "mumbles", label: "Moose Mumbles", sections: Object.freeze(["mumbles"]), linkOutUnlessSite: "mooseman" }),
  Object.freeze({ id: "reading-room", label: "Reading Room", sections: Object.freeze(["reading-room"]) }),
  Object.freeze({ id: "ctf", label: "CTF", sections: Object.freeze(["ctf"]) }),
  Object.freeze({ id: "money", label: "Moo$e Money", sections: Object.freeze(["money"]) }),
]);
// Fixed constant. Never built from data, the query or location.
export const MUMBLES_LINK_OUT = "https://mooseman.moosematrix.com/moose-mumbles/?mm-scope=mumbles";

export const CAPS = Object.freeze({
  items: 5000, id: 128, title: 200, summary: 300, summaryPremium: 160,
  tags: 20, tag: 40, type: 40, url: 2048, generated: 40,
  responseBytes: 1048576, // 1 MB decoded, hard abort
  query: 128, terms: 8, results: 50, marksPerField: 32,
});

const ENVELOPE_KEYS = Object.freeze(["version", "site", "generated", "items"]);
const ITEM_KEYS = Object.freeze(["id", "title", "site", "section", "type", "url", "summary", "tags", "date", "access"]);
const PREMIUM_KEYS = Object.freeze(ITEM_KEYS.filter((k) => k !== "tags"));
const REQUIRED_ITEM_KEYS = Object.freeze(["id", "title", "site", "section", "type", "url", "access"]);

// Constant, linear patterns only (never built from data).
const ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GENERATED_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export function isPlainRecord(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

function onlyKeys(o, allowed) {
  // Object.keys sees an own "__proto__" key produced by JSON.parse, so a
  // pollution payload is rejected here rather than silently ignored.
  for (const k of Object.keys(o)) if (!allowed.includes(k)) return false;
  return true;
}

function hasControlChars(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

function boundedText(v, max, min = 0) {
  return typeof v === "string" && v.length >= min && v.length <= max && !hasControlChars(v);
}

export const isSite = (s) => typeof s === "string" && SITES.includes(s);
export const isTier = (t) => typeof t === "string" && TIERS.includes(t);

/**
 * URL allowlist. Resolves raw against base, then requires https, no
 * credentials and an origin that is exactly one of the four site origins.
 * Returns the normalised href or null.
 */
export function safeUrl(raw, base) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > CAPS.url) return null;
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username !== "" || u.password !== "") return null;
  if (!ALLOWED_ORIGINS.includes(u.origin)) return null;
  return u.href;
}

/**
 * Validates one item. Returns a frozen null-prototype record or a reason
 * string. indexSite is the site the index belongs to.
 */
export function checkItem(raw, indexSite) {
  if (!isPlainRecord(raw)) return "item-not-object";
  if (!onlyKeys(raw, ITEM_KEYS)) return "item-unknown-key";
  for (const k of REQUIRED_ITEM_KEYS) if (!hasOwn(raw, k)) return "item-missing-" + k;
  if (!isTier(raw.access)) return "item-bad-access";
  const premium = raw.access === "premium";
  if (premium && !onlyKeys(raw, PREMIUM_KEYS)) return "premium-has-tags";
  if (typeof raw.id !== "string" || !ID_RE.test(raw.id)) return "item-bad-id";
  if (!boundedText(raw.title, CAPS.title, 1) || raw.title.trim() === "") return "item-bad-title";
  if (!isSite(raw.site)) return "item-bad-site";
  if (indexSite !== "mooseman" && raw.site === "mooseman") return "mooseman-item-off-mooseman";
  if (typeof raw.section !== "string" || !SECTIONS.includes(raw.section)) return "item-bad-section";
  if (!boundedText(raw.type, CAPS.type, 1)) return "item-bad-type";
  if (hasOwn(raw, "summary") && !boundedText(raw.summary, premium ? CAPS.summaryPremium : CAPS.summary)) {
    return premium ? "premium-summary-too-long" : "item-bad-summary";
  }
  if (hasOwn(raw, "date") && (typeof raw.date !== "string" || !DATE_RE.test(raw.date))) return "item-bad-date";
  let tags = [];
  if (hasOwn(raw, "tags")) {
    if (!Array.isArray(raw.tags) || raw.tags.length > CAPS.tags) return "item-bad-tags";
    for (const t of raw.tags) if (!boundedText(t, CAPS.tag, 1)) return "item-bad-tag";
    tags = raw.tags.slice();
  }
  const href = safeUrl(raw.url, ORIGINS[raw.site]);
  if (href === null) return "item-bad-url";
  if (new URL(href).origin !== ORIGINS[raw.site]) return "item-url-site-mismatch";

  const item = Object.create(null);
  item.id = raw.id;
  item.title = raw.title;
  item.site = raw.site;
  item.section = raw.section;
  item.type = raw.type;
  item.url = href;
  item.summary = hasOwn(raw, "summary") ? raw.summary : "";
  item.tags = Object.freeze(tags);
  item.date = hasOwn(raw, "date") ? raw.date : "";
  item.access = raw.access;
  return Object.freeze(item);
}

/**
 * Validates a parsed index. The envelope must be exact; bad items are dropped
 * (client) and counted. Build-side callers use strict:true so any bad item
 * fails the build instead.
 */
export function parseIndex(data, expectedSite, { strict = false } = {}) {
  const fail = (reason) => ({ ok: false, reason, items: [], dropped: [] });
  if (!isSite(expectedSite)) return fail("bad-expected-site");
  if (!isPlainRecord(data)) return fail("envelope-not-object");
  if (!onlyKeys(data, ENVELOPE_KEYS)) return fail("envelope-unknown-key");
  for (const k of ENVELOPE_KEYS) if (!hasOwn(data, k)) return fail("envelope-missing-" + k);
  if (data.version !== INDEX_VERSION) return fail("wrong-version");
  if (data.site !== expectedSite) return fail("wrong-site");
  if (typeof data.generated !== "string" || data.generated.length > CAPS.generated || !GENERATED_RE.test(data.generated)) {
    return fail("bad-generated");
  }
  if (!Array.isArray(data.items)) return fail("items-not-array");
  if (data.items.length > CAPS.items) return fail("too-many-items");
  const items = [];
  const dropped = [];
  const seen = new Set();
  for (let i = 0; i < data.items.length; i++) {
    let r = checkItem(data.items[i], expectedSite);
    if (typeof r !== "string" && seen.has(r.id)) r = "item-duplicate-id";
    if (typeof r === "string") dropped.push({ index: i, reason: r });
    else {
      seen.add(r.id);
      items.push(r);
    }
  }
  if (strict && dropped.length) return { ok: false, reason: "invalid-items", items: [], dropped };
  return { ok: true, reason: "", items, dropped };
}

/** Parses JSON text and validates it. Never throws. */
export function parseIndexText(text, expectedSite, opts) {
  if (typeof text !== "string") return { ok: false, reason: "not-text", items: [], dropped: [] };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "not-json", items: [], dropped: [] };
  }
  return parseIndex(data, expectedSite, opts);
}

/**
 * Reads a fetch Response body with a hard byte cap (size caps): rejects
 * early on Content-Length, then counts bytes while streaming and cancels
 * the stream the moment the cap is passed.
 */
export async function readCapped(response, cap = CAPS.responseBytes) {
  const cl = response.headers && response.headers.get("content-length");
  if (cl !== null && cl !== undefined && cl !== "") {
    const n = Number(cl);
    if (!Number.isFinite(n) || n < 0 || n > cap) throw new Error("too-large");
  }
  if (!response.body || typeof response.body.getReader !== "function") throw new Error("no-stream");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      try { await reader.cancel(); } catch { /* already closed */ }
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(buf);
}

/**
 * NFKC + lowercase, one code point at a time, keeping a map from each output
 * UTF-16 unit back to the source range so <mark> ranges can be built from
 * text offsets. ASCII strings take a fast path.
 */
export function fold(s) {
  const str = String(s);
  let ascii = true;
  for (let i = 0; i < str.length; i++) if (str.charCodeAt(i) > 0x7f) { ascii = false; break; }
  if (ascii) {
    const text = str.toLowerCase();
    return { text, start: null, end: null };
  }
  let text = "";
  const start = [];
  const end = [];
  let i = 0;
  while (i < str.length) {
    const cp = str.codePointAt(i);
    const w = cp > 0xffff ? 2 : 1;
    const out = String.fromCodePoint(cp).normalize("NFKC").toLowerCase();
    for (let k = 0; k < out.length; k++) {
      start.push(i);
      end.push(i + w);
    }
    text += out;
    i += w;
  }
  return { text, start, end };
}

const WS = /\s+/; // constant

/** Splits a query into at most 8 unique folded terms; input capped at 128 chars. */
export function parseQuery(q) {
  const capped = String(q ?? "").slice(0, CAPS.query);
  const folded = capped.normalize("NFKC").toLowerCase();
  const terms = [];
  for (const t of folded.split(WS)) {
    if (t && !terms.includes(t)) terms.push(t);
    if (terms.length === CAPS.terms) break;
  }
  return terms;
}

export function scopeById(id) {
  return SCOPES.find((s) => s.id === id) || null;
}

/** Scopes that search locally on this site (Mumbles links out off mooseman). */
export function localScopes(site) {
  return SCOPES.filter((s) => !s.linkOutUnlessSite || s.linkOutUnlessSite === site);
}

/** Resolves a requested scope id for a site, falling back to "all". */
export function resolveScope(requested, site) {
  const s = localScopes(site).find((x) => x.id === requested);
  return s ? s.id : "all";
}

/** Builds the per-item search entries once, after the index loads. */
export function prepare(items) {
  return items.map((item) => {
    const t = fold(item.title);
    const s = fold(item.summary);
    const extra = fold([item.tags.join(" "), item.type, SECTION_LABELS[item.section], SITE_LABELS[item.site]].join("\n")).text;
    return Object.freeze({ item, t, s, hay: t.text + "\n" + s.text + "\n" + extra });
  });
}

function rangesFor(f, terms) {
  const ranges = [];
  for (const term of terms) {
    let from = 0;
    while (ranges.length < CAPS.marksPerField) {
      const at = f.text.indexOf(term, from);
      if (at < 0) break;
      const a = f.start ? f.start[at] : at;
      const b = f.end ? f.end[at + term.length - 1] : at + term.length;
      ranges.push([a, b]);
      from = at + term.length;
    }
  }
  ranges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/**
 * All terms must appear (AND). Titles rank above summaries; ties keep index
 * order. Returns { total, results:[{ item, titleMarks, summaryMarks }] }.
 */
export function search(entries, query, scopeId = "all") {
  const terms = parseQuery(query);
  const scope = scopeById(scopeId) || SCOPES[0];
  if (!terms.length) return { total: 0, results: [], terms };
  const hits = [];
  for (const e of entries) {
    if (scope.sections.length && !scope.sections.includes(e.item.section)) continue;
    let score = 0;
    let all = true;
    for (const term of terms) {
      if (e.hay.indexOf(term) < 0) { all = false; break; }
      if (e.t.text.indexOf(term) >= 0) score += 2;
    }
    if (all) hits.push({ e, score });
  }
  hits.sort((a, b) => b.score - a.score);
  const results = hits.slice(0, CAPS.results).map(({ e }) => ({
    item: e.item,
    titleMarks: rangesFor(e.t, terms),
    summaryMarks: rangesFor(e.s, terms),
  }));
  return { total: hits.length, results, terms };
}

/** Splits text into [{ text, mark }] pieces from mark ranges (no HTML). */
export function pieces(text, ranges) {
  const out = [];
  let at = 0;
  for (const [a, b] of ranges) {
    if (a > at) out.push({ text: text.slice(at, a), mark: false });
    out.push({ text: text.slice(a, b), mark: true });
    at = b;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false });
  return out;
}

export function statusText(total, scopeId) {
  const scope = scopeById(scopeId) || SCOPES[0];
  if (total === 0) return "No results in " + scope.label;
  const shown = total > CAPS.results ? " (showing first " + CAPS.results + ")" : "";
  return total + (total === 1 ? " result in " : " results in ") + scope.label + shown;
}

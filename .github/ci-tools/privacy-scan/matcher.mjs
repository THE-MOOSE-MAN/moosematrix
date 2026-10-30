// Term matcher. Terms are never printed or returned; callers only see term numbers.
//
// Before matching, text and terms are normalised: NFKC, case-fold, lookalike letters folded
// (confusables skeleton subset: Cyrillic/Greek/Latin homoglyphs, fullwidth via NFKC, digit lookalikes),
// format characters (zero-width U+200B-U+200D, U+2060, U+FEFF, soft hyphen U+00AD, bidi marks) stripped,
// diacritics stripped (NFD, drop combining marks). Text is also decoded (HTML entities, URL-encoding,
// JSON \uXXXX / \xXX, base64 inside data: URIs) and has tags and comments stripped. A multi-word term
// matches with any separator between its words (space - _ . / + %20 or none, up to 3 chars of
// punctuation/space), in either word order.

const CONFUSABLES = {
  // Cyrillic
  "а": "a", "в": "b", "г": "r", "е": "e", "ё": "e", "з": "3", "и": "u", "й": "u", "к": "k", "л": "n", "м": "m", "н": "h", "о": "o",
  "п": "n", "р": "p", "с": "c", "т": "t", "у": "y", "х": "x", "ь": "b", "ѕ": "s", "і": "i", "ї": "i", "ј": "j", "ԁ": "d", "ԛ": "q",
  "ԝ": "w", "һ": "h", "ӏ": "l", "ɡ": "g", "ү": "y", "ш": "w", "щ": "w", "ц": "u", "ѵ": "v", "ҫ": "c", "ԍ": "g",
  // Greek
  "α": "a", "β": "b", "γ": "y", "δ": "d", "ε": "e", "ζ": "z", "η": "n", "θ": "o", "ι": "i", "κ": "k", "λ": "a", "μ": "u", "ν": "v",
  "ξ": "e", "ο": "o", "π": "n", "ρ": "p", "σ": "o", "ς": "c", "τ": "t", "υ": "u", "φ": "o", "χ": "x", "ψ": "w", "ω": "w", "ϲ": "c", "ϳ": "j",
  // Latin lookalikes
  "ı": "i", "ȷ": "j", "ł": "l", "ŀ": "l", "ƚ": "l", "ɫ": "l", "ℓ": "l", "ø": "o", "ɵ": "o", "đ": "d", "ɗ": "d", "ħ": "h", "ɦ": "h",
  "ɩ": "i", "ɪ": "i", "ʏ": "y", "ɑ": "a", "ɐ": "a", "ʋ": "v", "ʍ": "w", "ꞵ": "b", "ß": "ss", "æ": "ae", "œ": "oe", "þ": "p", "ŋ": "n",
  // digits and symbols
  "0": "o", "1": "l", "|": "l", "!": "l", "5": "s", "$": "s", "@": "a", "€": "e",
};
const MULTI = [["rn", "m"], ["vv", "w"], ["cl", "d"]];

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "\u00ad", zwj: "\u200d", zwnj: "\u200c", hyphen: "-", dash: "-", period: ".", sol: "/", lowbar: "_", plus: "+", num: "#", commat: "@", dollar: "$" };

function htmlDecode(s) {
  return s
    .replace(/&#x([0-9a-f]{1,6});?/gi, (m, h) => safeCp(parseInt(h, 16), m))
    .replace(/&#(\d{1,7});?/g, (m, d) => safeCp(parseInt(d, 10), m))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}
function safeCp(cp, fallback) {
  try { return String.fromCodePoint(cp); } catch { return fallback; }
}
function jsonUnescape(s) {
  return s
    .replace(/\\u\{([0-9a-f]{1,6})\}/gi, (m, h) => safeCp(parseInt(h, 16), m))
    .replace(/\\u([0-9a-f]{4})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}
function urlDecode(s) {
  return s.replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
    const bytes = Buffer.from(run.replace(/%/g, ""), "hex");
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return utf8.includes("\ufffd") ? bytes.toString("latin1") : utf8;
  });
}
function dataUris(s) {
  const extra = [];
  for (const m of s.matchAll(/data:[^,"'\s)]*?;base64,([A-Za-z0-9+/=_-]+)/gi)) {
    const b = Buffer.from(m[1].replace(/-/g, "+").replace(/_/g, "/"), "base64");
    extra.push(b.toString("utf8"), b.toString("latin1"));
  }
  return extra;
}
export function decode(s) {
  let out = s;
  for (let i = 0; i < 4; i++) {
    const prev = out;
    out = urlDecode(jsonUnescape(htmlDecode(out)));
    if (out === prev) break;
  }
  const extra = dataUris(s).concat(dataUris(out));
  return extra.length ? out + "\n" + extra.map((e) => decode(e)).join("\n") : out;
}

export function fold(s) {
  let t = s.normalize("NFKC").toLowerCase();
  t = t.replace(/\p{Cf}/gu, "");
  t = t.normalize("NFD").replace(/\p{M}/gu, "");
  let o = "";
  for (const ch of t) o += CONFUSABLES[ch] ?? ch;
  for (const [a, b] of MULTI) o = o.split(a).join(b);
  return o.normalize("NFKC").replace(/\s+/g, " ");
}

// The views of one piece of text that are matched: plain, decoded with tags removed, decoded with
// tags replaced by a space.
export function views(s) {
  const d = decode(s).replace(/<!--[\s\S]*?-->/g, "");
  return [fold(s), fold(d.replace(/<[^>]*>/g, "")), fold(d.replace(/<[^>]*>/g, " "))];
}

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SEP = "[^\\p{L}\\p{N}]{0,3}";

export function compileTerms(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("no terms");
  return raw.map((t, i) => {
    const words = fold(String(t)).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!words.length || words.join("").length < 3) throw new Error(`term #${i + 1} is empty or too short after normalisation`);
    const fwd = words.map(esc).join(SEP);
    const alts = words.length > 1 ? [fwd, words.slice().reverse().map(esc).join(SEP)] : [fwd];
    return new RegExp(alts.map((a) => `(?:${a})`).join("|"), "u");
  });
}

// Returns the 0-based indexes of the terms found in `s`.
export function matchText(s, compiled) {
  const v = views(s);
  const hits = [];
  compiled.forEach((re, i) => { if (v.some((x) => re.test(x))) hits.push(i); });
  return hits;
}

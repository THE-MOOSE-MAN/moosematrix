#!/usr/bin/env node
// Static guards for @moosematrix/search (run in CI and by tests/static-guards.test.mjs).
//  1. DOM HTML sinks, eval and inline handlers are banned in every JS/TS file
//     under packages/.
//  2. In this package's shipped files: no RegExp built at runtime, no
//     Object.assign / deep merge, no third-party URLs, no new-tab links,
//     exactly one fetch (search.js, credentials "omit").
// Semgrep mirrors rule 1 and the RegExp rule (.semgrep/mm-packages.yml).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = join(PKG, "..");
const SELF = fileURLToPath(import.meta.url);
// Files that only *name* the banned sinks, as strings, inside lint rules or
// the lint rule's own test fixtures (an explicit list, not a path pattern).
const RULE_FILES = new Set([
  SELF,
  join(PKG, "tests", "package.test.mjs"),
  join(PACKAGES, "tokens", "scripts", "check.mjs"),
]);

/** @type {Array<[RegExp, string]>} */
const SINKS = [
  [/\.(?:inner|outer)HTML\b/, "innerHTML/outerHTML"],
  [/\binsertAdjacentHTML\b/, "insertAdjacentHTML"],
  [/\bdocument\.write(?:ln)?\b/, "document.write"],
  [/\bcreateContextualFragment\b/, "createContextualFragment"],
  [/\bdangerouslySetInnerHTML\b/, "dangerouslySetInnerHTML"],
  [/\bsrcdoc\b/, "srcdoc"],
  [/\bDOMParser\b/, "DOMParser"],
  [/(?<![\w.])eval\s*\(/, "eval"],
  [/\bnew\s+Function\b/, "new Function"],
  [/\bset(?:Timeout|Interval)\s*\(\s*["'`]/, "string timer"],
  [/\.setAttribute\(\s*["']on/i, "inline handler attribute"],
  [/\.on[a-z]+\s*=(?!=)/, "on* property handler"],
];
/** @type {Array<[RegExp, string]>} */
const SHIPPED_RULES = [
  [/\bRegExp\s*\(/, "RegExp built at runtime"],
  [/\bObject\.assign\b/, "Object.assign"],
  [/\bstructuredClone\b|\bmerge\s*\(/, "deep merge"],
  [/target\s*=\s*["']?_blank|window\.open\s*\(/, "new-tab link"],
  [/\blocalStorage\b|\bsessionStorage\b|\bdocument\.cookie\b|\bsendBeacon\b|\bXMLHttpRequest\b|\bWebSocket\b|\bimportScripts\b|\bindexedDB\b|\bEventSource\b/, "storage/beacon/other network API"],
];
const ALLOWED_URLS = [
  "https://moosematrix.com", "https://mooseman.moosematrix.com", "https://m2.moosematrix.com",
  "https://merch.moosematrix.com", "http://www.w3.org/2000/svg", "https://json-schema.org/draft/2020-12/schema",
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".git" || e === "dist" || e === ".next" || e === ".turbo") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function lint({ packagesDir = PACKAGES, pkgDir = PKG } = {}) {
  const problems = [];
  const add = (file, line, what) => problems.push(`${relative(packagesDir, file)}:${line}: ${what}`);
  const code = walk(packagesDir).filter((f) => /\.(?:m?js|cjs|jsx|tsx?|astro)$/.test(f) && !RULE_FILES.has(f));
  for (const f of code) {
    readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      for (const [re, what] of SINKS) if (re.test(l)) add(f, i + 1, what);
    });
  }
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const shipped = pkg.files.filter((f) => !f.endsWith(".md")).map((f) => join(pkgDir, f));
  let fetches = 0;
  for (const f of shipped) {
    const text = readFileSync(f, "utf8");
    text.split("\n").forEach((l, i) => {
      if (/\.(?:m?js)$/.test(f)) for (const [re, what] of SHIPPED_RULES) if (re.test(l)) add(f, i + 1, what);
      if (/\.html$/.test(f) && (/<script\b/i.test(l) || /\son[a-z]+\s*=/i.test(l) || /\sstyle\s*=/i.test(l))) add(f, i + 1, "inline script/handler/style in HTML");
      for (const m of l.matchAll(/\b(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)<>]*/gi)) {
        if (!ALLOWED_URLS.some((u) => m[0] === u || m[0].startsWith(u + "/") || m[0].startsWith(u + "?"))) add(f, i + 1, "URL outside the four site origins");
      }
      if (/\bfetch\s*\(/.test(l)) fetches++;
    });
  }
  const js = readFileSync(join(pkgDir, "search.js"), "utf8");
  if (fetches !== 1 || !/credentials:\s*"omit"/.test(js)) add(join(pkgDir, "search.js"), 0, "expected exactly one fetch, with credentials \"omit\"");
  return problems;
}

if (process.argv[1] === SELF) {
  const p = lint();
  for (const x of p) console.error(x);
  console.log(p.length ? `lint: ${p.length} problem(s)` : "lint: ok");
  process.exitCode = p.length ? 1 : 0;
}

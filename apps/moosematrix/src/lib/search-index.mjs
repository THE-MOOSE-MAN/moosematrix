// /search-index.json: contract and export guard (rollout §2). Used by scripts/build-search-index.mjs and the tests.
export const TYPES = ["Research", "Writeup", "Essay", "CTF", "Blog", "Project", "Tool", "Page", "Book", "Quote", "Author", "Margin note"];
export const LIBRARY_TYPES = ["Research", "Writeup", "Essay"];
const FORBIDDEN = ["body", "body_premium", "content", "html", "excerpt"];
const PREMIUM_ALLOWED = new Set(["id", "title", "summary", "site", "type", "url", "access", "related", "status", "sample"]);
const FREE_ALLOWED = new Set([...PREMIUM_ALLOWED, "tags"]);
// Only these statuses are public; anything else (draft, unlisted, a typo) fails the build. Missing status is allowed.
export const STATUSES = ["published", "Live", "In development", "Planned"];
export const MAX_GZ_BYTES = 150 * 1024;

export function guard(items) {
  const errors = [];
  const ids = new Set();
  for (const [i, it] of items.entries()) {
    const at = `item ${i} (${it && it.id})`;
    for (const k of FORBIDDEN) if (k in it) errors.push(`${at}: has "${k}" (bodies are never exported)`);
    for (const k of ["id", "title", "site", "type", "url", "summary", "related", "access"]) if (!(k in it)) errors.push(`${at}: missing ${k}`);
    if (ids.has(it.id)) errors.push(`${at}: duplicate id`);
    ids.add(it.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(it.id))) errors.push(`${at}: id must be a lowercase hyphenated slug`);
    if (!TYPES.includes(it.type)) errors.push(`${at}: unknown type ${it.type}`);
    if (!["moosematrix", "mooseman"].includes(it.site)) errors.push(`${at}: unknown site ${it.site}`);
    if (!/^https:\/\//.test(String(it.url))) errors.push(`${at}: url must be absolute https`);
    if (it.sample === true) errors.push(`${at}: samples are never published`);
    if ("status" in it && !STATUSES.includes(it.status)) errors.push(`${at}: status ${JSON.stringify(it.status)} is not public (allowed: ${STATUSES.join(", ")})`);
    if (!Array.isArray(it.related)) errors.push(`${at}: related must be an array`);
    if (it.access === "premium") {
      for (const k of Object.keys(it)) if (!PREMIUM_ALLOWED.has(k)) errors.push(`${at}: premium item has "${k}"`);
      if (String(it.summary).length > 160) errors.push(`${at}: premium summary over 160 chars`);
    } else if (it.access === "free") {
      if (!Array.isArray(it.tags)) errors.push(`${at}: free item needs tags`);
      for (const k of Object.keys(it)) if (!FREE_ALLOWED.has(k)) errors.push(`${at}: unexpected field "${k}"`);
    } else errors.push(`${at}: access must be free or premium`);
  }
  return errors;
}

export function buildIndex(catalog, generated = new Date()) {
  const items = catalog.items.map((it) => ({ ...it }));
  const errors = guard(items);
  if (errors.length) throw new Error("search-index export guard failed:\n  " + errors.join("\n  "));
  return { version: 1, site: "moosematrix", generated: generated.toISOString().replace(/\.\d{3}Z$/, "Z"), items };
}

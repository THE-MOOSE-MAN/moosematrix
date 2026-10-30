// Shared header, footer and search overlay from @moosematrix/tokens (packages/tokens), read at build time.
// Every page is prerendered (scripts/csp-hashes.mjs), so this runs during `next build` only, never per request.
// The partials link to the planned v5 routes on moosematrix.com. Until those pages exist, each link is mapped to
// the page that serves it today, so the header never leads to a 404 and links stay same-origin (works on dev too).
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://moosematrix.com";

// Planned v5 path -> where it goes today. Anything not listed keeps its path (made root-relative).
export const HREF_MAP = {
  "/": "/",
  "/projects/": "/builds", // the live projects page (R&D); /projects/ comes with the Projects phase
  "/library/": "/library",
  "/lab/": "/lab",
  "/shop/": "https://merch.moosematrix.com/", // same target as the current site's Shop link
  "/about/": "/about",
  "/about/#contact": "/contact", // the live contact page
  "/search/": "/search",
  "/privacy": "/privacy",
  "/terms": "/terms",
};

// Extra footer links for live pages the v5 footer has no slot for yet.
const FOOTER_MORE = '<a href="/security">Security</a>\n        <a href="/subsidiaries">Directory</a>';

export function mapHrefs(html) {
  const out = html.replace(/(href|action)="https:\/\/moosematrix\.com(\/[^"]*)?"/g, (m, attr, p = "/") => {
    if (!(p in HREF_MAP)) throw new Error(`partials: no route mapped for ${ORIGIN}${p}`);
    return `${attr}="${HREF_MAP[p]}"`;
  });
  return out;
}

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->\s*/g, "");

export function tokensDir(cwd = process.cwd()) {
  // next build runs in apps/moosematrix; the Docker image keeps the same layout (/app/apps/..., /app/packages/...).
  return path.resolve(cwd, "..", "..", "packages", "tokens");
}

export function loadPartials(dir = tokensDir()) {
  const read = (f) => stripComments(fs.readFileSync(path.join(dir, f), "utf8")).trim();
  const header = mapHrefs(read("header.html"));
  let footer = mapHrefs(read("footer.html"));
  footer = footer.replace(/(<nav class="mm-footer-col" aria-labelledby="mm-f-more">[\s\S]*?)(\n\s*<\/nav>)/, `$1\n        ${FOOTER_MORE}$2`);
  if (!footer.includes('href="/security"')) throw new Error("partials: footer More column not found");
  const search = mapHrefs(read("search.html"));
  return { header, footer, search };
}

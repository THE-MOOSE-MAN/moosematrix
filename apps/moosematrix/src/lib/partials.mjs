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

// Header nav (The Moose Man, 30 Oct 2026): Research (hub for Projects, Lab and Library; replaces R&D), Moose Mumbles,
// Moo$e Money, Shop, About (replaces More). Applied here, after mapHrefs, so packages/tokens stays at 0.1.0.
// `also` lists the pages under a hub: public/js/mm-nav-current.js marks the hub aria-current="true" on them.
// TODO(tokens 0.1.1): make the nav items a partial input instead of rewriting the shipped markup.
export const NAV = [
  { label: "Research", href: "/research", tick: 3, also: ["/builds", "/lab", "/library"] },
  { label: "Moose Mumbles", href: "https://mooseman.moosematrix.com/moose-mumbles", tick: 2 },
  { label: "Moo$e Money", href: "https://m2.moosematrix.com/", tick: 1 },
  { label: "Shop", href: "https://merch.moosematrix.com/", tick: 2 },
  { label: "About", href: "/about", tick: 3 },
];
const MENU_EXTRA = ['<a href="https://mooseman.moosematrix.com/">The Moose Man</a>', '<a href="/search" data-mm-search-open>Search</a>'];
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const also = (n) => (n.also ? ` data-mm-also="${n.also.join(" ")}"` : "");

export function applyNav(header) {
  const bar = NAV.map((n) => `<a class="mm-nav-link mm-tick-${n.tick}" href="${escAttr(n.href)}"${also(n)}>${escAttr(n.label)}</a>`);
  const menu = NAV.map((n) => `<a href="${escAttr(n.href)}"${also(n)}>${escAttr(n.label)}</a>`).concat(MENU_EXTRA);
  let hits = 0;
  const out = header
    .replace(/(<nav class="mm-nav" aria-label="Primary">\s*)(?:<a class="mm-nav-link[^>]*>[^<]*<\/a>\s*)+/, (m, open) => (hits++, `${open}${bar.join("\n      ")}\n      `))
    .replace(/(<nav class="mm-menu-nav" aria-label="Menu">\s*)(?:<a [^>]*>[^<]*<\/a>\s*)+/, (m, open) => (hits++, `${open}${menu.join("\n          ")}\n        `));
  if (hits !== 2) throw new Error("partials: header nav markup not found (tokens header changed?)");
  return out;
}

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
  const header = applyNav(mapHrefs(read("header.html")));
  let footer = mapHrefs(read("footer.html"));
  footer = footer.replace(/(<nav class="mm-footer-col" aria-labelledby="mm-f-more">[\s\S]*?)(\n\s*<\/nav>)/, `$1\n        ${FOOTER_MORE}$2`);
  if (!footer.includes('href="/security"')) throw new Error("partials: footer More column not found");
  const search = mapHrefs(read("search.html"));
  return { header, footer, search };
}

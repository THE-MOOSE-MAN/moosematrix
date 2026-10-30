// Builds demo/ (not shipped): two pages and their indexes, built from
// demo/records.json through the reference projection, so the demo exercises
// the same rules the core build uses. CI fails if demo/ is out of date.
// Serve the packages/ directory as web root: /search/demo/index.html.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderOverlay } from "../overlay.mjs";
import { buildIndex } from "./projection.mjs";

const at = (p) => new URL("../demo/" + p, import.meta.url);
export const DEMO_NOW = new Date("2026-10-30T12:00:00Z");
export const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self'", "font-src 'self'",
  "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
  "require-trusted-types-for 'script'", "trusted-types 'none'",
].join("; ");

function page({ site, index, title }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<title>${title}</title>
<link rel="stylesheet" href="../../tokens/fonts.css">
<link rel="stylesheet" href="../../tokens/tokens.css">
<link rel="stylesheet" href="../search.css">
<link rel="stylesheet" href="demo.css">
<script type="module" src="../search.js"></script>
</head>
<body>
<div class="demo-wrap">
  <header class="demo-bar">
    <button type="button" class="demo-btn" data-mm-search-open id="demo-header-search">Search</button>
  </header>
  <main>
    <h1>${title}</h1>
    <p>Open search with the button, Ctrl+K or Cmd+K. Section triggers open it pre-scoped.</p>
    <p class="demo-bar">
      <button type="button" class="demo-btn" data-mm-search-open data-mm-scope="library" id="demo-library">Search the Library</button>
      <button type="button" class="demo-btn" data-mm-search-open data-mm-scope="reading-room" id="demo-reading-room">Search Reading Room</button>
      <button type="button" class="demo-btn" data-mm-search-open data-mm-scope="mumbles" id="demo-mumbles">Search Moose Mumbles</button>
    </p>
  </main>
</div>
${renderOverlay({ site, index })}</body>
</html>
`;
}

export function build() {
  const records = JSON.parse(readFileSync(at("records.json"), "utf8"));
  const opts = { now: DEMO_NOW, generated: "2026-10-30T12:00:00Z" };
  return {
    "index.html": page({ site: "moosematrix", index: "/search/demo/search-index.json", title: "@moosematrix/search demo (moosematrix)" }),
    "mooseman.html": page({ site: "mooseman", index: "/search/demo/mooseman-index.json", title: "@moosematrix/search demo (mooseman)" }),
    "search-index.json": JSON.stringify(buildIndex(records, { site: "moosematrix", ...opts }), null, 2) + "\n",
    "mooseman-index.json": JSON.stringify(buildIndex(records, { site: "mooseman", ...opts }), null, 2) + "\n",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, text] of Object.entries(build())) writeFileSync(at(name), text);
  console.log("demo built");
}

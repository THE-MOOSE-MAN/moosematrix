# @moosematrix/search

The one search component for every Moose Matrix site. It's a modal overlay that searches the site's own same-origin `search-index.json` in the browser. The header Search button, Ctrl/Cmd+K and any in-section trigger (`data-mm-search-open`) all open this same overlay, and no other free-text search box exists.

- No dependencies, no build step, no third-party code, fonts or requests.
- Runs under a strict CSP (`default-src 'self'`, no `unsafe-inline`/`unsafe-eval`) and `require-trusted-types-for 'script'`. It uses no HTML sinks; the DOM is built with `createElement`/`textContent` only.
- The query never leaves the browser. The index is fetched once, on first open, with `credentials: "omit"`.
- Styled with `@moosematrix/tokens` custom properties, light and dark. Mobile-first from 360 px, WCAG 2.2 AA.

## Use

1. Put the overlay markup in the page once (build time):

   ```js
   import { renderOverlay } from "@moosematrix/search/overlay.mjs";
   const html = renderOverlay({ site: "moosematrix" }); // "moosematrix" | "mooseman" | "m2" | "merch"
   ```

   `index` (default `/search-index.json`) must be a same-origin absolute path. `slash: true` also opens the overlay on `/`. It's off by default because single-key shortcuts need an off switch (WCAG 2.2 SC 2.1.4).
   `overlay.html` is the same markup for `site: "moosematrix"`, for reference.

2. Load the stylesheet and the module from your own origin:

   ```html
   <link rel="stylesheet" href="/mm/search.css">
   <script type="module" src="/mm/search.js"></script>
   ```

   `search.js` mounts itself on `#mm-search`. `search.js` imports `search-core.mjs`, so copy both.

3. Add triggers. Any element with `data-mm-search-open` opens the overlay; `data-mm-scope` pre-selects a scope:

   ```html
   <button type="button" data-mm-search-open>Search</button>
   <button type="button" data-mm-search-open data-mm-scope="library">Search the Library</button>
   ```

   Without a trigger scope, the overlay uses `<body data-mm-scope="…">`, otherwise All.

## Scopes

All, Library (library and projects), Moose Mumbles, Reading Room, CTF, Moo$e Money (`scopes.json`, the same as `SCOPES` in `search-core.mjs`).

Off mooseman, **Moose Mumbles** is a same-tab link to one fixed URL, `https://mooseman.moosematrix.com/moose-mumbles/?mm-scope=mumbles`. It never carries the query, the referrer (`rel="noreferrer"`, `referrerpolicy="no-referrer"`) or any other data. On mooseman, `?mm-scope=<known scope>` opens the overlay pre-scoped; anything else is ignored.

## Index contract

`index.schema.json` (JSON Schema 2020-12, `additionalProperties: false` everywhere), enforced in the browser by `search-core.mjs`:

- Envelope `{version: 1, site, generated, items[]}`. `version` and `site` must match exactly, otherwise "search unavailable".
- Item keys `id, title, site, section, type, url, summary, tags, date, access`.
- `access` is `public` or `premium`; anything else is dropped (default deny).
- Premium items carry no `tags`, and their `summary` is the editor teaser (≤ 160 chars).
- Caps: 5,000 items, title 200, summary 300 (160 premium), 20 tags × 40, url 2,048. A response is at most 1 MB decoded (the build gate is ≤ 150 KB gzipped).
- `url` must be https on one of the four site origins and match the item's own `site`. A non-mooseman index never contains mooseman items.
- Unknown or prototype keys (`__proto__`, `constructor`, …) are rejected. Items are frozen null-prototype objects.
- Matching is NFKC + lowercase `indexOf`, with the query capped at 128 chars and 8 terms. No `RegExp` is ever built from a query or index text.

## Build-side tools

- `scripts/projection.mjs` is the reference core-side builder: `buildIndex(records, { site })`. It keeps published items only, enforces the tier allowlist and field allowlist and builds the premium teaser projection. It never puts mooseman items off mooseman. Its output must pass the strict validator, or it throws.
- `node scripts/validate-index.mjs --site <site> <file>` is the strict check for a built index (any bad item fails, size limits included).
- `node scripts/scan-terms.mjs [--terms-file <f>] <paths…>` is the name-denylist matcher. Terms come from `REGISTRY_DENYLIST` or the file and are never printed; output is `term #n in <path>:<line>` and counts. It normalises encodings and lookalikes and expands `.gz`, `.br`, `.tgz` and `*.map` `sourcesContent`. It runs a positive control first and fails closed (exit 2) on a missing secret, 0 files or any unreadable file.

## Develop

```sh
npm run lint   # sink / storage / RegExp / URL / fetch rules (scripts/lint.mjs)
npm test       # node --test, includes every abuse-case fixture
npm run build  # regenerates overlay.html and demo/ (CI fails if they drift)
```

Browser checks (axe at 360 px and 1280 px in both themes, keyboard, CSP, hostile indexes) are in `.github/ci-tools/a11y/run-search-e2e.mjs`.

Maintained by the owner. Not published to npm (`private: true`); sites copy the files from a release tag.

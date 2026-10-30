# Changelog

All notable changes to `@moosematrix/search`. Versions follow semver; release tags are `search-vX.Y.Z`.

## 0.1.0 — unreleased

First version: the one search overlay for every site.

- `search.js` + `search-core.mjs`: a modal `<dialog>` overlay with scope chips (All, Library, Moose Mumbles, Reading Room, CTF, Moo$e Money), Ctrl/Cmd+K, `data-mm-search-open` / `data-mm-scope` triggers, focus trap, focus return, arrow-key results, a live result count and `<mark>` highlights built from text ranges. The `/` shortcut is opt-in.
- Moose Mumbles is a fixed same-tab link-out to mooseman's own search off mooseman.
- Index loaded once on first open, same-origin, `credentials: "omit"`, 1 MB decoded cap, JSON only, in-browser schema validation, honest "search unavailable" state.
- Default-deny tier allowlist `{public, premium}`; premium results show title, editor teaser and a "Premium" lock only.
- URL allowlist: https, the four site origins, the item's own site.
- Prototype-pollution-safe parsing, ReDoS-free matching (128 chars, 8 terms, no `RegExp` from data).
- `overlay.mjs` / `overlay.html` markup, `search.css` on tokens (light and dark, 360 px up, ≥ 24 px targets, reduced motion).
- `index.schema.json`, `scopes.json`.
- `scripts/projection.mjs` (core-side reference builder), `scripts/validate-index.mjs` (strict build check), `scripts/scan-terms.mjs` (name-denylist matcher, fail closed).

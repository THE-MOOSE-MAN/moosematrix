# Changelog

All notable changes to `@moosematrix/tokens`. Versions follow semver; release tags are `tokens-vX.Y.Z`.

## 0.1.2 — unreleased

- Tests: use bracket-form event handler assignment in the render test (no runtime change).

## 0.1.1 — unreleased

Shared nav data, a framework-neutral header/footer builder, dark by default, and one theme writer.

- **Dark is the default.** `:root` is the dark palette with `color-scheme: dark`; `:root[data-theme="light"]` is light. The `prefers-color-scheme` block is gone, so the OS setting never picks the theme.
- **One theme cookie contract** (`theme-core.js`, bundled into `theme-init.js` and `nav.js` by `scripts/build.mjs`): `mm-theme=<dark|light>; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000`, written only when the visitor presses the toggle. Exact-name reader, raw `=== "light"` compare, no decoding; any other value is dark. Host-only copies from older writers are deleted on `/` and the current path when a duplicate or an old value (e.g. `system`) is seen. No server reads the cookie.
- **No-flash `theme-init.js`**, shipped content-hashed as `hashed/theme-init.<sha8>.js` with `hashed/manifest.json` (`current`, `previous`). Load it as the first child of `<head>`, synchronously. `previous` is `null` in 0.1.1 because 0.1.0 shipped no theme-init.
- **2-state toggle:** one `<button aria-pressed>` (pressed = light) with a visible "Light" label replaces System/Light/Dark, in the header and in the mobile menu.
- **`nav.json` + `nav.schema.json`:** the single source for the header and footer (Research, Moose Mumbles, Moo$e Money, Shop, About; Research children; per-site rows; hero topics; menu extras). Own https origins only.
- **`render.mjs`:** `renderHeader({ site, current, scope })` and `renderFooter()` return escaped HTML strings (zero deps, no DOM). Desktop and mobile menus come from the same list. `header.html` and `footer.html` are now generated from it.
- Nav links changed: Projects/Library/Lab move under Research; Shop points at `https://merch.moosematrix.com/`.

## 0.1.0 — unreleased

First version, from the v5 redesign.

- Design tokens as CSS custom properties (`tokens.css`), light and dark, with the shared `mm-theme` cookie behaviour.
- Tailwind CSS v4 theme (`theme.css`).
- Self-hosted fonts: Barlow Condensed ExtraBold, IBM Plex Sans Regular and Bold, IBM Plex Mono Regular (Latin-1 woff2, SIL OFL 1.1), with `SHA256SUMS`.
- Logos copied unchanged from `apps/moosematrix/public/brand`.
- Header with the moose-head nav, footer and search overlay as plain HTML, CSS and JS that run under a strict CSP.

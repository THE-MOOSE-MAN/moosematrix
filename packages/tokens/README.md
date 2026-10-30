# @moosematrix/tokens

The shared look of the Moose Matrix sites: design tokens, a Tailwind CSS v4 theme, self-hosted fonts, the logos, and the header (with the moose-head nav), footer and search overlay as plain HTML, CSS and JS.

Nothing here loads from a third party. There are no inline scripts or styles, so pages can keep a strict CSP (`script-src 'self'; style-src 'self'; font-src 'self'`). All links open in the same tab.

## What is in it

| File | What it is |
|---|---|
| `tokens.css` | CSS custom properties (`--mm-*`) for colour, type, space and shape. Light by default; dark from `prefers-color-scheme` or `<html data-theme="dark">`. |
| `theme.css` | Tailwind v4 `@theme inline` mapping, so `bg-ground`, `text-ink`, `font-display` and so on follow the live tokens. |
| `fonts.css`, `fonts/` | `@font-face` rules and four Latin-1 woff2 files (OFL 1.1). Sources and hashes: [`fonts/README.md`](fonts/README.md). |
| `brand/` | Logo SVGs, copied unchanged from `apps/moosematrix/public/brand`. `-dark` files are for dark backgrounds. |
| `header.html`, `header.css`, `nav.js` | Header partial. `nav.js` adds the theme switch, marks the current page and closes the menu on Esc. |
| `search.html`, `search.css`, `search.js` | Search overlay (a native `<dialog>`), opened from the header or with Ctrl+K / Cmd+K. |
| `footer.html`, `footer.css` | Footer partial. |
| `demo/` | Demo page built from the partials (`npm run build`). Not shipped in the tarball. |

Without JS everything still works: links are plain links, the small-screen menu is a `<details>` element, the theme follows the system setting, and search goes to `https://moosematrix.com/search/?q=`.

## Use it

Load the CSS in this order and the two scripts with `defer`:

```html
<link rel="preload" href="/mm/fonts/IBMPlexSans-Regular-Latin1.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/mm/fonts/BarlowCondensed-ExtraBold-Latin1.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/mm/fonts.css">
<link rel="stylesheet" href="/mm/tokens.css">
<link rel="stylesheet" href="/mm/header.css">
<link rel="stylesheet" href="/mm/search.css">
<link rel="stylesheet" href="/mm/footer.css">
<script src="/mm/nav.js" defer></script>
<script src="/mm/search.js" defer></script>
```

Paste `header.html` at the top of `<body>`, then your `<main id="main">`, then `search.html` and `footer.html`. To avoid a theme flash, render `<html data-theme="light|dark">` on the server from the `mm-theme` cookie when it is set.

Search reads `/search-index.json` by default. To read more than one index, list the URLs in `data-mm-index` on the `<dialog>`, separated by spaces. Cross-site indexes need CORS. Both `{ "version": 1, "items": [...] }` and a plain array work; each item needs `title` and `url`, and may have `type`, `site`, `summary` and `tags`. Items whose URL is not `https:` (or same-origin) are skipped, and all text is inserted as text, never as HTML.

With Tailwind v4:

```css
@import "tailwindcss";
@import "@moosematrix/tokens/tokens.css";
@import "@moosematrix/tokens/theme.css";
```

## Install from a tagged tarball

The package is `private` and is never published to npm. Each release is a tarball attached to a GitHub Release tagged `tokens-vX.Y.Z` in this repo. Pin that exact URL. npm records its sha512 `integrity` in your lockfile and refuses a tarball that does not match:

```sh
npm install https://github.com/THE-MOOSE-MAN/moosematrix/releases/download/tokens-v0.1.0/moosematrix-tokens-0.1.0.tgz
```

The release notes give the tarball's sha256 and sha512. After installing, check that the `integrity` in `package-lock.json` matches the sha512 in the release notes, and run `npm ci` in CI so a changed tarball fails the build. Update by changing the URL to a new tag on purpose. Never point at a branch.

To vendor the files instead (for a site with no npm step), download the tarball, check it, and unpack it:

```sh
curl -fsSLO https://github.com/THE-MOOSE-MAN/moosematrix/releases/download/tokens-v0.1.0/moosematrix-tokens-0.1.0.tgz
echo "<sha256 from the release notes>  moosematrix-tokens-0.1.0.tgz" | sha256sum -c
tar -xzf moosematrix-tokens-0.1.0.tgz   # unpacks to package/
(cd package/fonts && sha256sum -c SHA256SUMS)
```

Inside this repo, workspaces can depend on it as `"@moosematrix/tokens": "0.1.0"`.

## Checks

`npm run lint` (in `packages/tokens`) runs `scripts/check.mjs`: no inline script or style, no HTML-string DOM writes, no `target=`, no remote CSS URLs, matching version numbers, font hashes, logo path data, WCAG AA contrast for every text pair in both themes, and no public IP addresses. CI (`.github/workflows/ci.yml`) also runs link checks and axe on the demo at 360 px in light and dark.

## Licences

The fonts are under the SIL Open Font License 1.1 (`fonts/OFL-*.txt`). The logos and the rest of the package belong to The Moose Matrix, all rights reserved.

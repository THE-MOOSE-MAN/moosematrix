// @moosematrix/search 0.1.0 — renders the one search overlay as static HTML
// for a site's build (Astro partial, sync-tokens, SSR). Every value comes from
// fixed constants in search-core.mjs; anything interpolated is still escaped.
import { SCOPES, SITE_LABELS, MUMBLES_LINK_OUT, isSite } from "./search-core.mjs";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const SEARCH_ICON =
  '<svg class="mm-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20">' +
  '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
  '<path d="m20 20-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/**
 * @param {{ site?: string, index?: string, slash?: boolean }} opts
 *   site  — one of the four site ids (fixed build config, never user input)
 *   index — same-origin path of this site's index (default /search-index.json)
 *   slash — also open on "/" (single-key shortcut; off by default, WCAG 2.2 SC 2.1.4)
 */
export function renderOverlay({ site, index = "/search-index.json", slash = false } = {}) {
  if (!isSite(site)) throw new Error("renderOverlay: unknown site");
  if (typeof index !== "string" || !index.startsWith("/") || index.startsWith("//") || index.includes("\\")) {
    throw new Error("renderOverlay: index must be a same-origin absolute path");
  }
  const chips = SCOPES.map((s) => {
    if (s.linkOutUnlessSite && s.linkOutUnlessSite !== site) {
      return (
        `<a class="mm-scope mm-scope-link" href="${esc(MUMBLES_LINK_OUT)}" rel="noreferrer" referrerpolicy="no-referrer" data-mm-scope-link="${esc(s.id)}">` +
        `${esc(s.label)}<span class="mm-sr-only"> (opens search on ${esc(SITE_LABELS.mooseman)})</span></a>`
      );
    }
    const id = "mm-scope-" + s.id;
    return (
      `<span class="mm-scope"><input type="radio" name="mm-scope" id="${esc(id)}" value="${esc(s.id)}"` +
      `${s.id === "all" ? " checked" : ""}><label for="${esc(id)}">${esc(s.label)}</label></span>`
    );
  }).join("\n      ");

  return `<dialog class="mm-search" id="mm-search" aria-modal="true" aria-labelledby="mm-search-title" data-mm-site="${esc(site)}" data-mm-index="${esc(index)}"${slash === true ? ' data-mm-slash="on"' : ""}>
  <div class="mm-search-in">
    <div class="mm-search-top">
      <h2 class="mm-search-title" id="mm-search-title">Search ${esc(SITE_LABELS[site])}</h2>
      <button type="button" class="mm-search-close" data-mm-search-close>Close<span class="mm-sr-only"> search</span> <kbd aria-hidden="true">Esc</kbd></button>
    </div>
    <div class="mm-search-bar" role="search">
      <label class="mm-sr-only" for="mm-search-input">Search terms</label>
      ${SEARCH_ICON}
      <input id="mm-search-input" type="search" maxlength="128" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="Search" aria-describedby="mm-search-hint">
    </div>
    <fieldset class="mm-scopes">
      <legend class="mm-sr-only">Search in</legend>
      ${chips}
    </fieldset>
    <p class="mm-sr-only" id="mm-search-hint">Results update as you type. Use the up and down arrow keys to move through results.</p>
    <p class="mm-search-status" id="mm-search-status" role="status" aria-live="polite" aria-atomic="true" data-mm-search-status></p>
    <ul class="mm-search-results" aria-label="Search results" data-mm-search-results></ul>
  </div>
</dialog>
`;
}

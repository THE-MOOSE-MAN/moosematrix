import type { ListItem } from "../lib/catalog";

// One list UI for /library and /search. The full list is in the HTML, so it reads with JS off; /js/mm-list.js
// (same-origin, no inline script) adds filtering by ?q and ?type, the live count and the chip state.
// The markup is a static HTML string (all text escaped) so React never hydrates or re-renders what mm-list.js
// changes; otherwise the first hydration mismatch makes React rebuild the page and drop the filter state.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function IndexList({
  items,
  types,
  action,
  label,
  placeholder,
  emptyHtml,
}: {
  items: ListItem[];
  types: string[];
  action: string;
  label: string;
  placeholder: string;
  /** Trusted, static HTML written in this repo (no item data). */
  emptyHtml: string;
}) {
  const n = items.length;
  const chips = types.length > 1 && n > 0
    ? `<div class="mm-filters" data-mm-filters hidden><div class="mm-filter-row" role="group" aria-label="Filter by type">` +
      `<span class="mm-micro" aria-hidden="true">TYPE</span>` +
      `<button class="mm-chip-link" type="button" data-mm-type="" aria-pressed="true">All</button>` +
      types.map((t) => `<button class="mm-chip-link" type="button" data-mm-type="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join("") +
      `</div></div>`
    : "";
  const rows = items
    .map((it) => {
      const hay = [it.title, it.type, it.summary, ...(it.tags ?? [])].join(" ").toLowerCase();
      const kind = it.type + (it.status && it.status !== "published" ? ` · ${it.status}` : "");
      return `<li data-mm-type="${esc(it.type)}" data-mm-hay="${esc(hay)}"><a href="${esc(it.href)}">` +
        `<span class="mm-lib-kind mm-micro">${esc(kind)}</span><span class="mm-lib-title">${esc(it.title)}</span>` +
        `<span class="mm-lib-summary">${esc(it.summary)}</span></a></li>`;
    })
    .join("");
  const html =
    `<form class="mm-lib-form" role="search" action="${esc(action)}" method="get">` +
    `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` +
    `<label class="mm-sr-only" for="mm-list-q">${esc(label)}</label>` +
    `<input id="mm-list-q" name="q" type="search" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">` +
    `<button class="mm-lib-submit" type="submit"><span class="mm-sr-only">Search</span><span aria-hidden="true">→</span></button></form>` +
    chips +
    `<div class="mm-lib-meta"><p class="mm-micro mm-muted" data-mm-count aria-live="polite">${n} ${n === 1 ? "item" : "items"}</p>` +
    `<button class="mm-link-button" type="button" data-mm-clear hidden>Clear search</button></div>` +
    (n ? `<ul class="mm-lib-list" role="list">${rows}</ul>` : "") +
    `<div class="mm-empty" data-mm-empty${n ? " hidden" : ""}>${emptyHtml}</div>`;
  return <div className="mm-list" data-mm-list="" dangerouslySetInnerHTML={{ __html: html }} />;
}

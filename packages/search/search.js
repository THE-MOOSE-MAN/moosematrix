// @moosematrix/search 0.1.0 — the one search overlay (ES module, no deps).
// Strict-CSP and Trusted Types friendly: no inline script, no eval, no HTML
// sinks. DOM is built with createElement/textContent only; <mark> elements
// come from text ranges. The index is fetched once, on first open, from the
// same origin with credentials omitted; the query never leaves the browser.
import {
  CAPS, MUMBLES_LINK_OUT, SECTION_LABELS, SITE_LABELS, isSite, parseIndexText,
  pieces, prepare, readCapped, resolveScope, scopeById, search, statusText,
} from "./search-core.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const UNAVAILABLE = "Search is unavailable right now. Please try again later.";

function lockIcon(doc) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const body = doc.createElementNS(SVG_NS, "rect");
  for (const [k, v] of [["x", "5"], ["y", "11"], ["width", "14"], ["height", "10"], ["rx", "2"], ["fill", "currentColor"]]) body.setAttribute(k, v);
  const shackle = doc.createElementNS(SVG_NS, "path");
  for (const [k, v] of [["d", "M8 11V8a4 4 0 0 1 8 0v3"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "2"]]) shackle.setAttribute(k, v);
  svg.append(body, shackle);
  return svg;
}

function marked(doc, cls, text, ranges) {
  const span = doc.createElement("span");
  span.className = cls;
  for (const p of pieces(text, ranges)) {
    if (p.mark) {
      const m = doc.createElement("mark");
      m.textContent = p.text;
      span.append(m);
    } else span.append(doc.createTextNode(p.text));
  }
  return span;
}

export function mount(dialog, { win = window } = {}) {
  const doc = dialog.ownerDocument;
  const site = dialog.getAttribute("data-mm-site");
  const input = dialog.querySelector("#mm-search-input");
  const status = dialog.querySelector("[data-mm-search-status]");
  const list = dialog.querySelector("[data-mm-search-results]");
  if (!isSite(site) || !input || !status || !list || typeof dialog.showModal !== "function") return null;

  let indexUrl = null;
  try {
    const u = new URL(dialog.getAttribute("data-mm-index") || "/search-index.json", win.location.href);
    if (u.origin === win.location.origin) indexUrl = u.href;
  } catch { /* stays null: honest failure below */ }

  let state = "idle"; // idle | loading | ready | fail
  let entries = [];
  let loading = null;
  let returnTo = null;

  const radios = () => [...dialog.querySelectorAll('input[name="mm-scope"]')];
  const scope = () => (radios().find((r) => r.checked) || { value: "all" }).value;
  const links = () => [...list.querySelectorAll("a.mm-result")];

  function say(text) {
    if (status.textContent !== text) status.textContent = text;
  }

  function render() {
    const q = input.value;
    list.replaceChildren();
    if (state === "fail") return say(UNAVAILABLE);
    if (!q.trim()) return say("");
    if (state !== "ready") return say("Loading search…");
    const { total, results } = search(entries, q, scope());
    const frag = doc.createDocumentFragment();
    for (const r of results) {
      const it = r.item;
      const li = doc.createElement("li");
      const a = doc.createElement("a");
      a.className = "mm-result";
      a.href = it.url; // already passed safeUrl() during validation
      const meta = doc.createElement("span");
      meta.className = "mm-result-meta";
      meta.textContent = SITE_LABELS[it.site] + " · " + SECTION_LABELS[it.section];
      a.append(meta);
      if (it.access === "premium") {
        const lock = doc.createElement("span");
        lock.className = "mm-result-lock";
        lock.append(lockIcon(doc), doc.createTextNode("Premium"));
        a.append(lock);
      }
      a.append(marked(doc, "mm-result-title", it.title, r.titleMarks));
      if (it.summary) a.append(marked(doc, "mm-result-summary", it.summary, r.summaryMarks));
      li.append(a);
      frag.append(li);
    }
    list.append(frag);
    say(statusText(total, scope()));
  }

  async function load() {
    if (loading) return loading;
    state = "loading";
    loading = (async () => {
      try {
        if (!indexUrl) throw new Error("bad-index-url");
        const res = await win.fetch(indexUrl, {
          credentials: "omit",
          mode: "same-origin",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error("http");
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.startsWith("application/json")) throw new Error("type");
        const parsed = parseIndexText(await readCapped(res, CAPS.responseBytes), site);
        if (!parsed.ok) throw new Error(parsed.reason);
        entries = prepare(parsed.items);
        state = "ready";
      } catch {
        entries = [];
        state = "fail";
      }
      render();
    })();
    return loading;
  }

  function setScope(id) {
    const want = resolveScope(id, site);
    for (const r of radios()) r.checked = r.value === want;
  }

  function open(trigger, requested) {
    if (requested === "mumbles" && site !== "mooseman") {
      // fixed constant, same tab, no Referer: a noreferrer anchor click instead of location.assign
      const a = doc.createElement("a");
      a.href = MUMBLES_LINK_OUT;
      a.rel = "noreferrer";
      a.referrerPolicy = "no-referrer";
      a.click();
      return;
    }
    if (dialog.open) return;
    returnTo = trigger || doc.activeElement;
    setScope(requested || doc.body.getAttribute("data-mm-scope") || "all");
    dialog.showModal();
    input.focus();
    if (state === "idle") load();
    else render();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", () => {
    const t = returnTo;
    returnTo = null;
    if (t && t.isConnected && typeof t.focus === "function") t.focus();
  });

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close(); // backdrop
    else if (e.target.closest && e.target.closest("[data-mm-search-close]")) close();
  });

  input.addEventListener("input", render);
  for (const r of radios()) r.addEventListener("change", render);

  function focusables() {
    return [...dialog.querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")].filter(
      (el) => !(el.type === "radio" && !el.checked) && el.getClientRects().length > 0,
    );
  }

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      const f = focusables();
      if (!f.length) return;
      const i = f.indexOf(doc.activeElement);
      if (e.shiftKey && (i <= 0)) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) {
        e.preventDefault();
        f[0].focus();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const ls = links();
      const t = doc.activeElement;
      const i = ls.indexOf(t);
      if (t === input && e.key === "ArrowDown" && ls.length) {
        e.preventDefault();
        ls[0].focus();
      } else if (i >= 0) {
        e.preventDefault();
        if (e.key === "ArrowDown") ls[Math.min(i + 1, ls.length - 1)].focus();
        else if (i === 0) input.focus();
        else ls[i - 1].focus();
      }
      return;
    }
    if (e.key === "Enter" && doc.activeElement === input) {
      const first = links()[0];
      if (first) {
        e.preventDefault();
        first.click();
      }
    }
  });

  doc.addEventListener("click", (e) => {
    const t = e.target.closest ? e.target.closest("[data-mm-search-open]") : null;
    if (!t || dialog.contains(t)) return;
    e.preventDefault();
    open(t, t.getAttribute("data-mm-scope"));
  });

  const slash = dialog.getAttribute("data-mm-slash") === "on";
  doc.addEventListener("keydown", (e) => {
    if (dialog.open || e.defaultPrevented || e.isComposing) return;
    const k = typeof e.key === "string" ? e.key.toLowerCase() : "";
    if (k === "k" && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      open(null, null);
      return;
    }
    if (slash && e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const a = doc.activeElement;
      const editable = a && (a.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(a.tagName));
      if (editable) return;
      e.preventDefault();
      open(null, null);
    }
  });

  // Moose Mumbles link-out lands here: ?mm-scope=<scope> opens pre-scoped.
  if (site === "mooseman") {
    const want = new URLSearchParams(win.location.search).get("mm-scope");
    if (want && scopeById(want) && resolveScope(want, site) === want) open(null, want);
  }

  return { open: (scopeId) => open(null, scopeId), close, load };
}

if (typeof document !== "undefined") {
  const dialog = document.getElementById("mm-search");
  if (dialog) mount(dialog);
}

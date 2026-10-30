// @moosematrix/tokens 0.1.1 — search overlay. Load with <script src=".../search.js" defer></script>.
// Uses the native <dialog> (showModal makes the rest of the page inert, keeps focus inside, closes on Esc).
// Untrusted index data is only ever written with textContent; URLs are kept only if they are https:
// or same-origin. Index files are fetched with credentials omitted. Without JS (or <dialog>) the
// header link and the form go to the /search/ page in the same tab.
(function () {
  "use strict";

  var dialog = document.getElementById("mm-search");
  if (!dialog || typeof dialog.showModal !== "function") return;

  var form = dialog.querySelector("form");
  var input = dialog.querySelector('input[name="q"]');
  var list = dialog.querySelector("[data-mm-results]");
  var status = dialog.querySelector("[data-mm-status], .mm-search-status");
  if (!form || !input || !list || !status) return;

  var MAX_RESULTS = 8;
  var sources = (dialog.getAttribute("data-mm-index") || "/search-index.json").split(/\s+/).filter(Boolean);
  var items = null;
  var loading = null;
  var failed = false;
  var opener = null;

  function safeUrl(value) {
    try {
      var u = new URL(String(value), window.location.href);
      if (u.protocol === "https:") return u.href;
      if (u.origin === window.location.origin && u.protocol === "http:") return u.href;
    } catch (e) {
      /* invalid URL: drop the item */
    }
    return null;
  }

  function text(value, max) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function normalise(data) {
    var raw = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var e = raw[i] || {};
      var url = safeUrl(e.url);
      var title = text(e.title, 200);
      if (!url || !title) continue;
      var tags = Array.isArray(e.tags) ? e.tags.filter(function (t) { return typeof t === "string"; }) : [];
      out.push({
        url: url,
        title: title,
        type: text(e.type, 40),
        site: text(e.site, 40),
        summary: text(e.summary, 300),
        hay: [title, e.type, e.site, e.summary, tags.join(" ")].join(" ").toLowerCase()
      });
    }
    return out;
  }

  function load() {
    if (loading) return loading;
    loading = Promise.all(
      sources.map(function (src) {
        var url = safeUrl(src);
        if (!url) return [];
        return fetch(url, { credentials: "omit", mode: "cors" })
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
          })
          .then(normalise)
          .catch(function () {
            failed = true;
            return [];
          });
      })
    ).then(function (parts) {
      items = [].concat.apply([], parts);
      return items;
    });
    return loading;
  }

  function searchPageUrl(q) {
    var u = new URL(form.getAttribute("action") || "/search/", window.location.href);
    u.searchParams.set("q", q);
    return u.href;
  }

  function el(tag, cls, value) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value) node.textContent = value;
    return node;
  }

  function render() {
    var q = input.value.trim();
    list.replaceChildren();
    if (!q) {
      status.textContent = "";
      return;
    }
    if (!items) {
      status.textContent = "Loading…";
      return;
    }
    var words = q.toLowerCase().split(/\s+/);
    var hits = items.filter(function (it) {
      return words.every(function (w) { return it.hay.indexOf(w) !== -1; });
    });
    var shown = hits.slice(0, MAX_RESULTS);
    for (var i = 0; i < shown.length; i++) {
      var it = shown[i];
      var li = el("li");
      var a = el("a");
      a.href = it.url;
      var meta = [it.site, it.type].filter(Boolean).join(" · ");
      if (meta) a.append(el("span", "mm-result-meta", meta));
      a.append(el("span", "mm-result-title", it.title));
      if (it.summary) a.append(el("span", "mm-result-summary", it.summary));
      li.append(a);
      list.append(li);
    }
    var all = el("li");
    var more = el("a", null, "See all results for “" + q + "”");
    more.href = searchPageUrl(q);
    all.append(more);
    list.append(all);
    if (hits.length) {
      status.textContent = hits.length === 1 ? "1 result" : hits.length + " results" + (hits.length > MAX_RESULTS ? ", showing " + MAX_RESULTS : "");
    } else {
      status.textContent = failed && !items.length ? "Quick results are unavailable. Press Enter to search." : "No quick results. Press Enter to search.";
    }
  }

  function open(from) {
    if (dialog.open) return;
    opener = from || document.activeElement;
    dialog.showModal();
    input.focus();
    input.select();
    load().then(render);
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", function () {
    if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    opener = null;
  });

  // Clicking the backdrop (the dialog box itself, outside .mm-search-in) closes it.
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("click", function (event) {
    var t = event.target instanceof Element ? event.target : null;
    if (!t) return;
    if (t.closest("[data-mm-search-close]")) {
      close();
      return;
    }
    var chip = t.closest("[data-mm-query]");
    if (chip) {
      input.value = chip.getAttribute("data-mm-query") || "";
      input.focus();
      load().then(render);
    }
  });

  input.addEventListener("input", render);

  // One Esc always closes, even when the search field has text (Chrome would otherwise only clear it).
  dialog.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  // Upgrade every /search/ link marked data-mm-search-open into an overlay opener.
  var triggers = document.querySelectorAll("[data-mm-search-open]");
  for (var i = 0; i < triggers.length; i++) {
    triggers[i].setAttribute("aria-haspopup", "dialog");
    triggers[i].addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      var menu = this.closest("details");
      if (menu) menu.open = false;
      open(this.closest("details") ? menu.querySelector("summary") : this);
    });
  }

  // Ctrl+K / Cmd+K toggles the overlay. (No single-key shortcut: WCAG 2.1.4.)
  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (event.key === "k" || event.key === "K")) {
      event.preventDefault();
      if (dialog.open) close();
      else open(document.activeElement);
    }
  });
})();

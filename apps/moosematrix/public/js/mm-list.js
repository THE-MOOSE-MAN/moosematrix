/* /library and /search filtering. Progressive enhancement over the server-rendered list; no network, no storage. */
(function () {
  "use strict";
  var root = document.querySelector("[data-mm-list]");
  if (!root) return;
  var form = root.querySelector("form");
  var input = root.querySelector('input[name="q"]');
  var rows = root.querySelectorAll("li[data-mm-hay]");
  var chips = root.querySelectorAll("button[data-mm-type]");
  var countEl = root.querySelector("[data-mm-count]");
  var clear = root.querySelector("[data-mm-clear]");
  var empty = root.querySelector("[data-mm-empty]");
  var filters = root.querySelector("[data-mm-filters]");
  if (filters) filters.hidden = false;

  var params = new URLSearchParams(location.search);
  var q = (params.get("q") || "").slice(0, 200);
  var type = params.get("type") || "";
  var known = false;
  for (var i = 0; i < chips.length; i++) if (chips[i].getAttribute("data-mm-type") === type) known = true;
  if (!known) type = "";
  input.value = q;

  function apply(push) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var hay = rows[i].getAttribute("data-mm-hay");
      var ok = (!type || rows[i].getAttribute("data-mm-type") === type) &&
        terms.every(function (t) { return hay.indexOf(t) !== -1; });
      rows[i].hidden = !ok;
      if (ok) shown++;
    }
    for (var j = 0; j < chips.length; j++) {
      chips[j].setAttribute("aria-pressed", String(chips[j].getAttribute("data-mm-type") === type));
    }
    var filtered = Boolean(q || type);
    countEl.textContent = filtered ? shown + " of " + rows.length + " shown" : rows.length + (rows.length === 1 ? " item" : " items");
    if (empty) empty.hidden = shown > 0;
    if (clear) clear.hidden = !filtered;
    if (push) {
      var p = new URLSearchParams();
      if (q) p.set("q", q);
      if (type) p.set("type", type);
      var s = p.toString();
      history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
    }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); q = input.value.trim().slice(0, 200); apply(true); });
  input.addEventListener("input", function () { q = input.value.trim().slice(0, 200); apply(true); });
  for (var k = 0; k < chips.length; k++) {
    chips[k].addEventListener("click", function () { type = this.getAttribute("data-mm-type"); apply(true); });
  }
  if (clear) clear.addEventListener("click", function () { q = ""; type = ""; input.value = ""; apply(true); input.focus(); });
  apply(false);
})();

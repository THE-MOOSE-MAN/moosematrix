// @moosematrix/tokens 0.1.0 — header behaviour. Load with <script src=".../nav.js" defer></script>.
// No inline script or style is needed, so it works under a strict CSP (script-src 'self').
// Everything here is an enhancement: without JS the links, the <details> menu and system theme still work.
//
// Theme: same shared preference as packages/ui ThemeToggle, the "mm-theme" cookie
// (light | dark; absent = system), Domain=.moosematrix.com on moosematrix hosts, 1 year, SameSite=Lax.
// For no flash on first paint, render <html data-theme="..."> on the server from the cookie;
// this script also applies the cookie on load for pages that cannot.
(function () {
  "use strict";

  var COOKIE = "mm-theme";
  var ONE_YEAR = 60 * 60 * 24 * 365;
  var COLORS = { light: "#f7f6f3", dark: "#070b13" };
  var root = document.documentElement;

  function readCookie() {
    var parts = document.cookie ? document.cookie.split(";") : [];
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].trim().split("=");
      if (kv[0] === COOKIE) {
        var v = kv.slice(1).join("=");
        return v === "light" || v === "dark" ? v : "system";
      }
    }
    return null;
  }

  function readMode() {
    var v = root.getAttribute("data-theme");
    return v === "light" || v === "dark" ? v : "system";
  }

  function writeCookie(mode) {
    var h = window.location.hostname;
    var shared = h === "moosematrix.com" || h.slice(-16) === ".moosematrix.com";
    var secure = window.location.protocol === "https:";
    var attrs = (shared ? "; Domain=.moosematrix.com" : "") + "; Path=/; SameSite=Lax" + (secure ? "; Secure" : "");
    if (shared) document.cookie = COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax"; // drop a legacy host-only cookie
    document.cookie = mode === "system"
      ? COOKIE + "=" + attrs + "; Max-Age=0"
      : COOKIE + "=" + mode + attrs + "; Max-Age=" + ONE_YEAR;
  }

  function applyMode(mode) {
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
    var meta = document.getElementById("mm-theme-color");
    if (mode === "system") {
      if (meta) meta.remove();
      return;
    }
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.id = "mm-theme-color";
      document.head.prepend(meta);
    }
    meta.content = COLORS[mode];
  }

  function syncGroups() {
    var mode = readMode();
    var buttons = document.querySelectorAll("[data-mm-theme] [data-theme-set]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-theme-set") === mode));
    }
  }

  // Apply a saved choice if the server did not.
  var saved = readCookie();
  if (saved && !root.hasAttribute("data-theme")) applyMode(saved);

  var groups = document.querySelectorAll("[data-mm-theme]");
  for (var g = 0; g < groups.length; g++) {
    groups[g].hidden = false;
    groups[g].addEventListener("click", function (event) {
      var btn = event.target instanceof Element ? event.target.closest("[data-theme-set]") : null;
      if (!btn) return;
      var mode = btn.getAttribute("data-theme-set");
      if (mode !== "system" && mode !== "light" && mode !== "dark") return;
      applyMode(mode);
      writeCookie(mode);
      syncGroups();
    });
  }
  syncGroups();

  // Mark the current section in both navs (same-host, path-prefix match; "/" only matches itself).
  var here = window.location;
  var links = document.querySelectorAll(".mm-nav a[href], .mm-menu-nav a[href]");
  for (var l = 0; l < links.length; l++) {
    var url;
    try {
      url = new URL(links[l].getAttribute("href"), here.href);
    } catch (e) {
      continue;
    }
    if (url.host !== here.host || url.pathname === "/") continue;
    if (here.pathname === url.pathname || here.pathname.indexOf(url.pathname) === 0) {
      links[l].setAttribute("aria-current", "page");
    }
  }

  // Menu: close on Escape (focus back to the toggle), on outside click, on link activation, and past the breakpoint.
  var menus = document.querySelectorAll(".mm-menu");
  function closeAll(except) {
    for (var m = 0; m < menus.length; m++) if (menus[m] !== except) menus[m].open = false;
  }
  for (var k = 0; k < menus.length; k++) {
    (function (menu) {
      menu.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && menu.open) {
          menu.open = false;
          var summary = menu.querySelector("summary");
          if (summary) summary.focus();
        }
      });
      menu.addEventListener("click", function (event) {
        if (event.target instanceof Element && event.target.closest(".mm-menu-nav a")) menu.open = false;
      });
    })(menus[k]);
  }
  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element) || !event.target.closest(".mm-menu")) closeAll(null);
  });
  if (window.matchMedia) {
    var wide = window.matchMedia("(min-width: 751px)");
    var onWide = function () {
      if (wide.matches) closeAll(null);
    };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
  }
})();

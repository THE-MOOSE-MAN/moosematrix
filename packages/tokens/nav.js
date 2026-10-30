// @moosematrix/tokens 0.1.1 — header behaviour. Load with <script src=".../nav.js" defer></script>.
// No inline script or style is needed, so it works under a strict CSP (script-src 'self').
// Everything here is an enhancement: without JS the links and the <details> menu work and the page is dark.
//
// Theme: a 2-state toggle (<button aria-pressed>, pressed = light). It is the only interactive writer of the
// shared "mm-theme" cookie; theme-init.js applies the saved value before first paint. Both use the same
// theme-core.js block below (see theme-core.js for the cookie contract).
(function () {
  "use strict";
  // BEGIN theme-core.js (copied by scripts/build.mjs; edit theme-core.js, not this block)
  var MM_THEME_LIGHT = "mm-theme=light; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";
  var MM_THEME_DARK = "mm-theme=dark; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";
  var MM_THEME_COLOR_LIGHT = "#f7f6f3";
  var MM_THEME_COLOR_DARK = "#070b13";

  function mmThemeValues(cookies) {
    var re = /(?:^|;\s*)mm-theme=([^;]*)/g;
    var out = [];
    var m;
    var s = typeof cookies === "string" ? cookies : "";
    while ((m = re.exec(s)) !== null) out.push(m[1]);
    return out;
  }

  function mmThemeRead(cookies) {
    var v = mmThemeValues(cookies);
    for (var i = 0; i < v.length; i++) if (v[i] === "light") return "light";
    return "dark";
  }

  function mmThemeHostPaths(pathname) {
    var out = ["/"];
    var p = typeof pathname === "string" ? pathname : "/";
    if (!/^\/[A-Za-z0-9._~%\/-]*$/.test(p)) return out;
    var dir = p.lastIndexOf("/") > 0 ? p.slice(0, p.lastIndexOf("/")) : "/";
    if (out.indexOf(dir) < 0) out.push(dir);
    if (out.indexOf(p) < 0) out.push(p);
    return out;
  }

  function mmThemeDeleteHostOnly(doc, pathname) {
    var paths = mmThemeHostPaths(pathname);
    for (var i = 0; i < paths.length; i++) doc.cookie = "mm-theme=; Path=" + paths[i] + "; Max-Age=0; Secure; SameSite=Lax";
  }

  function mmThemeMigrate(doc, pathname) {
    var v = mmThemeValues(doc.cookie);
    var odd = v.length > 1;
    for (var i = 0; i < v.length; i++) if (v[i] !== "light" && v[i] !== "dark") odd = true;
    if (odd) mmThemeDeleteHostOnly(doc, pathname);
    return odd;
  }

  function mmThemeApply(doc, mode) {
    var root = doc.documentElement;
    if (mode === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    var metas = doc.querySelectorAll ? doc.querySelectorAll('meta[name="theme-color"]') : [];
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", mode === "light" ? MM_THEME_COLOR_LIGHT : MM_THEME_COLOR_DARK);
  }

  function mmThemeWrite(doc, mode, pathname) {
    mmThemeDeleteHostOnly(doc, pathname);
    doc.cookie = mode === "light" ? MM_THEME_LIGHT : MM_THEME_DARK;
  }
  // END theme-core.js

  var root = document.documentElement;
  var toggles = document.querySelectorAll("[data-mm-theme-toggle]");

  function syncToggles() {
    var pressed = root.getAttribute("data-theme") === "light" ? "true" : "false";
    for (var i = 0; i < toggles.length; i++) toggles[i].setAttribute("aria-pressed", pressed);
  }

  // Same reader as theme-init.js (covers a page that lacks it); reading never writes.
  mmThemeApply(document, mmThemeRead(document.cookie));

  for (var t = 0; t < toggles.length; t++) {
    toggles[t].addEventListener("click", function () {
      var mode = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      mmThemeApply(document, mode);
      mmThemeWrite(document, mode, window.location.pathname);
      syncToggles();
    });
  }
  var groups = document.querySelectorAll("[data-mm-theme]");
  for (var g = 0; g < groups.length; g++) groups[g].hidden = false;
  syncToggles();

  // Mark the current section in both navs when the page did not (same-host, path-prefix match; "/" only matches
  // itself). renderHeader({ current }) marks it at build time; then this does nothing.
  var here = window.location;
  var links = document.querySelectorAll(".mm-nav a[href], .mm-menu-nav a[href]");
  var marked = document.querySelector(".mm-nav [aria-current], .mm-menu-nav [aria-current]");
  for (var l = 0; l < links.length && !marked; l++) {
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

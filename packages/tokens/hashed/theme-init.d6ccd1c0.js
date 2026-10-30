// @moosematrix/tokens 0.1.2 — theme-init: applies the saved theme before first paint.
// Load as the FIRST child of <head>, synchronously (no async/defer), from the content-hashed copy:
//   <script src="/mm/theme-init.<sha8>.js"></script>   (hashed/manifest.json names the current file)
// Works under script-src 'self' (no inline script, no hash). Without JS, or with no cookie, the page is dark.
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
  try {
    mmThemeMigrate(document, window.location.pathname);
    if (mmThemeRead(document.cookie) === "light") document.documentElement.setAttribute("data-theme", "light");
  } catch (e) {
    // Never block the page: dark is the safe default.
  }
})();

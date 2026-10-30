// @moosematrix/tokens 0.1.2 — theme-core: the one reader and writer of the shared "mm-theme" cookie.
// Not loaded on its own: scripts/build.mjs copies this block verbatim into theme-init.js (first paint)
// and nav.js (the toggle), between the "theme-core.js" markers, and a test checks both copies match.
//
// Contract:
//  - Writer: exactly "mm-theme=<dark|light>; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000".
//    Fixed strings only, written only after the visitor presses the toggle. 1 bit: colour only, no identifier.
//  - Reader: exact-name match over document.cookie; the raw value is compared with === "light", never decoded.
//    If any mm-theme value is "light" the theme is light; anything else (absent, "dark", "system", junk) is dark.
//  - DOM: only the constant data-theme="light" is ever written; theme-color uses the literal colours below.
//  - Migration: host-only copies (set by older writers without Domain) are deleted on Path=/ and on the current
//    path. This is the only write that happens without a click, and only when a duplicate or a non light/dark
//    value is present.
//  - No server reads this cookie. The OS colour-scheme setting is never used.
var MM_THEME_LIGHT = "mm-theme=light; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";
var MM_THEME_DARK = "mm-theme=dark; Domain=.moosematrix.com; Path=/; Secure; SameSite=Lax; Max-Age=31536000";
var MM_THEME_COLOR_LIGHT = "#f7f6f3";
var MM_THEME_COLOR_DARK = "#070b13";

// Every raw mm-theme value in a cookie string, in order. Exact name: "xmm-theme" and "mm-theme-old" never match.
function mmThemeValues(cookies) {
  var re = /(?:^|;\s*)mm-theme=([^;]*)/g;
  var out = [];
  var m;
  var s = typeof cookies === "string" ? cookies : "";
  while ((m = re.exec(s)) !== null) out.push(m[1]);
  return out;
}

// "light" if any value is exactly "light", else "dark".
function mmThemeRead(cookies) {
  var v = mmThemeValues(cookies);
  for (var i = 0; i < v.length; i++) if (v[i] === "light") return "light";
  return "dark";
}

// Paths a host-only copy may live on: "/", the current path and its directory (the cookie default path).
// A path with characters outside a safe set is skipped, so a crafted URL can't add cookie attributes.
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

// Migration: only when the cookie string shows a duplicate or a value that is neither light nor dark.
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

// The one interactive writer: called by nav.js when the visitor presses the toggle.
function mmThemeWrite(doc, mode, pathname) {
  mmThemeDeleteHostOnly(doc, pathname);
  doc.cookie = mode === "light" ? MM_THEME_LIGHT : MM_THEME_DARK;
}

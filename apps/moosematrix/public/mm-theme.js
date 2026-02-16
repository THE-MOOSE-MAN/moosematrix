(() => {
  const KEY = "mm-theme";
  const root = document.documentElement;

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[$()*+.?[\\\]^{|}-]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value, maxAgeSeconds) {
    const secure = location.protocol === "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1";
    document.cookie =
      `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax` +
      (secure ? "; Secure" : "");
  }

  function delCookie(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  function apply(mode) {
    if (mode === "light" || mode === "dark") root.dataset.theme = mode;
    else root.removeAttribute("data-theme");
  }

  // Init from cookie only
  try {
    const v = getCookie(KEY);
    apply(v);
  } catch {
    // If cookies unavailable, do nothing (system will win via CSS)
  }

  // Optional: click handler cycles system -> light -> dark
  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!btn) return;

    const cur = root.dataset.theme === "light" ? "light" : root.dataset.theme === "dark" ? "dark" : "system";
    const next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";

    apply(next);

    try {
      if (next === "system") delCookie(KEY);
      else setCookie(KEY, next, 60 * 60 * 24 * 365);
    } catch {}
  });
})();

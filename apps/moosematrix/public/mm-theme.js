(() => {
  const KEY = "mm-theme";
  const root = document.documentElement;

  function preferredTheme() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }

  try {
    const stored = localStorage.getItem(KEY);
    apply(stored || preferredTheme());
  } catch (_) {
    apply("light");
  }

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!btn) return;

    const cur = root.dataset.theme === "dark" ? "dark" : "light";
    const next = cur === "dark" ? "light" : "dark";
    apply(next);

    try {
      localStorage.setItem(KEY, next);
    } catch (_) {}
  });
})();

"use client";

// Header theme toggle: same markup, classes and behaviour as the m2 / merch header toggle
// (/workspace/design/theme-v2.js), and the same persisted preference as the footer ThemeLink chips:
// the shared "mm-theme" cookie (light | dark; absent = system), Domain=.moosematrix.com, 1 year, SameSite=Lax.
// The pre-paint init script in layout.tsx still applies the saved choice before first paint (no flash);
// this component only reacts to clicks, so it adds no new inline script.
// Progressive enhancement: rendered invisible (space reserved, so no layout shift) and shown after hydration; without JS the footer chips
// (plain links to /theme?set=...) still work.

import * as React from "react";

type ThemeMode = "system" | "light" | "dark";
const COOKIE = "mm-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;
const COLORS = { light: "#f7f6f3", dark: "#070b13" } as const;

function readMode(): ThemeMode {
  const v = document.documentElement.getAttribute("data-theme");
  return v === "light" || v === "dark" ? v : "system";
}

function writeCookie(mode: ThemeMode) {
  const h = window.location.hostname;
  const shared = h === "moosematrix.com" || h.endsWith(".moosematrix.com");
  const secure = window.location.protocol === "https:";
  const attrs = (shared ? "; Domain=.moosematrix.com" : "") + "; Path=/; SameSite=Lax" + (secure ? "; Secure" : "");
  if (shared) document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`; // drop legacy host-only cookie
  document.cookie = mode === "system" ? `${COOKIE}=${attrs}; Max-Age=0` : `${COOKIE}=${mode}${attrs}; Max-Age=${ONE_YEAR}`;
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  // The init script prepends meta#mm-theme-color for an explicit choice; keep it in sync without
  // touching the React-managed scheme-specific metas.
  let meta = document.getElementById("mm-theme-color") as HTMLMetaElement | null;
  if (mode === "system") {
    meta?.remove();
  } else {
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.id = "mm-theme-color";
      document.head.prepend(meta);
    }
    meta.content = COLORS[mode];
  }
}

const OPTIONS: { mode: ThemeMode; label: string; title: string; icon: React.ReactNode }[] = [
  {
    mode: "system",
    label: "System",
    title: "Match system",
    icon: (
      <>
        <path d="M4 5h16v10H4z" />
        <path d="M8 19h8" />
        <path d="M12 15v4" />
      </>
    ),
  },
  {
    mode: "light",
    label: "Light",
    title: "Light theme",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </>
    ),
  },
  {
    mode: "dark",
    label: "Dark",
    title: "Dark theme",
    icon: <path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8z" />,
  },
];

export function ThemeToggle() {
  const [ready, setReady] = React.useState(false);
  const [mode, setMode] = React.useState<ThemeMode>("system");
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    setMode(readMode());
    setReady(true);
    // Pick up a choice made on another *.moosematrix.com tab when this one is shown again.
    const resync = () => { if (!document.hidden) setMode(readMode()); };
    document.addEventListener("visibilitychange", resync);
    // Keep every toggle on the page in step (the header has one in the bar and one in the phone Menu).
    const mo = new MutationObserver(() => setMode(readMode()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      document.removeEventListener("visibilitychange", resync);
      mo.disconnect();
    };
  }, []);

  const choose = (next: ThemeMode) => {
    writeCookie(next);
    applyMode(next);
    setMode(next);
    setStatus(`Theme: ${next}`);
  };

  return (
    <div className="mm-theme-toggle" role="group" aria-label="Color theme" data-ready={ready ? "" : undefined}>
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          type="button"
          data-theme-set={o.mode}
          aria-pressed={mode === o.mode}
          title={o.title}
          onClick={() => choose(o.mode)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {o.icon}
          </svg>
          <span className="mm-tt-label">{o.label}</span>
        </button>
      ))}
      <span className="mm-sr-only" aria-live="polite">{status}</span>
    </div>
  );
}

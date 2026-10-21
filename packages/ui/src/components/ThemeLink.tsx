"use client";

import * as React from "react";

type ThemeMode = "system" | "light" | "dark";

const COOKIE = "mm-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

function safeId(raw?: string) {
  if (!raw) return null;
  const v = raw.trim();
  if (!/^[A-Za-z][A-Za-z0-9\-_:.]*$/.test(v)) return null;
  return v;
}

function isLocalhost() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function isSharedHost() {
  const h = window.location.hostname;
  return h === "moosematrix.com" || h.endsWith(".moosematrix.com");
}

// Shared across all *.moosematrix.com sites (m2, merch read and write the same cookie).
function setThemeCookie(mode: ThemeMode) {
  // Non-sensitive cookie; SameSite=Lax is appropriate for preference persistence.
  const shared = isSharedHost();
  const secure = window.location.protocol === "https:" && !isLocalhost();
  const attrs = (shared ? "; Domain=.moosematrix.com" : "") + "; Path=/; SameSite=Lax" + (secure ? "; Secure" : "");

  // Drop any legacy host-only cookie first so it can't shadow the shared one.
  if (shared) document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;

  if (mode === "system") {
    document.cookie = `${COOKIE}=${attrs}; Max-Age=0`;
    return;
  }
  document.cookie = `${COOKIE}=${encodeURIComponent(mode)}${attrs}; Max-Age=${ONE_YEAR}`;
}

function applyThemeToDom(mode: ThemeMode) {
  const el = document.documentElement;
  if (mode === "light" || mode === "dark") el.setAttribute("data-theme", mode);
  else el.removeAttribute("data-theme");
}

function getReturnTo(containerId = "mm-snap", returnToId?: string) {
  const base = window.location.pathname + window.location.search;

  const forced = safeId(returnToId);
  if (forced) return `${base}#${forced}`;

  if (window.location.hash) return base + window.location.hash;

  const container = document.getElementById(containerId);
  if (!container) return base;

  const sections = Array.from(container.querySelectorAll<HTMLElement>("section[id]"));
  if (!sections.length) return base;

  // If the container is not the actual scroll root (mobile doc-scroll),
  // scrollTop will be 0 — returning to top is acceptable. Desktop uses inner scroll.
  const probe = container.scrollTop + container.clientHeight * 0.35;
  let active = sections[0];
  for (const s of sections) if (s.offsetTop <= probe) active = s;

  return `${base}#${active.id}`;
}

export function ThemeLink({
  set,
  className,
  children,
  containerId = "mm-snap",
  returnToId,
}: {
  set: ThemeMode;
  className?: string;
  children: React.ReactNode;
  containerId?: string;
  returnToId?: string;
}) {
  const href = `/theme?set=${encodeURIComponent(set)}`;

  const onClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      )
        return;

      e.preventDefault();

      // Apply immediately to avoid any flash while navigating.
      applyThemeToDom(set);

      const next = getReturnTo(containerId, returnToId);

      // ✅ Local dev: avoid Express rewrite of /theme (wrong port + Secure cookie on HTTP)
      if (isLocalhost() && window.location.protocol === "http:") {
        setThemeCookie(set);
        window.location.assign(next);
        return;
      }

      // ✅ Non-local / HTTPS: keep server route behavior (still writes cookie server-side)
      // Also set cookie client-side as a fast-path (harmless redundancy).
      setThemeCookie(set);

      const url = new URL(href, window.location.origin);
      url.searchParams.set("next", next);
      window.location.assign(url.toString());
    },
    [href, containerId, returnToId, set]
  );

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

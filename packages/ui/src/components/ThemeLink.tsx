"use client";

import * as React from "react";

type ThemeMode = "system" | "light" | "dark";

function getReturnTo(containerId = "mm-snap") {
  const base = window.location.pathname + window.location.search;

  // preserve explicit hash if already present
  if (window.location.hash) return base + window.location.hash;

  // infer current section from scroll container
  const container = document.getElementById(containerId);
  if (!container) return base;

  const sections = Array.from(container.querySelectorAll<HTMLElement>("section[id]"));
  if (!sections.length) return base;

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
}: {
  set: ThemeMode;
  className?: string;
  children: React.ReactNode;
  containerId?: string;
}) {
  const href = `/theme?set=${encodeURIComponent(set)}`;

  const onClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // allow new-tab / modified clicks
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

      const url = new URL(href, window.location.origin);
      url.searchParams.set("next", getReturnTo(containerId));

      window.location.assign(url.toString());
    },
    [href, containerId]
  );

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

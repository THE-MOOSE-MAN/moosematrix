"use client";

// Shared Moose Matrix top nav: same pattern, order and labels on moosematrix.com, m2.moosematrix.com and
// merch.moosematrix.com (see /workspace/brand-2026-10-21/nav/). Row 1: brand (links home) + studio sites +
// theme toggle (+ Menu on phones: a native <details>, works without JS). Row 2: this site's own pages.
// Current page: aria-current ("page", or "true" for the current site while on one of its sub-pages) plus an
// accent underline. usePathname() runs during static prerender, so aria-current is in the HTML.

import { BrandLogo } from "./BrandLogo";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ThemeToggle } from "@moosematrix/ui";

type L = { href: string; label: string; self?: boolean };
type Cur = "page" | "true" | undefined;

const STUDIO: L[] = [
  { href: "/", label: "Home", self: true },
  // Outcome-worded labels, identical to the homepage cards (structure unchanged).
  { href: "https://merch.moosematrix.com/", label: "Shop" },
  { href: "https://mooseman.moosematrix.com/", label: "Write-ups" },
  { href: "https://m2.moosematrix.com/", label: "Money tools" },
];

const PAGES: L[] = [
  { href: "/builds", label: "Builds" },
  { href: "/about", label: "About" },
  { href: "/subsidiaries", label: "Directory" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
];

function norm(p: string | null) {
  const s = (p || "/").replace(/\/+$/, "");
  return s === "" ? "/" : s;
}

function Links({ items, current }: { items: L[]; current: (l: L) => Cur }) {
  return (
    <>
      {items.map((l) => (
        <li key={l.href}>
          <a className="mmx-link" href={l.href} aria-current={current(l)}>
            {l.label}
          </a>
        </li>
      ))}
    </>
  );
}

export function SiteNav() {
  const path = norm(usePathname());
  const studioCurrent = (l: L): Cur => (l.self ? (path === "/" ? "page" : "true") : undefined);
  const pageCurrent = (l: L): Cur => (path === l.href || path.startsWith(l.href + "/") ? "page" : undefined);

  // Menu is a native <details> (opens/closes and exposes expanded state without JS). Enhancement only:
  // Escape closes it and returns focus to the Menu button; a tap outside closes it. Not modal, so no trap.
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const d = menu.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !d.open) return;
      d.open = false;
      d.querySelector("summary")?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (d.open && e.target instanceof Node && !d.contains(e.target)) d.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <header className="mmx-header">
      <div className="mmx-bar">
        <a className="mmx-brand" href="/">
          <BrandLogo />
        </a>
        <nav className="mmx-nav" aria-label="Moose Matrix sites">
          <ul className="mmx-list">
            <Links items={STUDIO} current={studioCurrent} />
          </ul>
        </nav>
        <div className="mmx-tools">
          <div className="mmx-bar-theme">
            <ThemeToggle />
          </div>
          <details className="mmx-menu" ref={menu}>
            <summary>
              <svg className="mmx-ico-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              <svg className="mmx-ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
              <span>Menu</span>
            </summary>
            <div className="mmx-panel">
              <nav aria-label="Moose Matrix sites (menu)">
                <p className="mmx-group">Moose Matrix</p>
                <ul className="mmx-list">
                  <Links items={STUDIO} current={studioCurrent} />
                </ul>
              </nav>
              <nav aria-label="Moose Matrix pages (menu)">
                <p className="mmx-group">Pages</p>
                <ul className="mmx-list">
                  <Links items={PAGES} current={pageCurrent} />
                </ul>
              </nav>
              {/* Phones (<560px): the theme toggle lives here so the bar fits the wordmark + Menu. */}
              <div className="mmx-panel-theme">
                <p className="mmx-group" aria-hidden="true">Theme</p>
                <ThemeToggle />
              </div>
            </div>
          </details>
        </div>
      </div>
      <nav className="mmx-sub" aria-label="Moose Matrix pages">
        <ul className="mmx-sub-list">
          <li className="mmx-sub-label" aria-hidden="true">Moose Matrix</li>
          <Links items={PAGES} current={pageCurrent} />
        </ul>
      </nav>
    </header>
  );
}

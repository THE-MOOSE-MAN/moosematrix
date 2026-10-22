"use client";

// Shared Moose Matrix header (22 Oct 2026): identical on moosematrix.com, mooseman.moosematrix.com,
// m2.moosematrix.com and merch.moosematrix.com. Labels and order: nav-config.ts (copied, with tests, into the
// other repos).
//   Bar (wide screens): brand · Home · R&D · Moose Mumbles · Moo$e Money · Shop · More ▾ · theme toggle.
//     "More" is a native <details> disclosure (works with no JS, exposes expanded/collapsed) holding the company
//     pages About · Directory · Security · Contact. They also stay in the footer on purpose.
//   Phones / narrow screens: brand · (theme) · Menu. The Menu sheet uses the same groups: the 4 main links, then More.
// Current page: aria-current ("page", or "true" for the current site while on one of its sub-pages) plus an accent
// underline (never colour alone). When the current page is inside More, the More button is underlined too.
// usePathname() runs during static prerender, so aria-current is in the HTML.
// Enhancement only (same-origin bundle, no inline script): Escape closes an open disclosure and returns focus to its
// button; a click/tap outside closes it; tabbing out of More closes it. Not modal, so no focus trap.

import { BrandLogo } from "./BrandLogo";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ThemeToggle } from "@moosematrix/ui";
import { MAIN_NAV, MORE_LABEL, MORE_NAV, headerLabel, type NavLink } from "./nav-config";

type Cur = "page" | "true" | undefined;

function norm(p: string | null) {
  const s = (p || "/").replace(/\/+$/, "");
  return s === "" ? "/" : s;
}

function Links({ items, current }: { items: readonly NavLink[]; current: (l: NavLink) => Cur }) {
  return (
    <>
      {items.map((l) => (
        <li key={l.href}>
          <a className="mmx-link" href={l.href} aria-current={current(l)} title={l.nav ? l.label : undefined}>
            {headerLabel(l)}
          </a>
        </li>
      ))}
    </>
  );
}

function Chevron() {
  return (
    <svg className="mmx-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Escape / outside-click / focus-out handling for the header's <details> disclosures.
function useDisclosures(refs: React.RefObject<HTMLDetailsElement | null>[], closeOnFocusOut: boolean[], path: string) {
  useEffect(() => {
    const all = () => refs.map((r) => r.current).filter((d): d is HTMLDetailsElement => !!d);
    all().forEach((d) => (d.open = false)); // a route change closes everything
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      for (const d of all()) {
        if (!d.open) continue;
        d.open = false;
        d.querySelector("summary")?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      for (const d of all()) if (d.open && e.target instanceof Node && !d.contains(e.target)) d.open = false;
    };
    const offs = refs.map((r, i) => {
      const d = r.current;
      if (!d || !closeOnFocusOut[i]) return () => {};
      const onOut = (e: FocusEvent) => {
        const to = e.relatedTarget;
        if (d.open && to instanceof Node && !d.contains(to)) d.open = false;
      };
      d.addEventListener("focusout", onOut);
      return () => d.removeEventListener("focusout", onOut);
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      offs.forEach((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
}

export function SiteNav() {
  const path = norm(usePathname());
  const isAt = (href: string) => path === href || path.startsWith(href + "/");
  // Main links: R&D is a page on this site; the other three are other Moose Matrix sites.
  const mainCurrent = (l: NavLink): Cur => (l.href.startsWith("/") && isAt(l.href) ? "page" : undefined);
  const moreCurrent = (l: NavLink): Cur => (isAt(l.href) ? "page" : undefined);
  const inMore = MORE_NAV.some((l) => isAt(l.href));

  const more = useRef<HTMLDetailsElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useDisclosures([more, menu], [true, false], path);

  return (
    <header className="mmx-header">
      <div className="mmx-bar">
        <a className="mmx-brand" href="/" aria-current={path === "/" ? "page" : undefined}>
          <BrandLogo />
        </a>
        <nav className="mmx-nav" aria-label="Moose Matrix">
          <ul className="mmx-list">
            <Links items={MAIN_NAV} current={mainCurrent} />
          </ul>
          <details className="mmx-more" ref={more}>
            <summary className={inMore ? "mmx-more-cur" : undefined}>
              <span>{MORE_LABEL}</span>
              <Chevron />
            </summary>
            <ul className="mmx-more-list">
              <Links items={MORE_NAV} current={moreCurrent} />
            </ul>
          </details>
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
              <nav aria-label="Moose Matrix (menu)">
                <ul className="mmx-list">
                  <Links items={MAIN_NAV} current={mainCurrent} />
                </ul>
                <p className="mmx-group" id="mmx-menu-more">{MORE_LABEL}</p>
                <ul className="mmx-list" aria-labelledby="mmx-menu-more">
                  <Links items={MORE_NAV} current={moreCurrent} />
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
    </header>
  );
}

'use client';

import React, { useEffect, useRef, useState } from "react";

type NavLink = { label: string; href: string; external?: boolean };

type Props = {
  title?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoHref?: string;
  /** Main links shown inline (desktop) */
  links?: NavLink[];
  /** Subsidiaries shown in the dropdown (desktop) / collapsible (mobile) */
  subsidiaries?: NavLink[];
  /** Desktop title/link sizing (mobile handled separately) */
  size?: "md" | "lg";
  className?: string;
  /** Override logo size from the app (e.g., "h-24 w-24 md:h-28 md:w-28") */
  logoClassName?: string;
};

const defaultLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "The Moose Man", href: "https://mooseman.moosematrix.com", external: true },
  { label: "Contact", href: "/contact" },
  // { label: "Sign in", href: "/signin" },
  // { label: "Create account", href: "/signup" },
];

const defaultSubsidiaries: NavLink[] = [
  { label: "Moose Matrix", href: "https://matrix.moosematrix.com", external: true },
  { label: "Moo$e Money", href: "https://m2.moosematrix.com", external: true },
  { label: "Moose Merch", href: "https://moosemerch.moosematrix.com", external: true },
];

export function Navbar({
  title = "The Moose Matrix",
  logoSrc = "/moose.png",
  logoAlt = "Moose Matrix logo",
  logoHref = "/",
  links = defaultLinks,
  subsidiaries = defaultSubsidiaries,
  size = "lg",
  className = "",
  logoClassName = "h-10 w-10 md:h-20 md:w-20 lg:h-24 lg:w-24",
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);          // desktop dropdown
  const [mobileSubsOpen, setMobileSubsOpen] = useState(false);

  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const mobileBtnRef = useRef<HTMLButtonElement | null>(null);
  const subsPanelRef = useRef<HTMLDivElement | null>(null);
  const subsBtnRef = useRef<HTMLButtonElement | null>(null);

  // small hover-intent timer to avoid flicker
  const hoverTimer = useRef<number | null>(null);

  const titleSize = size === "lg" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl";
  const desktopLinkSize = size === "lg" ? "text-sm md:text-base" : "text-xs md:text-sm";

  // Esc closes any open panels
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setSubsOpen(false);
        setMobileSubsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside to close (mobile + desktop dropdown)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (mobileOpen) {
        if (mobilePanelRef.current && !mobilePanelRef.current.contains(t) && !mobileBtnRef.current?.contains(t)) {
          setMobileOpen(false);
        }
      }
      if (subsOpen) {
        if (subsPanelRef.current && !subsPanelRef.current.contains(t) && !subsBtnRef.current?.contains(t)) {
          setSubsOpen(false);
        }
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [mobileOpen, subsOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  // helpers for hover-intent
  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };
  const openOnHover = () => {
    clearHoverTimer();
    setSubsOpen(true);
  };
  const closeAfterDelay = () => {
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => setSubsOpen(false), 120);
  };

  return (
    <header className={"sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur " + className}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo + Title */}
        <a href={logoHref} className="group flex items-center gap-3" aria-label="Go to homepage">
          <img
            src={logoSrc}
            alt={logoAlt}
            className={["rounded-lg border border-white/10 shadow-sm h-12 w-12 md:h-14 md:w-14", logoClassName].join(" ")}
          />
          <span className={["font-semibold tracking-tight text-white", titleSize].join(" ")}>
            {title}
          </span>
        </a>

        {/* Desktop nav */}
        <nav className={["hidden md:flex items-center gap-5 text-white/85", desktopLinkSize].join(" ")}>
          {/* Subsidiaries dropdown (hover on desktop, click for keyboard toggle) */}
          <div
            className="relative"
            onMouseEnter={openOnHover}
            onMouseLeave={closeAfterDelay}
          >
            <button
              ref={subsBtnRef}
              type="button"
              className="inline-flex items-center gap-1 rounded px-3 py-2 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-haspopup="menu"
              aria-expanded={subsOpen}
              aria-controls="subs-menu"
              onClick={() => setSubsOpen(v => !v)} // keyboard-friendly
            >
              Subsidiaries
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </button>

            {subsOpen && (
              <div
                id="subs-menu"
                ref={subsPanelRef}
                role="menu"
                className="absolute right-0 top-full mt-2 min-w-[240px] rounded-2xl border border-white/10 bg-[#0b0c10] p-1.5 shadow-lg ring-1 ring-white/10"
                onMouseEnter={openOnHover}
                onMouseLeave={closeAfterDelay}
              >
                {/* Optional: link to the full page */}
                <a
                  href="/subsidiaries"
                  className="block rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none"
                  role="menuitem"
                  onClick={() => setSubsOpen(false)}
                >
                  View all subsidiaries →
                </a>
                <div className="my-1 h-px bg-white/10" />
                {subsidiaries.map(({ label, href, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="block rounded-xl px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none"
                    role="menuitem"
                    onClick={() => setSubsOpen(false)}
                  >
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Primary inline links */}
          {links.map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="inline-flex items-center rounded px-3 py-2 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          ref={mobileBtnRef}
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white/85 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Open menu"
          aria-controls="mobile-menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile slide-over panel + overlay */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            id="mobile-menu"
            ref={mobilePanelRef}
            className="fixed right-0 top-0 z-50 h-full w-[80%] max-w-xs translate-x-0 bg-[#0b0c10] shadow-xl ring-1 ring-white/10 md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-white font-semibold">Menu</span>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/85 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Collapsible Subsidiaries (mobile; no automatic nav on header tap) */}
            <div className="px-5 py-3 border-b border-white/10">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-base text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-expanded={mobileSubsOpen}
                onClick={() => setMobileSubsOpen(v => !v)}
              >
                <span>Subsidiaries</span>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className={mobileSubsOpen ? "rotate-180 transition" : "transition"}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
              </button>
              {mobileSubsOpen && (
                <ul className="mt-1 space-y-1">
                  <li>
                    <a
                      href="/subsidiaries"
                      className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10"
                      onClick={() => setMobileOpen(false)}
                    >
                      View all subsidiaries →
                    </a>
                  </li>
                  {subsidiaries.map(({ label, href, external }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10"
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Primary links */}
            <nav className="px-5 py-3">
              <ul className="flex flex-col gap-1">
                {links.map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="block rounded-lg px-3 py-3 text-base text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

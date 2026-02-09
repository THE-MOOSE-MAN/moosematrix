import Image from "next/image";

type NavLink = { label: string; href: string };

const LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Moose Mumbles", href: "https://mooseman.moosematrix.com" },
  { label: "Contact", href: "/contact" },
];

const SUBS: NavLink[] = [
  { label: "The Moose Matrix", href: "https://matrix.moosematrix.com" },
  { label: "Moo$e Money", href: "https://m2.moosematrix.com" },
  { label: "Store", href: "https://moosemerch.moosematrix.com" },
];

export function NavbarStatic({
  title = "The Moose Matrix",
  logoSrc = "/moose.png",
  logoAlt = "Moose Matrix logo",
  logoHref = "/",
}: {
  title?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href={logoHref} className="flex items-center gap-3" aria-label="Go to homepage">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={48}
            height={48}
            className="rounded-lg border border-slate-200 shadow-sm"
            priority
          />
          <span className="text-xl md:text-2xl font-mono font-semibold tracking-tight text-slate-900">
            {title}
          </span>
        </a>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-5 text-slate-700 text-sm">
          {/* Portals */}
          <details className="relative">
            <summary className="list-none cursor-pointer inline-flex items-center gap-1 rounded px-3 py-2 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 font-mono">
              🌀 Matrix Portals
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </summary>
            <div className="absolute right-0 top-full mt-2 min-w-[240px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <a href="/subsidiaries" className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                View all portals →
              </a>
              <div className="my-1 h-px bg-slate-200" />
              {SUBS.map((l) => (
                <a key={l.label} href={l.href} className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {l.label}
                </a>
              ))}
            </div>
          </details>

          {/* Primary */}
          {LINKS.map((l) => (
            <a key={l.label} href={l.href} className="rounded px-3 py-2 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Mobile (dark + opaque for readability) */}
        <details className="relative md:hidden">
          <summary className="list-none cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
            <span className="sr-only">Open menu</span>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </summary>

          <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-lg">
            <div className="px-4 py-3 text-xs font-medium text-white/70">Navigate</div>
            <div className="flex flex-col px-2 pb-3">
              <div className="px-2 pb-2">
                <div className="text-xs font-medium text-white/60 px-2 py-1">Matrix Portals</div>
                {SUBS.map((l) => (
                  <a key={l.label} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="my-1 h-px bg-white/10" />
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

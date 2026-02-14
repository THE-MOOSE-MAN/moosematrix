type FooterLink = { label: string; href: string; external?: boolean };
import { ThemeLink } from "./ThemeLink";


const STUDIO: FooterLink[] = [
  { label: "Moose Matrix", href: "https://matrix.moosematrix.com", external: true },
  { label: "Moo$e Money", href: "https://m2.moosematrix.com", external: true },
  { label: "Moose Mumbles", href: "https://mooseman.moosematrix.com", external: true },
  { label: "Store", href: "https://moosemerch.moosematrix.com", external: true },
];

const COMPANY: FooterLink[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Security", href: "/security" },

  // ✅ add it here
  { label: "Directory", href: "/subsidiaries" },

  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function relFor(l: FooterLink) {
  return l.external ? "noopener noreferrer" : undefined;
}

function IconSystem(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 5h16v10H4z" />
      <path d="M8 19h8" />
      <path d="M12 15v4" />
    </svg>
  );
}

function IconSun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M21 12.8A8.5 8.5 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8z" />
    </svg>
  );
}


export function FooterStatic({ year }: { year?: number }) {
  const current = new Date().getFullYear();

  // If some parent passes `new Date().getYear()` (=> 126), normalize it.
  const normalized =
    typeof year === "number"
      ? year < 1000
        ? year + 1900
        : year
      : current;

  const y = normalized < 2000 || normalized > current + 1 ? current : normalized;

  // Use the underline sweep class that exists in styles.css (.mm-underline).
  // Avoid Tailwind `transition-*` here; your underline animation defines its own transition. 
  const footerLink =
    "mm-underline inline-flex items-center " +
    "text-[12px] font-mono uppercase tracking-[0.18em] " +
    "text-[var(--muted)] hover:text-[var(--fg)]";

  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand + Appearance */}
          <div>
            <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
              The Moose Matrix
            </div>
            <div className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">
              A security-first ecosystem of tools, writing, and products.
            </div>

            {/* No-JS appearance override */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <ThemeLink set="system" className="mm-chip mm-mono mm-chip-btn" containerId="mm-snap">
                <IconSystem className="h-4 w-4" aria-hidden="true" />
                <span>System</span>
              </ThemeLink>

              <ThemeLink set="light" className="mm-chip mm-mono mm-chip-btn" containerId="mm-snap">
                <IconSun className="h-4 w-4" aria-hidden="true" />
                <span>Light</span>
              </ThemeLink>

              <ThemeLink set="dark" className="mm-chip mm-mono mm-chip-btn" containerId="mm-snap">
                <IconMoon className="h-4 w-4" aria-hidden="true" />
                <span>Dark</span>
              </ThemeLink>
            </div>
          </div>

          {/* Studio */}
          <div>
            <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Studio
            </div>
            <ul className="mt-4 space-y-3">
              {STUDIO.map((l) => (
                <li key={l.label}>
                  <a href={l.href} rel={relFor(l)} className={footerLink}>
                    {l.label} <span aria-hidden="true" className="ml-1">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Company
            </div>
            <ul className="mt-4 space-y-3">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className={footerLink}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-[var(--border)] pt-6 text-center">
          <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
            © {y} The Moose Matrix
          </div>
        </div>
      </div>
    </footer>
  );
}

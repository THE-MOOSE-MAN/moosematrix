
export function NavbarStatic({
  title = "The Moose Matrix",
  logoHref = "/",
}: {
  title?: string;
  logoHref?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/72 backdrop-blur">
      <a
        href="#content"
        className="mm-sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-[76px] items-center justify-between gap-3">
          {/* Title only (desktop + mobile) */}
          <a href={logoHref} className="flex items-center" aria-label="Go to homepage">
            <span className="text-[16px] font-mono font-semibold uppercase tracking-[0.30em] text-[var(--fg)] md:text-[16px] text-[14px]">
              {title}
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}

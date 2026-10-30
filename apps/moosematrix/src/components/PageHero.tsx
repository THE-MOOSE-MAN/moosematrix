// Inner-page hero from the v5 mock: breadcrumbs, eyebrow, display title, sub line and lede.
export function PageHero({ crumb, eyebrow, title, sub, children }: { crumb: string; eyebrow: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mm-page-hero" aria-labelledby="mm-page-title">
      <div className="mm-shell mm-page-hero-in">
        <nav className="mm-crumbs mm-micro" aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li aria-current="page">{crumb}</li>
          </ol>
        </nav>
        <p className="mm-eyebrow mm-micro">{eyebrow}</p>
        <h1 id="mm-page-title" className="mm-display mm-page-title">{title}</h1>
        <p className="mm-page-sub">{sub}</p>
        <div className="mm-hero-desc">{children}</div>
      </div>
    </section>
  );
}

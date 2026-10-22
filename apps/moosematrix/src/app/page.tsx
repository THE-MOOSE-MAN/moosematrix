export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import { ScrollDots } from "@moosematrix/ui";
import { TypedAccent } from "../components/TypedAccent";
import { HomeLink } from "../components/HomeLink";
import { CARDS, HERO, LATEST } from "./home-content";

// MOCKUP A (mock/home-sections-2026-10-21): Dustin's full-screen sections, kept. Hero + one section per
// destination, each with exactly one link. The document is the only scroller (soft snap on <html> lives in
// packages/ui/src/styles.css), so the footer is always reachable. The hero is a little shorter than the
// screen so the next section peeks in: a visible cue that the page scrolls (avoids the "false floor").
const DOTS = [{ id: "home", label: "Home" }, ...CARDS.map((c) => ({ id: c.id, label: c.label }))];
const FULL = "md:min-h-[calc(100svh-var(--mmx-header-h))] md:flex md:items-center";
// Section number only ("01"..."04"): keeps the sections feel within the A word budget.
const pad = (n: number) => String(n).padStart(2, "0");

export default function HomePage() {
  return (
    // Not a second <main>: layout.tsx wraps every page in <main id="content">.
    <div className="mm-shell">
      <div className="hidden md:block">
        <ScrollDots containerId="mm-snap" items={DOTS} />
      </div>

      <div id="mm-snap">
        <section id="home" aria-labelledby="home-h">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-12 md:min-h-[calc(100svh-var(--mmx-header-h)-6rem)] md:flex md:items-center">
            <div className="mx-auto max-w-3xl text-center">
              <h1
                id="home-h"
                className="mm-mono text-balance text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight text-[var(--fg)]"
              >
                {HERO.lead} <TypedAccent>{HERO.accent}</TypedAccent>.
              </h1>
              <p className="mt-4 sm:mt-5 text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">{HERO.sub}</p>
              <div className="mt-8">
                {/* In-page link, not a button: no JS needed. Target id comes from the first section. */}
                <a href={`#${CARDS[0].id}`} className="mm-btn-primary w-full sm:w-auto justify-center">
                  {HERO.cta.text} <span aria-hidden="true">{"\u2193"}</span>
                </a>
              </div>
              <p className="mt-5 text-[14px] text-[var(--muted)]">
                <a
                  href={LATEST.href}
                  className="mm-underline inline-flex min-h-6 items-center gap-1.5 hover:text-[var(--fg)]"
                >
                  <span className="mm-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--fg)]">{LATEST.label}</span>
                  <span>{LATEST.text}</span>
                </a>
                <span aria-hidden="true"> · </span>
                <time dateTime={LATEST.date}>{LATEST.dateText}</time>
              </p>
            </div>
          </div>
        </section>

        {CARDS.map((c, idx) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="border-t border-[var(--border)]">
            <div className={`mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14 ${FULL}`}>
              <div className="grid w-full items-center gap-8 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="flex items-center gap-3">
                    {/* Wrapper carries md:hidden: .mmx-only-* sets display on the img itself. */}
                    <span className="flex md:hidden">
                    {(["light", "dark"] as const).map((scheme) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={scheme}
                        src={`/brand/${c.icon}-icon-${scheme}.svg`}
                        alt=""
                        width={40}
                        height={40}
                        className={`mmx-only-${scheme} h-10 w-10 rounded-xl`}
                        decoding="async"
                        loading="lazy"
                      />
                    ))}
                    </span>
                    <span className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {pad(idx + 1)}
                    </span>
                  </div>
                  <h2
                    id={`${c.id}-h`}
                    className="mt-4 sm:mt-5 text-balance text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight text-[var(--fg)]"
                  >
                    {c.label}
                  </h2>
                  <p className="mt-3 sm:mt-4 max-w-xl text-[15px] md:text-xl leading-relaxed text-[var(--muted)]">{c.desc}</p>
                  <div className="mt-7 sm:mt-8">
                    <HomeLink
                      href={c.href}
                      external={c.external}
                      className="mm-btn-secondary w-full sm:w-auto justify-center inline-flex"
                    >
                      {c.cta}
                    </HomeLink>
                  </div>
                </div>

                {/* Decorative brand panel (no link: one link per section). */}
                <div className="hidden md:col-span-5 md:block" aria-hidden="true">
                  <div className="mm-card flex aspect-[4/3] items-center justify-center">
                    {(["light", "dark"] as const).map((scheme) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={scheme}
                        src={`/brand/${c.icon}-icon-${scheme}.svg`}
                        alt=""
                        width={128}
                        height={128}
                        className={`mmx-only-${scheme} h-32 w-32 rounded-3xl`}
                        decoding="async"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

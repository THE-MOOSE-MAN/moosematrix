export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import { ScrollDots } from "@moosematrix/ui";
import { TypedAccent } from "../components/TypedAccent";
import { HomeLink } from "../components/HomeLink";
import { CARDS, HERO, LATEST } from "./home-content";

// Homepage (phone-first, Oct 2026). Same copy and one DOM for every width.
// - Phones (<768px): the hero fills the first screen (svh, so no jump when the address bar hides); headline
//   on a clamp() scale; the brand icon on top; the primary action full-width at the bottom of the screen
//   (thumb zone) with the "Latest" pill under it. Sections become compact whole-card links (icon, label,
//   one line, outcome), stacked so all four fit about one screen. Styles: .mm-home* in globals.css.
// - Desktop (>=768px): unchanged from A2 (full-screen sections, soft snap, dots, brand panels).
// The document is the only scroller; snap is desktop-only (packages/ui/src/styles.css).
const DOTS = [{ id: "home", label: "Home" }, ...CARDS.map((c) => ({ id: c.id, label: c.label }))];
const FULL = "md:min-h-[calc(100svh-var(--mmx-header-h))] md:flex md:items-center";
// Section number only ("01"..."04"), desktop only: on phones the cards carry the icon instead.
const pad = (n: number) => String(n).padStart(2, "0");

// Keep a hyphenated word on one line ("write-ups" broke as "write- / ups" at 360px).
function noBreak(text: string, word: string) {
  const i = text.indexOf(word);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="whitespace-nowrap">{word}</span>
      {text.slice(i + word.length)}
    </>
  );
}

// Icons stay loading="lazy" (even the hero one): eager <img>s make React emit preloads that warn when another page
// prefetches "/". Lazy images in the first screen still load right away; width/height reserve the box (CLS 0).
function Icon({ name, size, className }: { name: string; size: number; className: string }) {
  return (
    <>
      {(["light", "dark"] as const).map((scheme) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={scheme}
          src={`/brand/${name}-icon-${scheme}.svg`}
          alt=""
          width={size}
          height={size}
          className={`mmx-only-${scheme} ${className}`}
          decoding="async"
          loading="lazy"
        />
      ))}
    </>
  );
}

export default function HomePage() {
  return (
    // Not a second <main>: layout.tsx wraps every page in <main id="content">.
    <div className="mm-shell mm-home">
      <div className="hidden md:block">
        <ScrollDots containerId="mm-snap" items={DOTS} />
      </div>

      <div id="mm-snap">
        <section id="home" aria-labelledby="home-h" className="mm-hero">
          <div className="mm-hero-in mx-auto max-w-6xl px-4 sm:px-6 md:pt-14 md:pb-12 md:min-h-[calc(100svh-var(--mmx-header-h)-6rem)] md:flex md:flex-col md:items-center md:justify-center">
            <div className="mm-hero-top mx-auto max-w-3xl md:text-center">
              {/* Brand icon (decorative; the header logo is the named link). Phones only: desktop is unchanged. */}
              <span className="mm-hero-icon md:hidden" aria-hidden="true">
                <Icon name="main" size={72} className="h-18 w-18 rounded-[18px]" />
              </span>
              <h1
                id="home-h"
                className="mm-hero-h1 mm-mono text-balance md:text-6xl font-semibold tracking-tight text-[var(--fg)]"
              >
                {noBreak(HERO.lead, "write-ups")} <TypedAccent>{HERO.accent}</TypedAccent>.
              </h1>
              <p className="mm-hero-sub md:mt-5 md:text-lg leading-relaxed text-[var(--muted)]">{HERO.sub}</p>
            </div>
            <div className="mm-hero-act">
              {/* In-page link, not a button: no JS needed. Target id comes from the first section. */}
              <a href={`#${CARDS[0].id}`} className="mm-btn-primary mm-hero-cta w-full sm:w-auto justify-center">
                {HERO.cta.text} <span aria-hidden="true">{"\u2193"}</span>
              </a>
              <p className="mm-latest">
                <a href={LATEST.href} className="mm-latest-link">
                  <span className="mm-latest-tag mm-mono">{LATEST.label}</span>
                  <span>{LATEST.text}</span>
                </a>
                <span aria-hidden="true" className="mm-latest-sep"> · </span>
                <time dateTime={LATEST.date}>{LATEST.dateText}</time>
              </p>
            </div>
          </div>
        </section>

        <div className="mm-tiles">
          {CARDS.map((c, idx) => (
            <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="mm-sec md:border-t md:border-[var(--border)]">
              <div className={`mm-sec-in mx-auto max-w-6xl px-4 sm:px-6 md:py-14 ${FULL}`}>
                <div className="grid w-full items-center gap-8 md:grid-cols-12">
                  {/* Phones: this column is the card; its one link stretches over the whole card. */}
                  <div className="mm-tile md:col-span-7">
                    <span className="mm-tile-icon md:hidden" aria-hidden="true">
                      <Icon name={c.icon} size={48} className="h-12 w-12 rounded-xl" />
                    </span>
                    <span className="mm-mono hidden md:inline text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {pad(idx + 1)}
                    </span>
                    <h2
                      id={`${c.id}-h`}
                      className="mm-tile-h md:mt-5 text-balance md:text-6xl font-semibold tracking-tight text-[var(--fg)]"
                    >
                      {c.label}
                    </h2>
                    <p className="mm-tile-p md:mt-4 max-w-xl md:text-xl leading-relaxed text-[var(--muted)]">{c.desc}</p>
                    <div className="mm-tile-act md:mt-8">
                      <HomeLink
                        href={c.href}
                        external={c.external}
                        className="mm-tile-link mm-btn-secondary sm:w-auto justify-center inline-flex"
                      >
                        {c.cta}
                      </HomeLink>
                    </div>
                  </div>

                  {/* Decorative brand panel (no link: one link per section). Desktop only. */}
                  <div className="hidden md:col-span-5 md:block" aria-hidden="true">
                    <div className="mm-card flex aspect-[4/3] items-center justify-center">
                      <Icon name={c.icon} size={128} className="h-32 w-32 rounded-3xl" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

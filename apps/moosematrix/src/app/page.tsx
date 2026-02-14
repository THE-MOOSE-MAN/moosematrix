export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import Image from "next/image";
import Link from "next/link";
import { ScrollDots } from "@moosematrix/ui";

const SECTIONS = [
  {
    id: "matrix",
    label: "Moose Matrix",
    href: "https://matrix.moosematrix.com",
    desc: "Tech hub · security engineering · builds",
    icon: "/moose.png",
    tag: "Engineering",
    bullets: ["Security-first builds", "Uniform systems", "Minimal surface area"],
  },
  {
    id: "money",
    label: "Moo$e Money",
    href: "https://m2.moosematrix.com",
    desc: "Tools · dashboards · wealth systems",
    icon: "/moose_money_logo.png",
    tag: "Finance",
    bullets: ["Dashboards & trackers", "Wealth systems", "Simple workflows"],
  },
   {
    id: "mumbles",
    label: "Moose Mumbles",
    href: "https://mooseman.moosematrix.com",
    desc: "Writing · videos · notes in public",
    icon: "/moose.png",
    tag: "Writing",
    bullets: ["Writeups & reviews", "Notes-in-public", "Progress trail"],
  },
  {
    id: "store",
    label: "Store",
    href: "https://moosemerch.moosematrix.com",
    desc: "Merch · digital drops · goods",
    icon: "/moose_merch_logo.png",
    tag: "Merch",
    bullets: ["Drops", "Digital goods", "Physical goods"],
  },
] as const;

const DOTS = [{ id: "home", label: "Home" }, ...SECTIONS.map((s) => ({ id: s.id, label: s.label }))];

export default function HomePage() {
  return (
    <main id="content" className="mm-shell">
      <ScrollDots containerId="mm-snap" items={DOTS} />

      <div
        id="mm-snap"
        className="h-[calc(100svh-76px)] overflow-y-auto snap-y snap-proximity scroll-smooth"
      >
        {/* Intro */}
        <section id="home" className="snap-start scroll-mt-24">
          <div className="mx-auto max-w-6xl px-6 pt-14 pb-10 min-h-[calc(100svh-76px)] flex items-center">
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="mm-chip mm-mono">Moose Matrix</span>
                <span className="mm-chip mm-mono">Moo$e Money</span>
                <span className="mm-chip mm-mono">Moose Mumbles</span>
                <span className="mm-chip mm-mono">Moose Merch</span>
              </div>
              <h1 className="mm-mono mt-7 text-4xl md:text-6xl font-semibold tracking-tight text-[var(--fg)]">
                A studio for the Moose ecosystem.
              </h1>

              <p className="mt-5 text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
                MooseMatrix is the front door—four destinations, one consistent system. Scroll to pick a door.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[12px] text-[var(--muted)]">
                  <span className="mm-topbar px-4 py-2 mm-mono">Build</span>
                  <span className="mm-topbar px-4 py-2 mm-mono">Learn</span>
                  <span className="mm-topbar px-4 py-2 mm-mono">Track</span>
                  <span className="mm-topbar px-4 py-2 mm-mono">Support</span>
            </div>        
            </div>
          </div>
        </section>

        {/* Sections */}
        {SECTIONS.map((s, idx) => (
          <section key={s.id} id={s.id} className="snap-start scroll-mt-24">
            <div className="mx-auto max-w-6xl px-6 py-14 min-h-[calc(100svh-76px)] flex items-center">
              <div className="grid w-full items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <div className="flex items-center gap-2">
                    <span className="mm-chip mm-mono">{s.tag}</span>
                    <span className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {String(idx + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="mt-6 text-balance text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
                    {s.label}
                  </h2>

                  <p className="mt-4 text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
                    {s.desc}
                  </p>

                  <ul className="mt-6 space-y-2 text-[13px] md:text-[14px] text-[var(--muted)]">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <a
                      href={s.href}
                      rel="noopener noreferrer"
                      className="mm-underline mm-mono inline-flex items-center text-[12px] uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--fg)]"
                    >
                      Open {s.label} <span aria-hidden="true" className="ml-1">→</span>
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="mm-card p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Image
                          src={s.icon}
                          alt=""
                          width={52}
                          height={52}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                          priority={idx === 0}
                        />
                        <div>
                          <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
                            Destination
                          </div>
                          <div className="mt-1 text-[20px] font-semibold text-[var(--fg)]">
                            {s.label}
                          </div>
                        </div>
                      </div>
                      <a
                        href={s.href}
                        rel="noopener noreferrer"
                        className="mm-underline mm-mono text-[12px] text-[var(--muted)] hover:text-[var(--fg)]"
                        aria-label={`Open ${s.label}`}
                      >
                        ↗
                      </a>
                    </div>

                    <div className="mt-6 h-px bg-[var(--border)]" />

                    <p className="mt-6 text-[14px] leading-relaxed text-[var(--muted)]">
                      {s.desc}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-2">
                      {s.bullets.map((b) => (
                        <span key={b} className="mm-topbar px-3 py-2 mm-mono text-[12px] text-[var(--muted)]">
                          {b}
                        </span>
                      ))}
                    </div>

                    <div className="mt-8">
                      <a href={s.href} rel="noopener noreferrer" className="mm-btn-secondary">
                        Visit {s.label} <span aria-hidden="true">→</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import type { Metadata } from "next";
import { TypedAccent } from "../../components/TypedAccent";

export const metadata: Metadata = {
  title: "Builds · The Moose Matrix",
  description: "What The Moose Man is building: big ideas, live tools and drops in progress.",
  alternates: { canonical: "/builds" },
  openGraph: {
    title: "Builds · The Moose Matrix",
    description: "Big ideas, live tools and drops in progress.",
    url: "https://moosematrix.com/builds",
    siteName: "The Moose Matrix",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Moose Matrix" }],
    locale: "en_US",
    type: "website",
  },
};

type Status = "Live" | "In development" | "Planned";

type Build = {
  name: string;
  host: string;
  href: string;
  status: Status;
  desc: string;
  cta: string;
};

// Big idea: one featured card, the page's single primary action. Copy is from wardoglabs.com (live, "Coming Soon").
const BIG_IDEA: Build = {
  name: "WARDOG Labs",
  host: "wardoglabs.com",
  href: "https://wardoglabs.com",
  status: "In development",
  desc: "Applied research and security engineering for mission-driven systems.",
  cta: "Visit WARDOG Labs",
};

// Every entry is a live site today; status reflects what that site says (no invented metrics or dates).
const PROJECTS: Build[] = [
  {
    name: "Moo$e Money",
    host: "m2.moosematrix.com",
    href: "https://m2.moosematrix.com",
    status: "Live",
    desc: "Free military money tools: TSP and deployment savings calculators.",
    cta: "Open the tools",
  },
  {
    name: "Moose Merch",
    host: "merch.moosematrix.com",
    href: "https://merch.moosematrix.com",
    status: "In development",
    desc: "The first drop: shirts, crew necks, stickers, hats and mugs. Test shop for now.",
    cta: "See the drop",
  },
  {
    name: "Moose Mumbles",
    host: "mooseman.moosematrix.com",
    href: "https://mooseman.moosematrix.com",
    status: "Live",
    desc: "Writeups, reviews and notes in public.",
    cta: "Read Mumbles",
  },
];

// Status is text, never colour alone; the dot is decorative.
function StatusPill({ status }: { status: Status }) {
  const dot = status === "Live" ? "bg-[var(--accent)]" : "border border-[var(--muted)]";
  return (
    <span className="mm-chip mm-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
      <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function newTabLabel(b: Build) {
  return `${b.cta}: ${b.host} (opens in new tab)`;
}

export default function BuildsPage() {
  return (
    <div className="mm-shell">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
        <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">Builds</div>

        <h1 className="mm-mono mt-3 text-balance text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          What I&rsquo;m <TypedAccent>building</TypedAccent>
        </h1>

        <p className="mt-4 max-w-2xl text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
          Big ideas, live tools and drops in progress.
        </p>

        {/* Big idea */}
        <section aria-labelledby="big-idea" className="mt-10 sm:mt-12">
          <h2 id="big-idea" className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Big idea
          </h2>

          <article className="mm-card mt-4 p-5 sm:p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={BIG_IDEA.status} />
              <span className="mm-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{BIG_IDEA.host}</span>
            </div>
            <h3 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--fg)]">
              {BIG_IDEA.name}
            </h3>
            <p className="mt-3 max-w-2xl text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">{BIG_IDEA.desc}</p>
            <div className="mt-6 sm:mt-7">
              <a
                href={BIG_IDEA.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mm-btn-primary w-full sm:w-auto justify-center inline-flex"
                aria-label={newTabLabel(BIG_IDEA)}
              >
                {BIG_IDEA.cta} <span aria-hidden="true">{"\u2197\uFE0E"}</span>
              </a>
            </div>
          </article>
        </section>

        {/* Projects */}
        <section aria-labelledby="projects" className="mt-12 sm:mt-14">
          <h2 id="projects" className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Projects
          </h2>

          <ul className="mt-4 grid gap-5 md:grid-cols-3">
            {PROJECTS.map((b) => (
              <li key={b.name} className="mm-card flex flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={b.status} />
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--fg)]">{b.name}</h3>
                <div className="mt-1 mm-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{b.host}</div>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-[var(--muted)]">{b.desc}</p>
                <div className="mt-6">
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mm-btn-secondary w-full justify-center inline-flex"
                    aria-label={newTabLabel(b)}
                  >
                    {b.cta} <span aria-hidden="true">{"\u2197\uFE0E"}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

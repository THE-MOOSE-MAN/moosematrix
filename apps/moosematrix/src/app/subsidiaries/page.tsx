export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import Link from "next/link";

type Door = {
  name: string;
  href: string;
  subdomain: string;
  desc: string;
  status: "Live" | "Beta" | "Coming soon";
  focus: string[];
};

const DOORS: Door[] = [
  {
    name: "Moose Matrix",
    href: "https://matrix.moosematrix.com",
    subdomain: "matrix.moosematrix.com",
    desc: "Tech hub for security engineering, builds, and studio output.",
    status: "Live",
    focus: ["Engineering", "Security", "Builds"],
  },
  {
    name: "Moo$e Money",
    href: "https://m2.moosematrix.com",
    subdomain: "m2.moosematrix.com",
    desc: "Tools, dashboards, and systems for wealth clarity.",
    status: "Beta",
    focus: ["Dashboards", "Automation", "Wealth systems"],
  },
  {
    name: "Moose Mumbles",
    href: "https://mooseman.moosematrix.com",
    subdomain: "mooseman.moosematrix.com",
    desc: "Writing, videos, reviews, and notes in public.",
    status: "Live",
    focus: ["Writing", "Reviews", "Research notes"],
  },
  {
    name: "Moose Merch",
    href: "https://moosemerch.moosematrix.com",
    subdomain: "moosemerch.moosematrix.com",
    desc: "Physical + digital goods that support the ecosystem.",
    status: "Coming soon",
    focus: ["Drops", "Goods", "Digital"],
  },
];

function statusPill(status: Door["status"]) {
  const base =
    "mm-mono inline-flex items-center rounded-full border border-[var(--border)] " +
    "bg-[var(--surface)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]";

  if (status === "Live") return `${base} text-[var(--fg)]`;
  if (status === "Beta") return `${base} text-[var(--muted)]`;
  return `${base} text-[var(--muted)]`;
}

export default function SubsidiariesPage() {
  return (
    <main id="content" className="mm-shell">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Directory
          </div>

          <h1 className="text-balance text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
            Subsidiaries & subdomains
          </h1>

          <p className="max-w-2xl text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
            Each part of the Moose ecosystem lives on its own subdomain—clear boundaries, less clutter, easier navigation.
          </p>

          <div className="mt-2">
            <Link
              href="/"
              className="mm-underline mm-mono inline-flex items-center text-[12px] uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--fg)]"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Grid (cards, but calm) */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {DOORS.map((d) => (
            <a
              key={d.name}
              href={d.href}
              rel="noopener noreferrer"
              className={[
                "group mm-card relative overflow-hidden p-6",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              ].join(" ")}
              aria-label={`${d.name} — ${d.desc}`}
            >
              {/* subtle “premium” sheen without loud gradients */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100
                           bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_55%)]"
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xl font-semibold text-[var(--fg)]">{d.name}</div>
                      <span className={statusPill(d.status)}>{d.status}</span>
                    </div>

                    <div className="mt-2 mm-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {d.subdomain}
                    </div>
                  </div>

                  <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)] group-hover:text-[var(--fg)]">
                    Open →
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted)]">
                  {d.desc}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {d.focus.map((t) => (
                    <span
                      key={t}
                      className="mm-topbar mm-mono px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Minimal note */}
        <div className="mt-10 text-center mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Tip: bookmark the subdomain you use most.
        </div>
      </div>
    </main>
  );
}

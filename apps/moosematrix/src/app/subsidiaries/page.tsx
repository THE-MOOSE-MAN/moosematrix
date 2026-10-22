export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import Link from "next/link";
import { TypedAccent } from "../../components/TypedAccent";

type Door = {
  name: string;
  href: string;
  subdomain: string;
  desc: string;
  status: "Live" | "Beta" | "Coming soon";
  focus: string[];
};

// Labels match the shared nav (Builds, Shop, Write-ups, Money tools); the property name is in the copy.
// Builds replaces the old "Moose Matrix -> matrix.moosematrix.com" card, which looped back to this hub.
// Statuses are unchanged from the previous directory; descriptions match the homepage and /builds.
const DOORS: Door[] = [
  {
    name: "Builds",
    href: "/builds",
    subdomain: "moosematrix.com/builds",
    desc: "WARDOG Labs and other projects in progress.",
    status: "Live",
    focus: ["WARDOG Labs", "Projects"],
  },
  {
    name: "Shop",
    href: "https://merch.moosematrix.com",
    subdomain: "merch.moosematrix.com",
    desc: "Moose Merch. The first drop is in the works.",
    status: "Coming soon",
    focus: ["Moose Merch", "First drop"],
  },
  {
    name: "Write-ups",
    href: "https://mooseman.moosematrix.com",
    subdomain: "mooseman.moosematrix.com",
    desc: "Tech deep-dives, reviews and notes on Moose Mumbles.",
    status: "Live",
    focus: ["Moose Mumbles", "Reviews"],
  },
  {
    name: "Money tools",
    href: "https://m2.moosematrix.com",
    subdomain: "m2.moosematrix.com",
    desc: "Free TSP and deployment savings calculators on Moo$e Money.",
    status: "Beta",
    focus: ["Moo$e Money", "Calculators"],
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
    <div className="mm-shell">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="mm-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Directory
          </div>

          <h1 className="text-balance text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
            Subsidiaries &amp; <TypedAccent>subdomains</TypedAccent>
          </h1>

          <p className="max-w-2xl text-[16px] md:text-lg leading-relaxed text-[var(--muted)]">
            Each part of the Moose ecosystem lives on its own subdomain—clear boundaries, less clutter, easier navigation.
          </p>

          <div className="mt-2">
            <Link
              href="/"
              className="mm-underline mm-mono inline-flex min-h-11 md:min-h-6 items-center text-[12px] uppercase tracking-[0.18em] text-[var(--muted)] hover:text-[var(--fg)]"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Grid (cards, but calm) */}
        <div className="mt-8 md:mt-10 grid gap-4 md:gap-6 md:grid-cols-2">
          {DOORS.map((d) => (
            <a
              key={d.name}
              href={d.href}
              className={[
                "group mm-card relative overflow-hidden p-5 md:p-6",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              ].join(" ")}
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

                <p className="mt-4 text-[16px] md:text-[14px] leading-relaxed text-[var(--muted)]">
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
    </div>
  );
}

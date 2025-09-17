// apps/moosematrix/src/app/subsidiaries/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subsidiaries | The Moose Matrix",
  description:
    "Overview of Moose Matrix (studio), Moo$e Money, and Moose Merch — the brands under The Moose Matrix.",
};

export default function SubsidiariesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Subsidiaries</h1>
        <p className="mx-auto mt-3 max-w-2xl text-white/75">
          The Moose Matrix is a small umbrella studio. Below are our focused ventures with a
          one-liner on what each does and where to learn more.
        </p>
      </header>

      {/* Cards — ORDERED: Moose Matrix, Moo$e Money, Moose Merch */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Moose Matrix (studio) — LEFT */}
        <a
          href="https://matrix.moosematrix.com"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/moose_matrix_logo.png"
                alt="The Moose Matrix"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg border border-white/10"
              />
              <h2 className="text-xl font-semibold text-white">Moose Matrix</h2>
            </div>
            <p className="mt-2 text-white/75">
              Our corporate/studio hub: mission, principles, services, and case studies.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-white/70">
              <li>What we build and why</li>
              <li>Selected work & press kit</li>
              <li>Partnership details</li>
            </ul>
            <div className="mt-4">
              <span className="inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                Visit site →
              </span>
            </div>
          </div>
        </a>

        {/* Moo$e Money — MIDDLE */}
        <a
          href="https://m2.moosematrix.com"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/moose_money_logo.png"
                alt="Moo$e Money"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg border border-white/10"
              />
              <h2 className="text-xl font-semibold text-white">Moo$e Money</h2>
            </div>
            <p className="mt-2 text-white/75">
              Clear, practical tools and playbooks for personal finance and solo operators.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-white/70">
              <li>Budget & cashflow templates</li>
              <li>Automation guides for money ops</li>
              <li>Short, visual explainers</li>
            </ul>
            <div className="mt-4">
              <span className="inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                Visit site →
              </span>
            </div>
          </div>
        </a>

        {/* Moose Merch — RIGHT */}
        <a
          href="https://moosemerch.moosematrix.com"
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <img
                src="/moose_merch_logo.png"
                alt="Store"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg border border-white/10"
              />
              <h2 className="text-xl font-semibold text-white">Moose Merch</h2>
            </div>
            <p className="mt-2 text-white/75">
              Physical & digital goods that support the projects and community.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-white/70">
              <li>Limited-run apparel</li>
              <li>Printable toolkits & PDFs</li>
              <li>Member discounts</li>
            </ul>
            <div className="mt-4">
              <span className="inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                Visit site →
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* Tie-in / philosophy */}
      <section className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-white">How these fit together</h3>
          <p className="mt-2 text-white/75">
            Each brand is small by design and focused on useful outcomes. Moose Matrix (the studio)
            underpins everything—from the tooling and infrastructure to the design language and
            quality bar across the portfolio.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 text-center">
        <p className="text-white/70">
          Not sure where to start?{" "}
          <Link href="/contact" className="text-white hover:underline">
            Get in touch
          </Link>{" "}
          and we’ll point you to the right place.
        </p>
      </section>
    </main>
  );
}

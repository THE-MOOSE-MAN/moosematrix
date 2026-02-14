export const dynamic = "force-static";
export const revalidate = false;

const LAST_UPDATED = "February 13, 2026";

export default function TermsPage() {
  return (
    <main className="mm-shell">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-16">
        <h1 className="mm-mono text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          Terms of Service
        </h1>
        <p className="mt-3 text-[13px] text-[var(--muted)]">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-[var(--muted)]">
          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Acceptance
            </h2>
            <p className="mt-3">
              By accessing or using MooseMatrix, you agree to these Terms. If you do not agree, do not use the site.
            </p>
          </div>

          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Use of the site
            </h2>
            <p className="mt-3">
              You agree not to misuse the site—no attempts to disrupt availability, probe without authorization,
              scrape at harmful rates, or interfere with other users.
            </p>
          </div>

          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Intellectual property
            </h2>
            <p className="mt-3">
              Content on the site may be protected by copyright and other laws unless explicitly stated otherwise.
            </p>
          </div>

          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Disclaimers
            </h2>
            <p className="mt-3">
              The site is provided “as is” without warranties of any kind. We do not guarantee the site will be
              uninterrupted or error-free.
            </p>
          </div>

          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Limitation of liability
            </h2>
            <p className="mt-3">
              To the fullest extent permitted by law, MooseMatrix will not be liable for indirect, incidental,
              special, consequential, or punitive damages arising from your use of the site.
            </p>
          </div>

          <div className="mm-card p-6">
            <h2 className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Changes
            </h2>
            <p className="mt-3">
              We may update these Terms from time to time. The “Last updated” date reflects the latest revision.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

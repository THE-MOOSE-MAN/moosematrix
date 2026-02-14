export const dynamic = "force-static";
export const revalidate = false;

export default function ContactPage() {
  return (
    <main className="mm-shell">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-16">
        <h1 className="mm-mono text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          Contact
        </h1>

        <p className="mt-6 text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
          Collaboration, feedback, or business inquiries.
        </p>

        <div className="mt-10 mm-card p-7">
          <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Email</div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a className="mm-btn-primary" href="mailto:contact@moosematrix.com">
              contact@moosematrix.com →
            </a>
            <a className="mm-btn-secondary" href="/security">
              Security disclosures →
            </a>
          </div>

          <p className="mt-6 text-[12px] text-[var(--muted)]">
            Add a business mailing address here once you have one (good for legitimacy + compliance when you run commercial email programs).
          </p>
        </div>
      </section>
    </main>
  );
}

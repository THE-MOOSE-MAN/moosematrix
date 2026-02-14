export const dynamic = "force-static";
export const revalidate = false;

export default function AboutPage() {
  return (
    <main className="mm-shell">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-16">
        <h1 className="mm-mono text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          About
        </h1>

        <p className="mt-6 text-[15px] md:text-lg leading-relaxed text-[var(--muted)]">
          The Moose Matrix is a security-first ecosystem of tools, writing, and products.
          The goal is simple: build systems that are clean, reliable, and easy to understand.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Mission</div>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">
              Deliver a cohesive set of subdomains that feel like one product—uniform design, consistent language,
              and disciplined engineering.
            </p>
          </div>

          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Principles</div>
            <ul className="mt-3 space-y-2 text-[14px] text-[var(--muted)]">
              <li>• Static by default</li>
              <li>• Minimal attack surface</li>
              <li>• Strong boundaries and clear ownership</li>
              <li>• Publish the trail (notes-in-public)</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

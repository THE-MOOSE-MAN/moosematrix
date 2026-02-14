export const dynamic = "force-static";
export const revalidate = false;

export default function SecurityPage() {
  return (
    <main className="mm-shell">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-16">
        <h1 className="mm-mono text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          Security
        </h1>

        <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-[var(--muted)]">
          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Vulnerability disclosure
            </div>
            <p className="mt-3">
              If you believe you’ve found a security issue, report it responsibly with steps to reproduce, affected URLs,
              and impact details.
            </p>
            <p className="mt-3">
              Email:{" "}
              <a className="underline underline-offset-4" href="mailto:security@moosematrix.com">
                security@moosematrix.com
              </a>
            </p>
          </div>

          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              security.txt
            </div>
            <p className="mt-3">
              Machine-readable contact:{" "}
              <a className="underline underline-offset-4" href="/.well-known/security.txt">
                /.well-known/security.txt
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

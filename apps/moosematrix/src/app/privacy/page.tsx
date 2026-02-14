export const dynamic = "force-static";
export const revalidate = false;

export default function PrivacyPage() {
  return (
    <main className="mm-shell">
      <section className="mx-auto max-w-4xl px-6 pt-14 pb-16">
        <h1 className="mm-mono text-4xl md:text-5xl font-semibold tracking-tight text-[var(--fg)]">
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-[var(--muted)]">
          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              What we collect
            </div>
            <p className="mt-3">
              If you contact us, you may provide information such as your email address and message content.
              Servers may log basic technical data for reliability and security.
            </p>
          </div>

          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Theme preference
            </div>
            <p className="mt-3">
              We store an appearance preference (System/Light/Dark) locally in your browser to respect your choice.
            </p>
          </div>

          <div className="mm-card p-6">
            <div className="mm-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg)]">
              Contact
            </div>
            <p className="mt-3">
              Privacy questions:{" "}
              <a className="underline underline-offset-4" href="mailto:privacy@moosematrix.com">
                privacy@moosematrix.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-[var(--fg)]">Page not found</h1>
      {/* Theme tokens instead of text-white/70, which was invisible (1.05:1) in the light theme. */}
      <p className="mt-3 text-[var(--muted)]">The page you’re looking for doesn’t exist.</p>
      <a className="mm-btn-secondary mt-6 inline-flex" href="/">Go home</a>
    </div>
  );
}

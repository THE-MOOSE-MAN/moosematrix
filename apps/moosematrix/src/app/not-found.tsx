export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-white/70">The page you’re looking for doesn’t exist.</p>
      <a className="mt-6 inline-block rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10" href="/">Go home</a>
    </main>
  );
}

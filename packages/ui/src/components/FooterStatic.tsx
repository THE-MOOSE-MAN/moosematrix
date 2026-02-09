export function FooterStatic({ since = 2020 }: { since?: number }) {
  return (
    <footer className="mt-16 border-t border-slate-200 py-10 text-center text-sm text-slate-600">
      <div className="font-mono">
        © {since}–present The Moose Matrix · In business since {since}
      </div>
    </footer>
  );
}
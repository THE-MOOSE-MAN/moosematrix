// Accent-coloured word that types itself out once on load. Pure CSS (packages/ui/src/styles.css, .mmx-tw*):
// server-rendered, no client JS, no inline styles, so the CSP is unchanged. The full word is always in the DOM
// (visually-hidden copy) for screen readers and no-JS; the per-glyph copy is aria-hidden and reserves its final
// width from the first frame (no layout shift). prefers-reduced-motion shows the word instantly.
export function TypedAccent({ children }: { children: string }) {
  return (
    <span className="mmx-tw">
      <span className="mmx-tw-sr">{children}</span>
      <span className="mmx-tw-a" aria-hidden="true">
        {Array.from(children).map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </span>
    </span>
  );
}

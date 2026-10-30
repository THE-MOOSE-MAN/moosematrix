// Headline that types itself out once on load, the WHOLE line, with one phrase in the accent colour
// (the owner, 22 Oct 2026; replaces TypedAccent, which typed only the accent word). Pure CSS
// (packages/ui/src/styles.css, .mmx-tw*): server-rendered, no client JS, no inline styles, so the CSP is unchanged.
// - The sentence is in the HTML from the start as one visually-hidden copy (screen readers read it in one piece,
//   search engines and no-JS get it). The per-character copy is aria-hidden, so it is never read glyph by glyph.
// - Every glyph is laid out AND painted from the first frame (only its colour is transparent until its turn,
//   never visibility/opacity), so the final size is reserved (CLS 0) and the heading stays the first-paint LCP.
// - Total typing time is about 1.5 s or less: the per-character step shrinks for long lines (stepFor).
// - prefers-reduced-motion: the line is simply there.
// Use it as the only content of a heading: <h1><TypedLine text="What I’m building" accent="building" /></h1>

// Per-character step buckets (ms), longest first. Must match the .mmx-tw-s* classes in styles.css.
export const TW_STEPS = [75, 60, 50, 40, 30, 25, 20, 15] as const;
export const TW_BUDGET_MS = 1500;
export const TW_MAX_CHARS = 96; // the nth-child rules in styles.css cover this many characters

export function stepFor(length: number): number {
  return TW_STEPS.find((s) => s * length <= TW_BUDGET_MS) ?? TW_STEPS[TW_STEPS.length - 1];
}

// Splits `text` into code points, flagging the ones inside the first occurrence of `accent`.
export function glyphs(text: string, accent = ""): { ch: string; acc: boolean }[] {
  const at = accent ? text.indexOf(accent) : -1;
  const a0 = at < 0 ? -1 : Array.from(text.slice(0, at)).length;
  const a1 = at < 0 ? -1 : a0 + Array.from(accent).length;
  return Array.from(text).map((ch, i) => ({ ch, acc: i >= a0 && i < a1 }));
}

export function TypedLine({ text, accent = "" }: { text: string; accent?: string }) {
  const g = glyphs(text, accent);
  const at = accent ? text.indexOf(accent) : -1;
  return (
    <span className={`mmx-tw mmx-tw-s${stepFor(g.length)}`}>
      <span className="mmx-tw-sr">
        {at < 0 ? (
          text
        ) : (
          <>
            {text.slice(0, at)}
            <span className="mmx-tw-acc">{accent}</span>
            {text.slice(at + accent.length)}
          </>
        )}
      </span>
      <span className="mmx-tw-a" aria-hidden="true">
        {g.map((x, i) => (
          <span key={i} className={x.acc ? "mmx-tw-acc" : undefined}>
            {x.ch}
          </span>
        ))}
      </span>
    </span>
  );
}

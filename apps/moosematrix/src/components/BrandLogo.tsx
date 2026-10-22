// Nav brand: final Moose Matrix logo (shield + Chakra Petch wordmark, outlined SVG, no text/script inside).
// Lockup from 560px (30px tall from 1100px, 24px below), shield mark under 560px. A light and a dark copy; CSS
// (.mmx-only-light / .mmx-only-dark in packages/ui styles) shows the one for the active theme. width/height on
// every <source>/<img> reserve the box before the SVG loads (CLS 0). Plain <img>: SVGs need no optimizer.
const LOCKUP_W = 238.91 / 36; // lockup viewBox width per unit height
const w = (h: number) => Math.round(LOCKUP_W * h);

function Art({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <picture className={`mmx-logo mmx-only-${scheme}`}>
      <source media="(min-width: 1100px)" srcSet={`/brand/main-lockup-${scheme}.svg`} width={w(30)} height={30} />
      <source media="(min-width: 560px)" srcSet={`/brand/main-lockup-${scheme}.svg`} width={w(24)} height={24} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/brand/main-mark-${scheme}.svg`} width={39} height={34} alt="Moose Matrix" decoding="async" />
    </picture>
  );
}

export function BrandLogo() {
  return (
    <>
      <Art scheme="light" />
      <Art scheme="dark" />
    </>
  );
}

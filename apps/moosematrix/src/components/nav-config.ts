// Shared Moose Matrix navigation (Dustin, 22 Oct 2026). One source for the top nav, the phone menu and the
// homepage cards, so the labels and their order are identical everywhere. The same four labels, in the same
// order, are copied into mooseman-site (MmxHeader.tsx), moose_money (Header.astro) and the merch pages; their
// tests assert this list. Shop stays LAST. URLs never change with a label (Research & Development is still /builds).

export type NavLink = { href: string; label: string; key: string };

// Row 1: the four main sections.
export const MAIN_NAV: readonly NavLink[] = [
  { key: "rnd", href: "/builds", label: "Research & Development" },
  { key: "mumbles", href: "https://mooseman.moosematrix.com/", label: "Moose Mumbles" },
  { key: "money", href: "https://m2.moosematrix.com/", label: "Moo$e Money" },
  { key: "shop", href: "https://merch.moosematrix.com/", label: "Shop" },
];

// "More" disclosure: the company pages (also in the footer, on purpose).
export const MORE_NAV: readonly NavLink[] = [
  { key: "about", href: "/about", label: "About" },
  { key: "directory", href: "/subsidiaries", label: "Directory" },
  { key: "security", href: "/security", label: "Security" },
  { key: "contact", href: "/contact", label: "Contact" },
];

export const MORE_LABEL = "More";

export function navLabel(key: string): string {
  const l = [...MAIN_NAV, ...MORE_NAV].find((x) => x.key === key);
  if (!l) throw new Error(`unknown nav key: ${key}`);
  return l.label;
}

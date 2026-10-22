// Homepage copy (shared by the hero, the section cards and the nav labels).
// layout only. Facts come from the live sites and the Builds page; no dates, prices or metrics invented.
// Hero CTA: Dustin chose a neutral "Start exploring" jump over a store-only CTA (21 Oct 2026).

export type HomeIcon = "main" | "money" | "store";

export type HomeCard = {
  id: string;
  label: string; // matches the shared nav label
  desc: string; // <= 10 words
  cta: string; // the card's one link, worded by outcome
  href: string;
  external: boolean; // other Moose sites open in a new tab (announced to screen readers)
  icon: HomeIcon;
};

export const HERO = {
  lead: "Tools, write-ups and gear by",
  accent: "The Moose Man",
  sub: "Built security-first by Dustin Warren.",
  // One primary action for new and returning visitors alike: an in-page jump to the first section
  // (plain #fragment: works without JS; smooth scroll only when reduced motion is not requested).
  cta: { text: "Start exploring" }, // href = "#" + CARDS[0].id (set in page.tsx)
} as const;

// "Latest" line under the hero, for returning visitors. One short, real, dated update; edit here.
// Same for everyone: no cookies, storage, personalization or tracking.
// Current entry: the /builds page (added 21 Oct 2026, commit 6d4ceec). It ships with this homepage.
export const LATEST = {
  label: "New:",
  text: "the Builds page",
  href: "/builds",
  date: "2026-10",
  dateText: "Oct 2026",
} as const;

export const CARDS: readonly HomeCard[] = [
  {
    id: "builds",
    label: "Builds",
    desc: "WARDOG Labs and other projects in progress.",
    cta: "See what I\u2019m building",
    href: "/builds",
    external: false,
    icon: "main",
  },
  {
    id: "shop",
    label: "Shop",
    desc: "Moose Merch. The first drop is in the works.",
    cta: "Browse the shop",
    href: "https://merch.moosematrix.com/",
    external: true,
    icon: "store",
  },
  {
    id: "write-ups",
    label: "Write-ups",
    desc: "Tech deep-dives, reviews and notes on Moose Mumbles.",
    cta: "Read the write-ups",
    href: "https://mooseman.moosematrix.com/",
    external: true,
    icon: "main",
  },
  {
    id: "money-tools",
    label: "Money tools",
    desc: "Free TSP and deployment savings calculators on Moo$e Money.",
    cta: "Open the calculators",
    href: "https://m2.moosematrix.com/",
    external: true,
    icon: "money",
  },
];

export const NEW_TAB_HINT = " (opens in new tab)";
export const ARROW_INTERNAL = "\u2192";
export const ARROW_EXTERNAL = "\u2197\uFE0E";

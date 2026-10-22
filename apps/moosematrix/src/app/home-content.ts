// Homepage copy (shared by the hero, the section cards and the nav labels).
// layout only. Facts come from the live sites and the Research & Development page (/builds); no dates, prices or metrics invented.
// Card labels come from components/nav-config.ts, so the cards, the top nav and the phone menu always match.
// Hero CTA: Dustin chose a neutral "Start exploring" jump over a store-only CTA (21 Oct 2026).

import { navLabel } from "../components/nav-config";

export type HomeIcon = "main" | "money" | "store";

export type HomeCard = {
  id: string;
  label: string; // matches the shared nav label
  desc: string; // <= 10 words
  cta: string; // the card's one link, worded by outcome
  href: string;
  external: boolean; // another Moose site (shown with the ↗ arrow); all links open in the same tab
  icon: HomeIcon;
};

// Hero (Dustin, 22 Oct 2026). `line` is the whole headline; it types out once on load (components/TypedLine.tsx).
// `accent` is the phrase shown in the blue accent colour: change it to any phrase that appears in `line`
// (exact text, first match), or set it to "" for no accent.
export const HERO = {
  line: "Breaking things, building things, and writing it all down.",
  accent: "building things",
  sub: "Built security-first by The Moose Man.",
  // One primary action for new and returning visitors alike: an in-page jump to the first section
  // (plain #fragment: works without JS; smooth scroll only when reduced motion is not requested).
  cta: { text: "Start exploring" }, // href = "#" + CARDS[0].id (set in page.tsx)
} as const;

// "Latest" line under the hero, for returning visitors. One short, real, dated update; edit here.
// Same for everyone: no cookies, storage, personalization or tracking.
// Current entry: the /builds page, now labelled Research & Development (added 21 Oct 2026, commit 6d4ceec).
export const LATEST = {
  label: "New:",
  text: "the Research & Development page",
  href: "/builds",
  date: "2026-10",
  dateText: "Oct 2026",
} as const;

// Same order as the top nav: Research & Development, Moose Mumbles, Moo$e Money, then Shop LAST.
// Descriptions and CTAs unchanged (22 Oct 2026), except the Moose Mumbles CTA, which used the old "write-ups" label.
export const CARDS: readonly HomeCard[] = [
  {
    id: "research-development",
    label: navLabel("rnd"),
    desc: "WARDOG Labs and other projects in progress.",
    cta: "See what I\u2019m building",
    href: "/builds",
    external: false,
    icon: "main",
  },
  {
    id: "moose-mumbles",
    label: navLabel("mumbles"),
    desc: "Tech deep-dives, reviews and notes on Moose Mumbles.",
    cta: "Read Moose Mumbles",
    href: "https://mooseman.moosematrix.com/",
    external: true,
    icon: "main",
  },
  {
    id: "moose-money",
    label: navLabel("money"),
    desc: "Free TSP and deployment savings calculators on Moo$e Money.",
    cta: "Open the calculators",
    href: "https://m2.moosematrix.com/",
    external: true,
    icon: "money",
  },
  {
    id: "shop",
    label: navLabel("shop"),
    desc: "Moose Merch. The first drop is in the works.",
    cta: "Browse the shop",
    href: "https://merch.moosematrix.com/",
    external: true,
    icon: "store",
  },
];

export const ARROW_INTERNAL = "\u2192";
export const ARROW_EXTERNAL = "\u2197\uFE0E";

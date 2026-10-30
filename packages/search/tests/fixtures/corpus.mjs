// Shared fixtures. Canary values are random per run (MMCANARY-<field>-<hex>),
// so no test or log ever depends on a fixed token, and no real name is used.
import { randomBytes } from "node:crypto";

export const canary = (field) => `MMCANARY-${field}-${randomBytes(6).toString("hex")}`;
export const NOW = new Date("2026-10-30T12:00:00Z");
export const GENERATED = "2026-10-30T12:00:00Z";

export function rec(over) {
  return {
    id: "item",
    title: "Item",
    site: "moosematrix",
    section: "library",
    type: "note",
    url: "/library/item/",
    summary: "A short summary.",
    tags: ["alpha"],
    date: "2026-10-01",
    tier: "public",
    status: "published",
    published_at: "2026-10-01T00:00:00Z",
    deleted_at: null,
    unlisted: false,
    noindex: false,
    body: "full body text that must never be indexed",
    ...over,
  };
}

export function item(over) {
  return {
    id: "item",
    title: "Item",
    site: "moosematrix",
    section: "library",
    type: "note",
    url: "https://moosematrix.com/library/item/",
    summary: "A short summary.",
    tags: ["alpha"],
    date: "2026-10-01",
    access: "public",
    ...over,
  };
}

export function envelope(items, site = "moosematrix") {
  return { version: 1, site, generated: GENERATED, items };
}

/** 5,000 valid items for time-budget tests. */
export function bigIndex(site = "moosematrix", n = 5000) {
  const words = ["reverse", "engineering", "security", "books", "ctf", "money", "kernel", "parser", "notes", "build"];
  const items = [];
  for (let i = 0; i < n; i++) {
    const w = (k) => words[(i * 7 + k * 3) % words.length];
    items.push(item({
      id: "i" + i,
      title: `${w(1)} ${w(2)} ${"ä".repeat(i % 3)} title ${i}`.slice(0, 200),
      summary: `${w(3)} ${w(4)} summary for item ${i} `.repeat(4).slice(0, 300),
      url: `https://moosematrix.com/library/i${i}/`,
      tags: [w(5), w(6)],
    }));
  }
  return envelope(items, site);
}

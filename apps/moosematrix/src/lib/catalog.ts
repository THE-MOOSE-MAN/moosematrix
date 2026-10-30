// Read side of src/content/catalog.json for the pages. The same file feeds /search-index.json
// (scripts/build-search-index.mjs), so the pages and the index never disagree.
import catalog from "../content/catalog.json";
import { LIBRARY_TYPES } from "./search-index.mjs";

export type Item = {
  id: string;
  title: string;
  site: string;
  type: string;
  url: string;
  summary: string;
  tags?: string[];
  access: string;
  status?: string;
};

const ORIGIN = "https://moosematrix.com";
const ITEMS = (catalog.items as Item[]).map((it) => ({
  ...it,
  // On-site links stay relative so they work on preview hosts too.
  href: it.url === ORIGIN ? "/" : it.url.startsWith(ORIGIN + "/") ? it.url.slice(ORIGIN.length) : it.url,
}));
export type ListItem = (typeof ITEMS)[number];

export const allItems = (): ListItem[] => ITEMS;
export const libraryItems = (): ListItem[] => ITEMS.filter((it) => LIBRARY_TYPES.includes(it.type));
export const typesIn = (items: ListItem[]): string[] => [...new Set(items.map((it) => it.type))];
export { LIBRARY_TYPES };

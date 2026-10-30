export const dynamic = "force-static";
export const revalidate = false;

import type { Metadata } from "next";
import { IndexList } from "../../components/IndexList";
import { PageHero } from "../../components/PageHero";
import { allItems, typesIn } from "../../lib/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search The Moose Matrix: projects, pages and writing.",
  alternates: { canonical: "/search" },
};

// Same items as /search-index.json (one catalog). The Moose Man's index joins in P2.
export default function Search() {
  const items = allItems();
  return (
    <div className="mm-v5">
      <PageHero crumb="Search" eyebrow="ONE INDEX" title="SEARCH" sub="PROJECTS · PAGES · WRITING">
        <p>Everything on The Moose Matrix in one list. Type to filter, or pick a type.</p>
      </PageHero>
      <section className="mm-section" aria-label="Search results">
        <div className="mm-shell">
          <IndexList
            items={items}
            types={typesIn(items)}
            action="/search"
            label="Search The Moose Matrix"
            placeholder="Search projects, pages and writing"
            emptyHtml={
              '<p>No matches. Try a shorter word, or browse <a href="/builds">Projects</a> and the <a href="/library">Library</a>.</p>'
            }
          />
          <script src="/js/mm-list.js" defer />
        </div>
      </section>
    </div>
  );
}

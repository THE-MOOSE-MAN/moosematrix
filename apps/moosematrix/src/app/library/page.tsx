export const dynamic = "force-static";
export const revalidate = false;

import type { Metadata } from "next";
import { IndexList } from "../../components/IndexList";
import { PageHero } from "../../components/PageHero";
import { LIBRARY_TYPES, libraryItems } from "../../lib/catalog";

export const metadata: Metadata = {
  title: "The Library",
  description: "Research, writeups, and essays from The Moose Matrix.",
  alternates: { canonical: "/library" },
};

export default function Library() {
  const items = libraryItems();
  return (
    <div className="mm-v5">
      <PageHero crumb="Library" eyebrow="RESEARCH · WRITEUPS · ESSAYS" title="THE LIBRARY" sub="STUDIO RESEARCH AND WRITING">
        <p>
          Research, writeups, and essays from The Moose Matrix. CTF writeups and book notes live on The Moose Man; the header
          search covers both sites.
        </p>
      </PageHero>
      <section className="mm-section" aria-label="Library index">
        <div className="mm-shell">
          <IndexList
            items={items}
            types={LIBRARY_TYPES}
            action="/library"
            label="Search the Library"
            placeholder="Search research, writeups and essays"
            emptyHtml={
              "<p>Nothing published here yet. The first research notes, writeups and essays are being written. Meanwhile, see " +
              '<a href="/builds">Projects</a>, read <a href="https://mooseman.moosematrix.com/moose-mumbles">Moose Mumbles</a>, or ' +
              '<a href="/search">search the site</a>.</p>'
            }
          />
          <script src="/js/mm-list.js" defer />
        </div>
      </section>
    </div>
  );
}

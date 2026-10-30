export const dynamic = "force-static";
export const revalidate = false;
export const fetchCache = "force-cache";

import type { Metadata } from "next";
import { GRAPH_ART, MOOSE_ART } from "../components/art";
import { libraryItems } from "../lib/catalog";

// Home, from the accepted v5 mock (site-v5/index.html), in token colours so it works in light and dark.
// Only real links: the two concept projects have no page yet, so their cards are not links.
export const metadata: Metadata = {
  title: "The Moose Matrix",
  description:
    "An independent technology studio: research, tools, writing and products for a more open, capable and secure digital future.",
  alternates: { canonical: "/" },
};

const QUICK = [
  { href: "/builds", icon: "▣", label: "Projects" },
  { href: "/library", icon: "▤", label: "Library" },
  { href: "/search?q=reverse%20engineering", icon: "⌘", label: "Reverse Engineering" },
  { href: "https://mooseman.moosematrix.com/moose-mumbles", icon: "⚑", label: "Moose Mumbles" },
  { href: "https://merch.moosematrix.com/", icon: "♧", label: "Shop" },
];

export default function Home() {
  const library = libraryItems().slice(0, 3);
  return (
    <div className="mm-v5">
      <section className="mm-hero" aria-labelledby="mm-hero-title">
        <div className="mm-shell mm-hero-in">
          <div className="mm-hero-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOOSE_ART }} />
          <div className="mm-hero-copy">
            <p className="mm-eyebrow mm-micro">FOR A MORE OPEN TOMORROW</p>
            <h1 id="mm-hero-title" className="mm-display mm-hero-title">
              THE<br />MOOSE MATRIX
            </h1>
            <p className="mm-hero-sub">INDEPENDENT STUDIO</p>
            <p className="mm-hero-desc">
              Research. Build. Reverse engineer. Document. Share.
              <br />
              An independent technology studio exploring the systems behind a more open, capable, and secure digital
              future.
            </p>
          </div>
          <nav className="mm-hero-links" aria-label="Quick links">
            <ul className="mm-chips-row" role="list">
              {QUICK.map((q) => (
                <li key={q.label} className="contents">
                  <a className="mm-chip-link" href={q.href}>
                    <span className="mm-chip-icon" aria-hidden="true">{q.icon}</span>
                    {q.label}
                  </a>
                </li>
              ))}
              <li className="contents">
                <a className="mm-chip-link" href="/search" data-mm-search-open="">
                  <span className="mm-chip-icon" aria-hidden="true">⌕</span>
                  Search
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <section className="mm-section" aria-labelledby="mm-projects-title">
        <div className="mm-shell">
          <div className="mm-section-top">
            <div>
              <h2 id="mm-projects-title" className="mm-display mm-section-title">SELECTED PROJECTS</h2>
              <p className="mm-section-note">Tools, systems, and things worth building.</p>
            </div>
            <a className="mm-text-link" href="/builds">[ VIEW ALL PROJECTS → ]</a>
          </div>
          <div className="mm-projects">
            <article className="mm-project">
              <div className="mm-project-top mm-micro"><span>01 / TOOLING</span><span>CONCEPT</span></div>
              <div className="mm-visual" aria-hidden="true">
                <div className="mm-terminal">
                  $ moose-lab inspect --target sample.bin{"\n"}
                  <span className="mm-accent">[+] loading ELF64 headers</span>{"\n"}
                  entry: 0x401000{"\n"}
                  sections: .text .rodata .data{"\n"}
                  <span className="mm-accent">[+] mapping functions...</span>{"\n"}
                  0x401005  xor byte ptr [rcx], 0xab{"\n"}
                  0x40100c  inc rcx{"\n"}
                  → analyzing control flow
                </div>
              </div>
              <h3>Assembly Stack Visualizer</h3>
              <p>A proposed interactive tool for inspecting registers, stack frames, and calling conventions.</p>
              <p className="mm-card-tags mm-micro">ASSEMBLY · DEBUGGING · VISUALIZATION</p>
            </article>
            <article className="mm-project">
              <div className="mm-project-top mm-micro"><span>02 / INFRASTRUCTURE</span><span>IN DEVELOPMENT</span></div>
              <div className="mm-visual mm-visual-grid" aria-hidden="true" />
              <h3>PROMETHEUS</h3>
              <p>A searchable knowledge platform built around PostgreSQL, pgvector, and structured ingestion.</p>
              <p className="mm-card-tags mm-micro">POSTGRES · PGVECTOR · SEARCH</p>
            </article>
            <article className="mm-project">
              <div className="mm-project-top mm-micro"><span>03 / FINANCE</span><span>LIVE</span></div>
              <div className="mm-visual" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GRAPH_ART }} />
              <h3>
                <a className="mm-card-link" href="https://m2.moosematrix.com/">Moose Money / M2 →</a>
              </h3>
              <p>
                Free military money tools: TSP growth and Savings Deposit Program calculators, live at m2.moosematrix.com.
              </p>
              <p className="mm-micro mm-accent">Planned: options trade journal</p>
              <p className="mm-card-tags mm-micro">FINANCE · ANALYTICS · DATA</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mm-section" aria-label="Highlights">
        <div className="mm-shell mm-editorial">
          <div>
            <div className="mm-col-head">
              <h2 className="mm-display">FROM THE LIBRARY</h2>
              <a className="mm-text-link" href="/library">[ OPEN LIBRARY → ]</a>
            </div>
            {library.length ? (
              library.map((it) => (
                <a key={it.id} className="mm-entry" href={it.href}>
                  <span className="mm-thumb" aria-hidden="true" />
                  <span>
                    <small className="mm-micro">{it.type}</small>
                    <strong>{it.title}</strong>
                  </span>
                </a>
              ))
            ) : (
              <p className="mm-empty">
                The first research notes, writeups and essays are being written. Until then, the build log is on{" "}
                <a className="mm-accent" href="/builds">Projects</a>.
              </p>
            )}
          </div>
          <div>
            <div className="mm-col-head">
              <h2 className="mm-display">THE MOOSE LAB</h2>
              <a className="mm-text-link" href="/lab">[ ENTER LAB → ]</a>
            </div>
            <div className="mm-lab-panel" aria-hidden="true">
              <pre>
                <span className="mm-comment"># research &gt; experiment &gt; iterate</span>
                {"\n"}def open_knowledge():{"\n"}    return {"{"}
                {"\n"}      <span className="mm-accent">&quot;tools&quot;</span>: &quot;better systems&quot;,
                {"\n"}      <span className="mm-accent">&quot;people&quot;</span>: &quot;stronger communities&quot;,
                {"\n"}      <span className="mm-accent">&quot;outcome&quot;</span>: &quot;a more open tomorrow&quot;
                {"\n"}    {"}"}
                {"\n"}&gt; <span className="mm-accent">▮</span>
              </pre>
            </div>
            <p className="mm-lab-desc">
              A working space for experiments, tools, and ideas in progress. Code, hardware, infrastructure, and the weird
              corners in between. <span className="mm-micro mm-accent">Planned · nothing open yet</span>
            </p>
          </div>
          <div>
            <div className="mm-col-head">
              <h2 className="mm-display">FROM THE MOOSE MAN</h2>
              <a className="mm-text-link" href="https://mooseman.moosematrix.com/">[ VISIT → ]</a>
            </div>
            <a className="mm-entry" href="https://mooseman.moosematrix.com/moose-mumbles">
              <span className="mm-thumb" aria-hidden="true" />
              <span>
                <small className="mm-micro">LIVE · BLOG</small>
                <strong>Moose Mumbles: writeups, reviews and notes in public</strong>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="mm-merch" aria-labelledby="mm-merch-title">
        <div className="mm-shell">
          <p className="mm-micro mm-accent">MOOSE MERCH / IN DEVELOPMENT</p>
          <h2 id="mm-merch-title" className="mm-display">
            TOOLS FOR<br />CURIOUS MINDS.
          </h2>
          <p>Apparel, gear, and limited editions for builders, researchers, and people who ask “how?”</p>
          <a className="mm-outline-button" href="https://merch.moosematrix.com/">
            VISIT MOOSE MERCH <span aria-hidden="true">→</span>
          </a>
          <p className="mm-micro mm-muted">TECHNICAL / FUNCTIONAL / UNDERSTATED</p>
        </div>
      </section>

      <section className="mm-section" aria-label="Studio and contact">
        <div className="mm-shell mm-studio">
          <div>
            <div className="mm-col-head"><h2 className="mm-display">ABOUT THE STUDIO</h2></div>
            <p className="mm-studio-copy">
              The Moose Matrix is a security-first ecosystem of tools, writing, and products. The personal side, with CTF
              writeups and life notes, lives on The Moose Man.
            </p>
            <div className="mm-studio-links">
              <a className="mm-text-link" href="/about">[ ABOUT THE STUDIO → ]</a>
              <a className="mm-text-link" href="https://mooseman.moosematrix.com/">[ THE MOOSE MAN → ]</a>
            </div>
          </div>
          <div>
            <div className="mm-col-head"><h2 className="mm-display">CONTACT</h2></div>
            <p className="mm-studio-copy">Collaboration, feedback, or business inquiries.</p>
            <div className="mm-studio-links">
              <a className="mm-text-link" href="/contact">[ CONTACT → ]</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

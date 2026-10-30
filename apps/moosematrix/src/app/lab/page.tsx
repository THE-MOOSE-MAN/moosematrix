export const dynamic = "force-static";
export const revalidate = false;

import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";

export const metadata: Metadata = {
  title: "The Moose Lab",
  description: "A working space for experiments, tools, and ideas in progress. Planned; nothing is open yet.",
  alternates: { canonical: "/lab" },
};

const AREAS = [
  { name: "Code", text: "Small tools and interactive prototypes, such as the Assembly Stack Visualizer concept." },
  { name: "Hardware", text: "Bench builds and hardware experiments." },
  { name: "Infrastructure", text: "Self-hosted systems and notes on how they fit together." },
];

export default function Lab() {
  return (
    <div className="mm-v5">
      <PageHero crumb="Lab" eyebrow="PLANNED · NOTHING OPEN YET" title="THE MOOSE LAB" sub="EXPERIMENTS IN PROGRESS">
        <p>
          A working space for experiments, tools, and ideas in progress. Code, hardware, infrastructure, and the weird
          corners in between.
        </p>
      </PageHero>
      <section className="mm-section" aria-labelledby="mm-lab-areas">
        <div className="mm-shell mm-two-col">
          <div className="mm-lab-panel" aria-hidden="true">
            <pre>
              <span className="mm-comment"># research &gt; experiment &gt; iterate</span>
              {"\n"}$ lab status{"\n"}
              <span className="mm-accent">[ ] nothing open yet</span>
              {"\n"}&gt; <span className="mm-accent">▮</span>
            </pre>
          </div>
          <div className="mm-mini-card">
            <p className="mm-micro mm-accent">STATUS</p>
            <h2 className="mm-display mm-section-title">PLANNED</h2>
            <p>
              Nothing is open in the Lab yet. When something is ready to try, it will be listed here with its notes, and its
              writeup will show up in the Library and in search.
            </p>
            <div className="mm-studio-links">
              <a className="mm-text-link" href="/library">[ LIBRARY → ]</a>
              <a className="mm-text-link" href="/builds">[ PROJECTS → ]</a>
            </div>
          </div>
        </div>
        <div className="mm-shell">
          <h2 id="mm-lab-areas" className="mm-display mm-section-title mm-lab-areas">PLANNED AREAS</h2>
          <div className="mm-mini-cards">
            {AREAS.map((a) => (
              <div key={a.name} className="mm-mini-card">
                <p className="mm-micro mm-muted">PLANNED</p>
                <h3>{a.name}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-static";
export const revalidate = false;

import type { Metadata } from "next";
import { PageHero } from "../../components/PageHero";

export const metadata: Metadata = {
  title: "Research · The Moose Matrix",
  description: "Projects, the Lab and the Library: what The Moose Matrix is building, testing and writing down.",
  alternates: { canonical: "/research" },
};

const HUB = [
  { href: "/builds", kicker: "PROJECTS", title: "Projects", text: "Tools, systems, and things worth building: what is live, in development, and still a concept." },
  { href: "/lab", kicker: "LAB", title: "The Moose Lab", text: "A working space for experiments, tools, and ideas in progress. Planned; nothing is open yet." },
  { href: "/library", kicker: "LIBRARY", title: "The Library", text: "Research notes, writeups and essays, as they are published." },
];

export default function Research() {
  return (
    <div className="mm-v5">
      <PageHero crumb="Research" eyebrow="RESEARCH & DEVELOPMENT" title="RESEARCH" sub="BUILD · TEST · WRITE IT DOWN">
        <p>Everything The Moose Matrix is building and studying, in one place. Start with a project, the Lab, or the Library.</p>
      </PageHero>
      <section className="mm-section" aria-labelledby="mm-research-areas">
        <div className="mm-shell">
          <h2 id="mm-research-areas" className="mm-sr-only">Research areas</h2>
          <ul className="mm-mini-cards mm-hub">
            {HUB.map((h) => (
              <li key={h.href} className="mm-mini-card">
                <p className="mm-micro mm-accent">{h.kicker}</p>
                <h3><a className="mm-card-link" href={h.href}>{h.title} →</a></h3>
                <p>{h.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

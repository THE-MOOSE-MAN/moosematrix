import Link from "next/link";
import { Button, Badge, Card } from "@moosematrix/ui";

const links = [
  { href: "https://mooseman.moosematrix.com", title: "Moose Man", desc: "Personal blog • Moose Mumbles" },
  { href: "https://store.moosematrix.com", title: "Store", desc: "Physical + digital products" },
  { href: "https://omnivium.moosematrix.com", title: "Omnivium", desc: "Cross-device VM sync project" }
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-4xl text-center">
        <Badge>The Moose Matrix</Badge>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white">
          Build. Learn. Ship.
        </h1>
        <p className="mt-4 text-lg text-white/70">
          A clean hub for Dustin “The Moose Man” Warren’s projects, writing, and products.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="https://mooseman.moosematrix.com"><Button>Visit Moose Man</Button></Link>
          <Link href="https://store.moosematrix.com"><Button variant="secondary">Visit Store</Button></Link>
          <Link href="https://omnivium.moosematrix.com"><Button variant="ghost">Visit Omnivium</Button></Link>
        </div>
      </div>

      <section className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="no-underline">
            <Card>
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold text-white">{l.title}</h3>
                <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </div>
              <p className="mt-2 text-white/70">{l.desc}</p>
            </Card>
          </a>
        ))}
      </section>

      <footer className="mt-16 text-sm text-white/60">
        © {new Date().getFullYear()} The Moose Matrix
      </footer>
    </main>
  );
}

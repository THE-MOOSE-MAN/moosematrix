import Link from "next/link";
import Image from "next/image";
import { Button, Badge, Card } from "@moosematrix/ui";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero */}
      <section className="text-center">
        <Badge>The Moose Matrix</Badge>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white">
          A small studio building useful things.
        </h1>
        <p className="mt-4 text-lg text-white/70">
          Holding company for a few focused ventures and a personal blog, run by Dustin
          “The Moose Man” Warren.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/about"><Button>About</Button></Link>
          <Link href="/contact"><Button variant="secondary">Contact</Button></Link>
        </div>
      </section>

      {/* What is Moose Matrix */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="text-2xl font-semibold text-white">What is The Moose Matrix?</h2>
          <p className="mt-3 text-white/75 leading-relaxed">
            The Moose Matrix is a small, independent studio and umbrella company. We build and ship
            software, content, and products that make everyday workflows smoother. This site is the
            front door: a simple way to learn what we do and to reach the right brand quickly.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white">At a glance</h3>
          <ul className="mt-3 space-y-2 text-white/80">
            <li>• Three active subsidiaries</li>
            <li>• Blog </li>
            <li>• Contact for partnerships</li>
          </ul>
        </Card>
      </section>

      {/* Subsidiaries */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-white">Subsidiaries</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          

          <a href="https://matrix.moosematrix.com" className="no-underline">
            <Card>
              <div className="flex items-center gap-3">
                <Image src="/matrix-logo.png" alt="" width={36} height={36} className="rounded-lg border border-white/10" />
                <h3 className="text-xl font-semibold text-white">The Moose Matrix</h3>
              </div>
              <p className="mt-2 text-white/70">Studio & corporate hub: mission, portfolio, services, press.</p>
              <div className="mt-4"><Button variant="ghost">Visit</Button></div>
            </Card>
            
          </a>
            <a href="https://m2.moosematrix.com" className="no-underline">
            <Card>
              <div className="flex items-center gap-3">
                <Image src="/moose_money_logo.png" alt="" width={36} height={36} className="rounded-lg border border-white/10" />
                <h3 className="text-xl font-semibold text-white">Moo$e Money</h3>
              </div>
              <p className="mt-2 text-white/70">Money, tools, and playbooks—focused on clarity and control.</p>
              <div className="mt-4"><Button variant="ghost">Visit</Button></div>
            </Card>
          </a>
          <a href="https://moosemerch.moosematrix.com" className="no-underline">
            <Card>
              <div className="flex items-center gap-3">
                <Image src="/moose_merch_logo.png" alt="" width={36} height={36} className="rounded-lg border border-white/10" />
                <h3 className="text-xl font-semibold text-white">Store</h3>
              </div>
              <p className="mt-2 text-white/70">Physical + digital goods that support the work and community.</p>
              <div className="mt-4"><Button variant="ghost">Visit</Button></div>
            </Card>
          </a>
        </div>
      </section>

      {/* Blog preview */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">From the Blog</h2>
          <a href="https://mooseman.moosematrix.com" className="text-sm text-white/80 hover:text-white">View all</a>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Static placeholders for now; we’ll replace with live posts soon */}
          {[
            { title: "Hello Moose", date: "2025-01-10", link: "https://mooseman.moosematrix.com" },
            { title: "On Building in Public", date: "2025-02-05", link: "https://mooseman.moosematrix.com" },
            { title: "Tiny Tools, Big Wins", date: "2025-03-12", link: "https://mooseman.moosematrix.com" },
          ].map((p) => (
            <a key={p.title} href={p.link} className="no-underline">
              <Card>
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-white/60">{new Date(p.date).toLocaleDateString()}</p>
                <p className="mt-2 text-white/70">A short excerpt will live here in the real feed.</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mt-16">
        <Card className="text-center">
          <h2 className="text-2xl font-semibold text-white">Partner with The Moose Matrix</h2>
          <p className="mt-2 text-white/75">
            Have a collaboration in mind, or want to learn more? Let’s talk.
          </p>
          <div className="mt-4">
            <Link href="/contact"><Button>Get in touch</Button></Link>
          </div>
        </Card>
      </section>
    </main>
  );
}

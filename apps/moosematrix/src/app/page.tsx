"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, Card } from "@moosematrix/ui";

const taglines = [
  "🌀 Enter the Matrix.",
  "🛠️ Build in Public.",
  "⚡ From Idea to Impact.",
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-animated-gradient">
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />

      <main className="relative mx-auto max-w-6xl px-6 py-12 space-y-32">
        {/* Hero */}
        <section className="text-center">
          {/* YouTube Logo Animation */}
          <div className="relative w-full max-w-5xl mx-auto aspect-video rounded-lg overflow-hidden shadow-2xl mt-4">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/xpweDqD9idM?autoplay=1&mute=1&loop=1&playlist=xpweDqD9idM&controls=0&modestbranding=1"
              title="Matrix Logo Animation"
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>

          <h1 className="mt-10 text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg">
            Enter The Moose Matrix
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            A hub for software, content, and products that make workflows smoother.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="https://matrix.moosematrix.com">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xl px-10 py-4 rounded-xl shadow-lg animate-pulse"
              >
                🌀 Enter The Matrix
              </Button>
            </Link>
          </div>
        </section>

        {/* Taglines woven through scroll */}
        <section className="space-y-40">
          {taglines.map((line, idx) => (
            <motion.h2
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-5xl font-extrabold text-center text-white"
            >
              {line}
            </motion.h2>
          ))}
        </section>

        {/* Subsidiaries */}
        <section>
          <h2 className="text-2xl font-semibold text-white text-center">
            Subsidiaries
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "The Moose Matrix",
                desc: "Studio & corporate hub: mission, portfolio, services, press.",
                href: "https://matrix.moosematrix.com",
                img: "/moose.png",
              },
              {
                title: "Moo$e Money",
                desc: "Money, tools, and playbooks—focused on clarity and control.",
                href: "https://m2.moosematrix.com",
                img: "/moose_money_logo.png",
              },
              {
                title: "Store",
                desc: "Physical + digital goods that support the work and community.",
                href: "https://moosemerch.moosematrix.com",
                img: "/moose_merch_logo.png",
              },
            ].map(({ title, desc, href, img }) => (
              <a key={title} href={href} className="no-underline group h-full">
                <Card className="flex flex-col justify-between h-full relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                  <div>
                    <div className="flex items-center gap-4">
                      <Image
                        src={img}
                        alt={title}
                        width={56}
                        height={56}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-300 group-hover:scale-110"
                      />
                      <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition">
                        {title}
                      </h3>
                    </div>
                    <p className="mt-3 text-white/70 leading-relaxed">{desc}</p>
                  </div>
                  <div className="mt-5">
                    <Button variant="ghost" className="group-hover:text-indigo-400">
                      Visit →
                    </Button>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>

        {/* Blog Preview */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">From the Blog</h2>
            <a
              href="https://mooseman.moosematrix.com"
              className="text-sm text-white/80 hover:text-white"
            >
              View all
            </a>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Hello Moose",
                date: "2025-01-10",
                link: "https://mooseman.moosematrix.com",
              },
              {
                title: "On Building in Public",
                date: "2025-02-05",
                link: "https://mooseman.moosematrix.com",
              },
              {
                title: "Tiny Tools, Big Wins",
                date: "2025-03-12",
                link: "https://mooseman.moosematrix.com",
              },
            ].map((p) => (
              <a key={p.title} href={p.link} className="no-underline group">
                <Card className="rounded-xl border border-white/10 bg-gray-900/80 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/50">
                      {new Date(p.date).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      A short excerpt will live here in the real feed.
                    </p>
                  </div>
                  <div className="mt-4 text-indigo-400 text-sm">Read more →</div>
                </Card>
              </a>
            ))}
          </div>
        </section>

        {/* Partner CTA */}
        <section>
          <Card className="text-center bg-gradient-to-br from-indigo-700/40 to-black p-10 shadow-2xl rounded-2xl border border-indigo-500/20">
            <h2 className="text-3xl font-extrabold text-white">
              Partner with The Moose Matrix
            </h2>
            <p className="mt-3 text-white/80 max-w-xl mx-auto">
              Have a collaboration in mind, or want to learn more? Let’s talk.
            </p>
            <div className="mt-6">
              <Link href="/contact">
                <Button className="px-8 py-3 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg">
                  Get in touch
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button, Card } from "@moosematrix/ui";

// Taglines revealed while scrolling
const taglines = [
  "🌀 Step into the Matrix.",
  "🔐 Breaking → Building → Sharing.",
  "⚡ Exploits, Insights, and Impact.",
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-animated-gradient">
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />

      <main className="relative mx-auto max-w-6xl px-6 py-12 space-y-32">
        {/* =======================================================
            HERO SECTION
        ======================================================= */}
        <section className="text-center">
          {/* Logo Animation (YouTube embed) */}
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

          {/* Title + tagline */}
          <h1 className="mt-10 text-5xl md:text-6xl font-mono font-extrabold text-white drop-shadow-lg">
            Enter The Moose Matrix
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Writing, research, and projects at the intersection of code, security, and systems.
          </p>

          {/* CTA button */}
          <div className="mt-8 flex justify-center">
            <Link href="https://matrix.moosematrix.com">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xl px-10 py-4 rounded-xl shadow-lg animate-pulse"
              >
                🌀 Step into the Matrix
              </Button>
            </Link>
          </div>
        </section>

        {/* =======================================================
            TAGLINES (revealed on scroll)
        ======================================================= */}
        <section className="space-y-40">
          {taglines.map((line, idx) => (
            <motion.h2
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-5xl font-mono font-extrabold text-center text-white"
            >
              {line}
            </motion.h2>
          ))}
        </section>

        {/* =======================================================
            SUBSIDIARIES
        ======================================================= */}
        <section>
          <h2 className="text-2xl font-mono font-semibold text-white text-center">
            Subsidiaries
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "The Moose Matrix",
                desc: "Core studio — portfolio, mission, research, and collaborations.",
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
                  {/* Card header: logo + title */}
                  <div>
                    <div className="flex items-center gap-4">
                      <Image
                        src={img}
                        alt={title}
                        width={56}
                        height={56}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-300 group-hover:scale-110"
                      />
                      <h3 className="text-2xl font-mono font-bold text-white group-hover:text-indigo-400 transition">
                        {title}
                      </h3>
                    </div>
                    <p className="mt-3 text-white/70 leading-relaxed">{desc}</p>
                  </div>
                  {/* Card footer: CTA */}
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

        {/* =======================================================
            BLOG SECTION
        ======================================================= */}
        <section className="mt-32">
          {/* Section heading */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-mono font-extrabold text-white">
              📚 Blog
            </h2>
            <p className="mt-2 text-white/70 text-sm md:text-base">
              Thoughts, writeups, and reflections from The Moose Man.
            </p>
          </div>

          {/* Featured Post */}
          <div className="mt-10">
            <a
              href="https://mooseman.moosematrix.com"
              className="no-underline group block"
            >
              <Card className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Thumbnail placeholder (replace with cover image later) */}
                  <div className="flex-shrink-0 w-full md:w-1/3 h-48 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center text-white/50">
                    🖼️
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-mono font-bold text-white group-hover:text-indigo-400 transition">
                      Featured: Hello Moose
                    </h3>
                    <p className="mt-2 text-xs uppercase tracking-wide text-white/50">
                      {new Date("2025-01-10").toLocaleDateString()}
                    </p>
                    <p className="mt-4 text-white/70 leading-relaxed">
                      The Moose Matrix: why it exists, and what’s next at the edge of security and engineering.
                    </p>
                    <div className="mt-4">
                      <span className="text-indigo-400 font-medium">Read more →</span>
                    </div>
                  </div>
                </div>
              </Card>
            </a>
          </div>

          {/* Other Posts Grid */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
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
              {
                title: "Moose Matrix in Motion",
                date: "2025-04-20",
                link: "https://mooseman.moosematrix.com",
              },
            ].map((p) => (
              <a key={p.title} href={p.link} className="no-underline group h-full">
                <Card className="h-full flex flex-col justify-between rounded-xl border border-white/10 bg-gray-900/80 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div>
                    <h3 className="text-lg font-mono font-semibold text-white group-hover:text-indigo-400 transition">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/50">
                      {new Date(p.date).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Brief analysis and takeaways — full article coming from the archive.
                    </p>
                  </div>
                  <div className="mt-4 text-indigo-400 text-sm">Read more →</div>
                </Card>
              </a>
            ))}
          </div>

          {/* CTA to Blog */}
          <div className="mt-12 text-center">
            <Link href="https://mooseman.moosematrix.com">
              <Button variant="secondary" className="px-6 py-3 text-sm md:text-base">
                📚 View All Posts
              </Button>
            </Link>
          </div>
        </section>

        {/* =======================================================
            PARTNER CTA
        ======================================================= */}
        <section>
          <Card className="text-center bg-gradient-to-br from-indigo-700/40 to-black p-10 shadow-2xl rounded-2xl border border-indigo-500/20">
            <h2 className="text-3xl font-mono font-extrabold text-white">
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

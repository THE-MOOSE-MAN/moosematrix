"use client";

import { useEffect, useMemo, useState } from "react";

type DotItem = { id: string; label: string };

export function ScrollDots({
  containerId,
  items,
}: {
  containerId: string;
  items: DotItem[];
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;

    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).id;
          if (!best || e.intersectionRatio > best.ratio) {
            best = { id, ratio: e.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root, threshold: [0.35, 0.5, 0.65, 0.8] }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [containerId, ids]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Section navigation" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 md:flex">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-3 backdrop-blur">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => scrollTo(it.id)}
              className="group relative flex h-3.5 w-3.5 items-center justify-center rounded-full
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label={`Go to ${it.label}`}
              aria-current={isActive ? "true" : undefined}
            >
              <span
                aria-hidden
                className={[
                  "block h-2 w-2 rounded-full border border-[var(--border)]",
                  isActive ? "bg-[var(--fg)]" : "bg-transparent",
                ].join(" ")}
              />
              <span className="pointer-events-none absolute right-6 whitespace-nowrap rounded-xl border border-[var(--border)]
                               bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--fg)]
                               opacity-0 shadow-[var(--shadow-sm)] transition group-hover:opacity-100">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

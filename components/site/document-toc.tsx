"use client";

import { useEffect, useRef, useState } from "react";

export type TocEntry = { id: string; label: string };

export function DocumentToc({ sections }: { sections: TocEntry[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const el of els) observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="hidden md:block">
      <div className="sticky top-[calc(var(--header-h,72px)+24px)]">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-3)]">
          On this page
        </p>
        <ul className="space-y-1">
          {sections.map((s) => {
            const active = activeId === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`block border-l-2 py-1 pl-3 text-[13px] leading-snug transition-colors ${
                    active
                      ? "border-[var(--color-coral)] font-medium text-[var(--color-ink)]"
                      : "border-transparent text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

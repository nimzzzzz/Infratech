"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";

type LeadershipPerson = {
  id: number;
  name: string;
  title: string;
  linkedinUrl: string;
  displayOrder: number;
};

export function VendorLeadershipPanel({ slug }: { slug: string }) {
  const [people, setPeople] = useState<LeadershipPerson[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/vendors/${slug}/leadership`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setPeople([]);
          return;
        }
        const json = (await res.json()) as { people?: LeadershipPerson[] };
        if (!cancelled) setPeople(json.people ?? []);
      } catch {
        if (!cancelled) setPeople([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!people || people.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[var(--color-line)] pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          Key contacts
        </p>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          Signed-in
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {people.slice(0, 4).map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--color-line-strong)] bg-[var(--color-canvas)]">
                <span className="font-heading text-[22px] italic leading-none text-[var(--color-ink)]">
                  {person.name.trim().charAt(0) || "?"}
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[16px] text-[var(--color-ink)]">
                  {person.name}
                </p>
                <p className="truncate text-[13px] text-[var(--color-ink-3)]">
                  {person.title}
                </p>
              </div>
            </div>
            <a
              href={person.linkedinUrl}
              target="_blank"
              rel="nofollow noopener"
              className="inline-flex h-8 shrink-0 items-center gap-2 border border-[var(--color-line-strong)] px-2.5 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)]"
            >
              <span className="grid h-4 w-4 place-items-center bg-[#0a66c2] font-sans text-[10px] font-bold leading-none text-white">
                in
              </span>
              <span className="hidden sm:inline">LinkedIn</span>
              <ArrowUpRight size={10} weight="bold" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

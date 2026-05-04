"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  ArrowRight,
  Check,
} from "@phosphor-icons/react";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { apps } from "@/lib/data/apps";
import { stageNameMap } from "@/lib/data/stages";
import { cn } from "@/lib/utils";

export function ClaimSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submittingSlug, setSubmittingSlug] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return apps.slice(0, 8);
    const needle = query.toLowerCase();
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(needle) ||
        a.vendor.toLowerCase().includes(needle),
    );
  }, [query]);

  const handleClaim = (slug: string) => {
    setSubmittingSlug(slug);
    // simulated round-trip; real version would POST to /api/claims
    setTimeout(() => {
      router.push("/dashboard/onboarding/complete");
    }, 350);
  };

  return (
    <div>
      <label className="relative flex h-12 w-full items-center border border-[var(--color-line-strong)] bg-[var(--color-surface)] focus-within:border-[var(--color-ink)]">
        <MagnifyingGlass
          size={16}
          weight="regular"
          className="ml-4 shrink-0 text-[var(--color-ink-3)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or vendor…"
          className="h-full w-full bg-transparent px-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          aria-label="Search the directory"
        />
      </label>

      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
        <span className="num">{results.length}</span>{" "}
        {results.length === 1 ? "result" : "results"}
        {query ? (
          <>
            {" "}for{" "}
            <span className="text-[var(--color-ink-2)]">&ldquo;{query}&rdquo;</span>
          </>
        ) : null}
      </p>

      <ul className="mt-6 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {results.length === 0 ? (
          <li>
            <div className="grid place-items-center px-4 py-12 text-center">
              <p className="text-[13px] text-[var(--color-ink-2)]">
                No matches. Want to{" "}
                <a
                  href="/dashboard/onboarding/submit"
                  className="underline underline-offset-4 hover:text-[var(--color-ink)]"
                >
                  submit it as a new listing
                </a>{" "}
                instead?
              </p>
            </div>
          </li>
        ) : (
          results.map((app) => {
            const submitting = submittingSlug === app.slug;
            return (
              <li key={app.slug}>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4 md:gap-6 md:py-5">
                  <LetterAvatar name={app.name} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
                      {app.vendor}
                    </p>
                    <p className="font-heading text-[18px] leading-tight md:text-[20px]">
                      {app.name}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-3)]">
                      {app.stages
                        .map((s) => stageNameMap.get(s) ?? s)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClaim(app.slug)}
                    disabled={submitting}
                    className={cn(
                      "group inline-flex h-9 items-center gap-1.5 border px-3 text-[10px] uppercase tracking-[0.18em] transition-colors sm:h-10 sm:px-4 sm:text-[11px]",
                      submitting
                        ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-white"
                        : "border-[var(--color-line-strong)] text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]",
                    )}
                  >
                    {submitting ? (
                      <>
                        <Check size={11} weight="bold" />
                        <span>Submitted</span>
                      </>
                    ) : (
                      <>
                        <span>Claim</span>
                        <ArrowRight
                          size={11}
                          weight="bold"
                          className="transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="mt-8 text-[12px] leading-relaxed text-[var(--color-ink-3)]">
        Can&rsquo;t find your product?{" "}
        <a
          href="/dashboard/onboarding/submit"
          className="underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Submit it as a new listing
        </a>
        .
      </p>
    </div>
  );
}

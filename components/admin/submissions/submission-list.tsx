"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AdminSubmissionListItem } from "@/lib/queries/submissions";
import { relativeDays } from "@/lib/browse/dates";

type Tab = { key: string; label: string };
const TABS: Tab[] = [
  { key: "queue", label: "Queue" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending",
  edited_awaiting_vendor_approval: "Awaiting vendor",
  published: "Live",
  rejected: "Rejected",
  in_review: "In review",
  changes_requested: "Changes requested",
};

const STATUS_TONE: Record<string, string> = {
  pending_review: "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40",
  edited_awaiting_vendor_approval:
    "bg-amber-50 text-amber-700 ring-amber-300",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  rejected: "bg-rose-50 text-rose-700 ring-rose-300",
};

const TYPE_LABEL: Record<string, string> = {
  new: "New product",
  company_edit: "Company edit",
  product_edit: "Product edit",
  claim: "Claim",
};

const TYPE_TONE: Record<string, string> = {
  new: "text-[var(--color-ink-2)] ring-[var(--color-line-strong)]",
  company_edit: "text-violet-700 ring-violet-300",
  product_edit: "text-sky-700 ring-sky-300",
  claim: "text-[var(--color-ink-2)] ring-[var(--color-line-strong)]",
};

export function SubmissionList({
  rows,
  activeTab,
  q,
}: {
  rows: AdminSubmissionListItem[];
  activeTab: string;
  q: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [draft, setDraft] = useState(q);

  // Sync `draft` with the URL when the user navigates externally
  // (browser back, tab click that drops `q`).
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const setTab = (key: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("tab", key);
    router.push(`/admin/submissions?${next.toString()}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(sp.toString());
    if (draft.trim()) next.set("q", draft.trim());
    else next.delete("q");
    router.push(`/admin/submissions?${next.toString()}`);
  };

  return (
    <div className="mt-10">
      {/* Tabs + search */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-line-strong)] pb-3 md:flex-row md:items-end md:justify-between">
        <nav aria-label="Filter submissions">
          <ul className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = t.key === activeTab;
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative inline-flex items-center px-3 py-2 text-[14px] uppercase tracking-[0.18em] transition-colors",
                      active
                        ? "text-[var(--color-ink)]"
                        : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                    )}
                  >
                    <span className="relative">
                      {t.label}
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute -bottom-1.5 left-0 right-0 h-px bloom"
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2"
          role="search"
        >
          <label htmlFor="adm-q" className="sr-only">
            Search submissions
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              weight="regular"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)]"
            />
            <input
              id="adm-q"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search product or vendor"
              className="h-10 w-[280px] border border-[var(--color-line-strong)] bg-[var(--color-surface)] pl-9 pr-3 text-[15px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <p className="mt-10 text-[16px] text-[var(--color-ink-3)]">
          {q ? `No submissions match "${q}".` : "Nothing in this view."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {rows.map((row) => {
            const display =
              ((row.adminEdits as { name?: string } | null)?.name as
                | string
                | undefined) ??
              ((row.payload as { name?: string } | null)?.name as
                | string
                | undefined) ??
              "—";
            return (
              <li key={row.id}>
                <Link
                  href={`/admin/submissions/${row.id}`}
                  prefetch
                  className="grid grid-cols-[1fr_auto_auto_88px] items-center gap-3 py-4 transition-colors hover:bg-[var(--color-canvas-warm)]/40 md:grid-cols-[1fr_auto_auto_auto_88px] md:gap-6 md:px-3"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-[20px] leading-tight">
                      {display}
                    </p>
                    <p className="mt-0.5 truncate text-[14px] text-[var(--color-ink-3)]">
                      {row.vendor.name}
                    </p>
                  </div>
                  <TypePill type={row.type} />
                  <StatusPill status={row.status} />
                  <span className="hidden text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] md:inline">
                    {row.vendor.contactEmail ?? ""}
                  </span>
                  <span className="num text-right text-[14px] text-[var(--color-ink-3)]">
                    {
                      relativeDays(row.submittedAt.toISOString().slice(0, 10))
                        .label
                    }
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const tone =
    STATUS_TONE[status] ??
    "bg-[var(--color-canvas-warm)] text-[var(--color-ink-2)] ring-[var(--color-line-strong)]";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const label = TYPE_LABEL[type] ?? type;
  const tone = TYPE_TONE[type] ?? TYPE_TONE.new;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

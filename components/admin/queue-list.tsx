"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  X,
  PencilSimple,
  ArrowUpRight,
  Tag,
} from "@phosphor-icons/react";
import { LetterAvatar } from "@/components/browse/letter-avatar";
import { StatusPill } from "@/components/admin/status-pill";
import { stageNameMap } from "@/lib/data/stages";
import { lookups } from "@/lib/data/taxonomy";
import { relativeDays } from "@/lib/browse/dates";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/data/admin-queue";

type Filter = "all" | "new" | "claim" | "pending";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "new", label: "New products" },
  { key: "claim", label: "Claims" },
];

export function QueueList({ items }: { items: Submission[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [resolved, setResolved] = useState<
    Record<string, "approved" | "changes-requested" | "rejected" | undefined>
  >({});

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "pending")
      return items.filter((i) => i.status === "pending");
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  const decide = (
    id: string,
    decision: "approved" | "changes-requested" | "rejected",
  ) => setResolved((r) => ({ ...r, [id]: decision }));

  return (
    <div>
      {/* filter tabs */}
      <div className="flex flex-wrap items-center gap-0 border border-[var(--color-line-strong)] p-1">
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors",
                active
                  ? "bg-[var(--color-ink)] text-[var(--color-canvas)]"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {visible.length === 0 ? (
          <li className="py-12 text-center text-[13px] text-[var(--color-ink-3)]">
            No submissions match this filter.
          </li>
        ) : (
          visible.map((sub) => (
            <SubmissionRow
              key={sub.id}
              sub={sub}
              decision={resolved[sub.id]}
              onDecide={(d) => decide(sub.id, d)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function SubmissionRow({
  sub,
  decision,
  onDecide,
}: {
  sub: Submission;
  decision?: "approved" | "changes-requested" | "rejected";
  onDecide: (d: "approved" | "changes-requested" | "rejected") => void;
}) {
  const [open, setOpen] = useState(false);
  const title = sub.type === "new" ? sub.app.name : sub.claimAppName;
  const vendor =
    sub.type === "new" ? sub.app.vendor : sub.submitter.companyName;

  return (
    <li id={sub.id} className="scroll-mt-24">
      <div
        className={cn(
          "transition-colors",
          decision ? "bg-[var(--color-canvas-warm)]/30" : "",
        )}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:grid-cols-[auto_1fr_auto_auto] md:gap-6 md:px-3">
          <LetterAvatar name={title} className="h-10 w-10" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
                {sub.type === "new" ? "New product" : "Claim"}
              </span>
              <StatusPill status={decision ?? sub.status} />
            </div>
            <p className="mt-1 font-heading text-[20px] leading-tight md:text-[22px]">
              {title}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-3)]">
              <span className="text-[var(--color-coral)]">{vendor}</span>{" "}
              &middot; submitted by {sub.submitter.name},{" "}
              {sub.submitter.title}{" "}
              <span className="num">
                &middot; {relativeDays(sub.submittedAt.slice(0, 10)).label}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline md:inline-flex"
          >
            {open ? "Hide" : "Details"}
          </button>

          <ActionGroup
            disabled={Boolean(decision)}
            onApprove={() => onDecide("approved")}
            onChanges={() => onDecide("changes-requested")}
            onReject={() => onDecide("rejected")}
          />
        </div>

        {open ? <SubmissionDetail sub={sub} /> : null}
      </div>
    </li>
  );
}

function ActionGroup({
  disabled,
  onApprove,
  onChanges,
  onReject,
}: {
  disabled: boolean;
  onApprove: () => void;
  onChanges: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <ActionButton
        label="Approve"
        icon={Check}
        tone="approve"
        disabled={disabled}
        onClick={onApprove}
      />
      <ActionButton
        label="Changes"
        icon={PencilSimple}
        tone="changes"
        disabled={disabled}
        onClick={onChanges}
      />
      <ActionButton
        label="Reject"
        icon={X}
        tone="reject"
        disabled={disabled}
        onClick={onReject}
      />
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{
    size?: number;
    weight?: "regular" | "bold" | "fill";
  }>;
  tone: "approve" | "changes" | "reject";
  disabled: boolean;
  onClick: () => void;
}) {
  const tones = {
    approve:
      "border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
    changes:
      "border-amber-300 text-amber-700 hover:bg-amber-600 hover:text-white hover:border-amber-600",
    reject:
      "border-[var(--color-magenta)]/40 text-[var(--color-magenta)] hover:bg-[var(--color-magenta)] hover:text-white hover:border-[var(--color-magenta)]",
  } as const;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 border px-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3",
        tones[tone],
      )}
    >
      <Icon size={11} weight="bold" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function SubmissionDetail({ sub }: { sub: Submission }) {
  const company = sub.type === "new" ? sub.company : undefined;
  return (
    <div className="border-t border-[var(--color-line)] bg-[var(--color-canvas-warm)]/40 px-3 py-5">
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <DetailBlock title="Submitter">
          <DetailRow label="Name" value={sub.submitter.name} />
          <DetailRow label="Title" value={sub.submitter.title} />
          <DetailRow label="Email" value={sub.submitter.email} />
          <DetailRow label="Company" value={sub.submitter.companyName} />
          <DetailRow
            label="LinkedIn"
            value={
              <a
                href={sub.submitter.linkedinUrl}
                target="_blank"
                rel="nofollow noopener"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                Profile <ArrowUpRight size={11} weight="bold" />
              </a>
            }
          />
        </DetailBlock>

        {company ? (
          <DetailBlock title="Company profile (new)">
            <DetailRow label="Name" value={company.name} />
            <DetailRow
              label="Website"
              value={
                <a
                  href={company.website}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  {company.website} <ArrowUpRight size={11} weight="bold" />
                </a>
              }
            />
            <DetailRow label="Founded" value={String(company.founded)} />
            <DetailRow label="Team size" value={company.employeeBand} />
            <DetailRow label="HQ" value={company.headquarters} />
            <DetailRow label="Description" value={company.description} />
            <DetailRow
              label="Gallery"
              value={
                <span className="num">
                  {company.galleryCount} image
                  {company.galleryCount === 1 ? "" : "s"} attached
                </span>
              }
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-coral)]">
              First submission from this vendor &mdash; approving the product also
              publishes the company profile.
            </p>
          </DetailBlock>
        ) : null}

        {sub.type === "new" ? (
          <DetailBlock title="Product">
            <DetailRow label="Name" value={sub.app.name} />
            <DetailRow label="Vendor" value={sub.app.vendor} />
            <DetailRow
              label="Website"
              value={
                <a
                  href={sub.app.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  {sub.app.url} <ArrowUpRight size={11} weight="bold" />
                </a>
              }
            />
            <DetailRow label="Tagline" value={sub.app.tagline} />
            <DetailRow
              label="Stages"
              value={sub.app.stages
                .map((s) => stageNameMap.get(s) ?? s)
                .join(", ")}
            />
            <TaxonomyDetailRow
              label="Capabilities"
              canonical={sub.app.capabilities.map(
                (c) => lookups.capability.get(c) ?? c,
              )}
              proposed={sub.app.customCapabilities}
            />
            <TaxonomyDetailRow
              label="Industries"
              canonical={sub.app.industries.map(
                (i) => lookups.industry.get(i) ?? i,
              )}
              proposed={sub.app.customIndustries}
            />
            <DetailRow
              label="Pricing"
              value={
                sub.app.customPricing
                  ? `${sub.app.customPricing} (proposed)`
                  : lookups.pricing.get(sub.app.pricing) ?? sub.app.pricing
              }
            />
          </DetailBlock>
        ) : (
          <DetailBlock title="Claim target">
            <DetailRow label="App" value={sub.claimAppName} />
            <DetailRow
              label="Listing"
              value={
                <Link
                  href={`/apps/${sub.claimAppSlug}`}
                  className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  Open public listing{" "}
                  <ArrowUpRight size={11} weight="bold" />
                </Link>
              }
            />
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
              Cross-check the submitter&rsquo;s LinkedIn affiliation with the
              vendor on the public listing before approving.
            </p>
          </DetailBlock>
        )}
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="border-b border-[var(--color-line)] pb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
        {title}
      </p>
      <dl className="mt-3 space-y-1.5">{children}</dl>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-[12px]">
      <dt className="uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="break-words text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function TaxonomyDetailRow({
  label,
  canonical,
  proposed,
}: {
  label: string;
  canonical: string[];
  proposed: string[];
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-[12px]">
      <dt className="uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-1.5 text-[var(--color-ink)]">
        {canonical.length > 0 ? <span>{canonical.join(", ")}</span> : null}
        {proposed.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 border border-dashed border-[var(--color-coral)] bg-[var(--color-canvas)] px-1.5 py-0.5 text-[11px]"
          >
            <Tag size={10} weight="regular" className="text-[var(--color-coral)]" />
            {p}
            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--color-coral)]">
              Proposed
            </span>
          </span>
        ))}
        {canonical.length === 0 && proposed.length === 0 ? (
          <span className="text-[var(--color-ink-3)]">—</span>
        ) : null}
      </dd>
    </div>
  );
}

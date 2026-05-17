"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  changedFieldKeys,
  unchangedFieldKeys,
  DIFF_FIELD_LABELS,
  type DiffField,
  type DiffResult,
  type DiffValue,
} from "@/lib/submissions/diff";

/**
 * Side-by-side diff renderer for the vendor's "admin edited my
 * submission" card. Default view shows only fields where
 * `changed === true`. A toggle reveals unchanged fields (muted
 * styling) for vendors who want full context.
 *
 * Desktop: two columns (Original | AllInfratech's edits) with a
 * coral 3px left-border on the changed-row block.
 *
 * Mobile (<md): each field stacks Label → Original → Edited so
 * the comparison is still scannable at 375px.
 */
export function SubmissionDiffView({
  diff,
  originalLabel = "Original",
  editedLabel = "AllInfratech’s edits",
  emptyMessage = "Our edits matched your submission as-is. Nothing actually changed — you can approve and publish.",
}: {
  diff: DiffResult;
  /** Column header for the left side. Override for the admin-side
   *  edit review where it reads "Current live values". */
  originalLabel?: string;
  /** Column header for the right side. Override for the admin-side
   *  edit review where it reads "Proposed update". */
  editedLabel?: string;
  /** Message shown when no fields changed. Override per consumer. */
  emptyMessage?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const changed = changedFieldKeys(diff);
  const unchanged = unchangedFieldKeys(diff);

  if (changed.length === 0) {
    return (
      <p className="text-[15px] leading-relaxed text-[var(--color-ink-2)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      {/* Desktop header row — sets the two-column grid for every
          field block below. */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6 md:border-b md:border-[var(--color-line-strong)] md:pb-2">
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-ink-3)]">
          {originalLabel}
        </p>
        <p className="text-[13px] uppercase tracking-[0.22em] text-[var(--color-coral)]">
          {editedLabel}
        </p>
      </div>

      <ul className="mt-3 space-y-5 md:mt-4 md:space-y-6">
        {changed.map((field) => (
          <DiffRow key={field} field={field} entry={diff[field]} highlighted />
        ))}
        {showAll
          ? unchanged.map((field) => (
              <DiffRow
                key={field}
                field={field}
                entry={diff[field]}
                highlighted={false}
              />
            ))
          : null}
      </ul>

      {unchanged.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-6 inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-2)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
        >
          {showAll
            ? "Hide unchanged fields"
            : `Show unchanged fields (${unchanged.length})`}
        </button>
      ) : null}
    </div>
  );
}

function DiffRow({
  field,
  entry,
  highlighted,
}: {
  field: DiffField;
  entry: DiffResult[DiffField];
  highlighted: boolean;
}) {
  const label = DIFF_FIELD_LABELS[field];
  return (
    <li
      className={cn(
        "grid gap-3 md:grid-cols-2 md:gap-6",
        highlighted ? "" : "opacity-60",
      )}
    >
      {/* Field label appears once on mobile (above both stacked
          values), but the desktop columns each need their own label
          for scannability — render in both branches. */}
      <div className="flex items-center gap-2 md:hidden">
        {highlighted ? (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]"
          />
        ) : null}
        <span className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
          {label}
        </span>
      </div>

      <Cell label={label} value={entry.original} side="original" highlighted={highlighted} />
      <Cell label={label} value={entry.edited} side="edited" highlighted={highlighted} />
    </li>
  );
}

function Cell({
  label,
  value,
  side,
  highlighted,
}: {
  label: string;
  value: DiffValue;
  side: "original" | "edited";
  highlighted: boolean;
}) {
  const isEditedSide = side === "edited";
  return (
    <div
      className={cn(
        "border-l-[3px] px-3 py-2",
        highlighted && isEditedSide
          ? "border-[var(--color-coral)]"
          : highlighted
            ? "border-[var(--color-ink-3)]/40"
            : "border-transparent",
      )}
    >
      {/* Desktop-only field label inside the cell — mobile relies
          on the once-per-row label above. */}
      <p className="hidden text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] md:block">
        {label}
      </p>
      <ValueDisplay value={value} />
    </div>
  );
}

function ValueDisplay({ value }: { value: DiffValue }) {
  if (value == null || value === "") {
    return (
      <p className="mt-1 text-[16px] text-[var(--color-ink-3)]">
        — not set —
      </p>
    );
  }
  if (Array.isArray(value)) {
    return (
      <p className="mt-1 text-[16px] text-[var(--color-ink)]">
        {value.join(", ")}
      </p>
    );
  }
  return (
    <p className="mt-1 whitespace-pre-wrap text-[16px] leading-relaxed text-[var(--color-ink)]">
      {value}
    </p>
  );
}

import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/data/admin-queue";

const config: Record<
  SubmissionStatus | "approved" | "rejected" | "live",
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-[var(--color-canvas-warm)] text-[var(--color-ink)] ring-[var(--color-line-strong)]",
  },
  "in-review": {
    label: "In review",
    className: "bg-[var(--color-coral)]/10 text-[var(--color-coral)] ring-[var(--color-coral)]/40",
  },
  "changes-requested": {
    label: "Changes requested",
    className: "bg-amber-50 text-amber-700 ring-amber-300",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-[var(--color-magenta)]/10 text-[var(--color-magenta)] ring-[var(--color-magenta)]/40",
  },
  live: {
    label: "Live",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  },
};

export function StatusPill({
  status,
  className,
}: {
  status: keyof typeof config;
  className?: string;
}) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[13px] uppercase tracking-[0.18em] ring-1",
        c.className,
        className,
      )}
    >
      {c.label}
    </span>
  );
}

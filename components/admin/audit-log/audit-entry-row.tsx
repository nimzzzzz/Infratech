import Link from "next/link";
import {
  actionVerb,
  isChippedAction,
  ACTION_CHIP_COLOR,
  ACTION_CHIP_LABEL,
  CHIP_BG,
} from "@/lib/admin/action-palette";
import { formatAuditPayload } from "@/lib/admin/audit-payload-format";
import {
  type AuditLogRow,
  type ResolvedTarget,
} from "@/lib/queries/audit-log";

/**
 * One row of the Recent activity feed at the bottom of
 * /admin/analytics. Two shapes depending on action category:
 *
 *   SHAPE A — chipped (consequential approval / rejection / moderation):
 *     [CHIP] <Actor> · <target> — <timestamp>
 *
 *   SHAPE B — neutral (everything else):
 *     <Actor> <verb> <target> — <timestamp>
 *
 * Chip semantics live in lib/admin/action-palette.ts (one source of
 * truth for which actions get chipped + their color).
 *
 * Expander: at most ONE labeled <details> block per row, carrying
 * human prose from `formatAuditPayload`. Pure boolean flips render
 * no expander. GDPR rows render no expander (defense in depth over
 * the query-layer payload nulling).
 */
export function AuditEntryRow({
  row,
  target,
}: {
  row: AuditLogRow;
  target: ResolvedTarget | undefined;
}) {
  const chipped = isChippedAction(row.action);
  const targetName = target?.name ?? `${row.targetType}#${row.targetId}`;
  const targetHref = target?.href ?? null;
  const targetDeleted = target?.deleted ?? false;

  const actorLabel =
    row.actorVendorMemberId === null
      ? "[System]"
      : row.actorName ?? `Member #${row.actorVendorMemberId}`;
  const actorIsSystem = row.actorVendorMemberId === null;

  const timestamp = formatTimestamp(row.createdAt);
  const expander = formatAuditPayload(row.action, row.before, row.after);

  const actorEl = (
    <span
      className={
        actorIsSystem
          ? "italic text-[var(--color-ink-3)]"
          : "text-[var(--color-ink)]"
      }
    >
      {actorLabel}
    </span>
  );

  const targetEl = targetHref ? (
    <Link
      href={targetHref}
      prefetch={targetHref.startsWith("/admin")}
      className="text-[var(--color-ink)] underline-offset-4 hover:underline"
    >
      {targetName}
    </Link>
  ) : (
    <span
      className={
        targetDeleted
          ? "italic text-[var(--color-ink-3)]"
          : "text-[var(--color-ink-2)]"
      }
    >
      {targetName}
    </span>
  );

  const timestampEl = (
    <span className="text-[var(--color-ink-3)]">
      {" — "}
      <time
        dateTime={row.createdAt.toISOString()}
        title={row.createdAt.toUTCString()}
      >
        {timestamp}
      </time>
    </span>
  );

  return (
    <li className="py-3.5 md:px-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-relaxed text-[var(--color-ink)] md:text-[16px]">
        {chipped ? (
          <>
            <Chip action={row.action} />
            <span>
              {actorEl}{" "}
              <span className="text-[var(--color-ink-3)]">·</span>{" "}
              {targetEl}
              {timestampEl}
            </span>
          </>
        ) : (
          <span>
            {actorEl}{" "}
            <span className="text-[var(--color-ink-2)]">
              {actionVerb(row.action)}
            </span>{" "}
            {targetEl}
            {timestampEl}
          </span>
        )}
      </p>

      {expander ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-3)] underline-offset-4 hover:underline">
            {expander.label}
          </summary>
          <p className="mt-2 max-w-[80ch] whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-ink-2)]">
            {expander.body}
          </p>
        </details>
      ) : null}
    </li>
  );
}

/**
 * Inline pill chip for consequential actions. Hex colors are literal
 * (not design tokens) — chips are intentional loud overlays on the
 * otherwise-quiet activity feed. Compact pill: 11px uppercase label,
 * 3px×8px padding, ~4px corner radius (Tailwind `rounded`).
 */
function Chip({ action }: { action: string }) {
  const color = ACTION_CHIP_COLOR[action];
  const label = ACTION_CHIP_LABEL[action];
  if (!color || !label) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.05em] text-white"
      style={{ background: CHIP_BG[color] }}
    >
      {label}
    </span>
  );
}

/**
 * Render a date as "May 20, 2:14 PM" (or "Jan 5, 2025, 11:30 AM"
 * for older years). Timezone is fixed to Asia/Dubai — the admin
 * team is UAE-based (per CLAUDE.md), so MENA local reads natural.
 * Adjust if/when the team expands.
 */
function formatTimestamp(d: Date): string {
  const now = new Date();
  const isCurrentYear = d.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(d);
}

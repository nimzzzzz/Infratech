import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * Admin analytics queries. Phase A.6 PR 1.
 *
 * Eight independent SELECTs powering /admin/analytics. Each metric is
 * its own exported function so the page can fire them in parallel via
 * Promise.all. No mutations, no caches — pure dynamic reads behind the
 * admin auth gate.
 *
 * Date math is server-side via DATE_TRUNC + INTERVAL; "all-time" is
 * represented as the fixed sentinel `2000-01-01` (earlier than any
 * real row). Range parsing centralised in `parseRange()` so every
 * metric resolves to the same window.
 *
 * Indexes relied on:
 *   • app_views PK (app_id, day) — covers day-range scans
 *   • outbound_clicks.ix_outbound_app_clicked (app_id, clicked_at)
 *   • submissions.ix_submissions_status_submitted_at (status, submitted_at)
 *   • audit_log.ix_audit_actor_created — partial WHERE actor IS NOT NULL
 *   • contact_messages has NO timestamp index — see CLAUDE.md §14
 *     follow-up.
 */

export type Range = "7d" | "30d" | "90d" | "all";

export const VALID_RANGES: ReadonlyArray<Range> = ["7d", "30d", "90d", "all"];

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_TIME_SENTINEL_DATE = "2000-01-01";

export type ResolvedRange = {
  /** ISO date (yyyy-mm-dd) for day-grain queries. */
  startDate: string;
  endDate: string;
  /** ISO timestamp for timestamptz-grain queries. */
  startDateTime: string;
  endDateTime: string;
  /** The original key, echoed back for UI. */
  range: Range;
};

/**
 * Resolve a Range to start/end day + timestamp pair anchored to UTC
 * now(). `endDate` is today (inclusive); `startDate` is `now - Nd`
 * for the bucketed ranges, or `2000-01-01` for "all".
 *
 * Returning both date-grain and timestamp-grain values up-front so
 * callers don't repeat the math.
 */
export function resolveRange(range: Range): ResolvedRange {
  const now = new Date();
  const endIso = now.toISOString();
  const endDate = endIso.slice(0, 10);

  if (range === "all") {
    return {
      range,
      startDate: ALL_TIME_SENTINEL_DATE,
      endDate,
      startDateTime: `${ALL_TIME_SENTINEL_DATE}T00:00:00.000Z`,
      endDateTime: endIso,
    };
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const startMs = now.getTime() - days * DAY_MS;
  const startIso = new Date(startMs).toISOString();
  return {
    range,
    startDate: startIso.slice(0, 10),
    endDate,
    startDateTime: startIso,
    endDateTime: endIso,
  };
}

/**
 * Parse a raw searchParam value to a Range. Falls back to "30d" on
 * any unrecognised input. Centralised so the page + tests share the
 * same default semantics.
 */
export function parseRange(raw: string | string[] | undefined): Range {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "7d" || v === "30d" || v === "90d" || v === "all") return v;
  return "30d";
}

// ── Metric 1: Daily page views ──────────────────────────────────────

export type DailyViewsPoint = { day: string; views: number };

/**
 * Daily page views over the selected range. Sums across all apps;
 * the (app_id, day) PK provides cheap day-range scans.
 */
export async function getDailyPageViews(
  r: ResolvedRange,
): Promise<DailyViewsPoint[]> {
  const rows = await db.execute<{ day: string; views: number }>(sql`
    SELECT day::text AS day, SUM(count)::int AS views
    FROM app_views
    WHERE day >= ${r.startDate}::date AND day <= ${r.endDate}::date
    GROUP BY day
    ORDER BY day
  `);
  return rows as unknown as DailyViewsPoint[];
}

// ── Metric 4: Inquiries received (daily series + total) ─────────────

export type InquiriesDailyPoint = { day: string; inquiries: number };

/**
 * Daily inquiry count over the selected range. No created_at index
 * today (see CLAUDE.md §14 follow-up); acceptable at pilot scale.
 */
export async function getInquiriesSeries(
  r: ResolvedRange,
): Promise<InquiriesDailyPoint[]> {
  const rows = await db.execute<{ day: string; inquiries: number }>(sql`
    SELECT DATE_TRUNC('day', created_at)::date::text AS day,
           COUNT(*)::int AS inquiries
    FROM contact_messages
    WHERE created_at >= ${r.startDateTime}::timestamptz
      AND created_at <= ${r.endDateTime}::timestamptz
    GROUP BY day
    ORDER BY day
  `);
  return rows as unknown as InquiriesDailyPoint[];
}

/** Total inquiry count over the selected range. */
export async function getInquiriesTotal(r: ResolvedRange): Promise<number> {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n
    FROM contact_messages
    WHERE created_at >= ${r.startDateTime}::timestamptz
      AND created_at <= ${r.endDateTime}::timestamptz
  `);
  const [row] = rows as unknown as { n: number }[];
  return row?.n ?? 0;
}

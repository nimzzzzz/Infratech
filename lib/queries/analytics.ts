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
 * now(). `endDate` is today; `startDate` is `now - Nd` for the
 * bucketed ranges, or `2000-01-01` for "all".
 *
 * Returning both date-grain and timestamp-grain values up-front so
 * callers don't repeat the math.
 *
 * Note: queries use only the START bound. The END bound is implicit
 * "as of NOW()" server-side. The upper-bound fields are retained in
 * the type for documentation but no production query consults them
 * — earlier drafts included `created_at <= endDateTime` filters
 * which silently excluded rows whose timestamps landed a few ms
 * after the JS-captured upper bound (clock skew between Postgres
 * NOW() and the moment resolveRange() ran).
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
    WHERE day >= ${r.startDate}::date
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
  `);
  const [row] = rows as unknown as { n: number }[];
  return row?.n ?? 0;
}

// ── Metric 5: Submissions throughput by status (weekly) ─────────────

export type SubmissionStatusKey =
  | "pending_review"
  | "in_review"
  | "changes_requested"
  | "published"
  | "edited_awaiting_vendor_approval"
  | "rejected";

export type SubmissionsThroughputRow = {
  week: string;
  status: SubmissionStatusKey;
  n: number;
};

export async function getSubmissionsThroughput(
  r: ResolvedRange,
): Promise<SubmissionsThroughputRow[]> {
  const rows = await db.execute<SubmissionsThroughputRow>(sql`
    SELECT DATE_TRUNC('week', submitted_at)::date::text AS week,
           status, COUNT(*)::int AS n
    FROM submissions
    WHERE submitted_at >= ${r.startDateTime}::timestamptz
    GROUP BY week, status
    ORDER BY week, status
  `);
  return rows as unknown as SubmissionsThroughputRow[];
}

// ── Metric 6: Time-to-publish histogram ─────────────────────────────

export type TimeToPublishBucket =
  | "<1h"
  | "1h-1d"
  | "1-3d"
  | "3-7d"
  | "7-30d"
  | ">30d";

export const TIME_TO_PUBLISH_BUCKET_ORDER: ReadonlyArray<TimeToPublishBucket> =
  ["<1h", "1h-1d", "1-3d", "3-7d", "7-30d", ">30d"];

export type TimeToPublishRow = { bucket: TimeToPublishBucket; n: number };

/**
 * Time-to-publish (published_at - submitted_at) bucketed into a fixed
 * histogram. Includes ONLY submissions submitted within the selected
 * range AND eventually published; un-published submissions don't
 * contribute. Bucket ordering applied client-side via
 * TIME_TO_PUBLISH_BUCKET_ORDER (CASE-based ordering in SQL is brittle
 * across enums + costly).
 */
export async function getTimeToPublishHistogram(
  r: ResolvedRange,
): Promise<TimeToPublishRow[]> {
  const rows = await db.execute<TimeToPublishRow>(sql`
    SELECT
      CASE
        WHEN published_at - submitted_at < INTERVAL '1 hour' THEN '<1h'
        WHEN published_at - submitted_at < INTERVAL '1 day' THEN '1h-1d'
        WHEN published_at - submitted_at < INTERVAL '3 days' THEN '1-3d'
        WHEN published_at - submitted_at < INTERVAL '7 days' THEN '3-7d'
        WHEN published_at - submitted_at < INTERVAL '30 days' THEN '7-30d'
        ELSE '>30d'
      END AS bucket,
      COUNT(*)::int AS n
    FROM submissions
    WHERE status = 'published'
      AND published_at IS NOT NULL
      AND submitted_at >= ${r.startDateTime}::timestamptz
    GROUP BY bucket
  `);
  return rows as unknown as TimeToPublishRow[];
}

// ── Metric 2: Top 10 most-viewed apps ───────────────────────────────

export type TopAppRow = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  vendorName: string;
  views: number;
};

export async function getTopViewedApps(
  r: ResolvedRange,
): Promise<TopAppRow[]> {
  const rows = await db.execute<TopAppRow>(sql`
    SELECT a.id, a.slug, a.name, a.logo_url AS "logoUrl",
           v.name AS "vendorName", SUM(av.count)::int AS views
    FROM app_views av
    JOIN apps a ON a.id = av.app_id
    JOIN vendors v ON v.id = a.vendor_id
    WHERE av.day >= ${r.startDate}::date
    GROUP BY a.id, a.slug, a.name, a.logo_url, v.name
    ORDER BY views DESC
    LIMIT 10
  `);
  return rows as unknown as TopAppRow[];
}

// ── Metric 3: Outbound click-through rate per app ───────────────────

export type CtrRow = {
  id: number;
  slug: string;
  name: string;
  vendorName: string;
  views: number;
  clicks: number;
  ctrPercent: number;
};

/**
 * Per-app outbound CTR. Includes only published apps with at least
 * one view OR click in the window (otherwise the list is mostly
 * 0/0 noise). Ordered by CTR%, then by views as a tiebreaker.
 * Limited to 20 rows.
 */
export async function getOutboundCtrPerApp(
  r: ResolvedRange,
): Promise<CtrRow[]> {
  const rows = await db.execute<CtrRow>(sql`
    WITH views_agg AS (
      SELECT app_id, SUM(count)::int AS views
      FROM app_views
      WHERE day >= ${r.startDate}::date
      GROUP BY app_id
    ),
    clicks_agg AS (
      SELECT app_id, COUNT(*)::int AS clicks
      FROM outbound_clicks
      WHERE clicked_at >= ${r.startDateTime}::timestamptz
      GROUP BY app_id
    )
    SELECT a.id, a.slug, a.name, v.name AS "vendorName",
           COALESCE(va.views, 0) AS views,
           COALESCE(ca.clicks, 0) AS clicks,
           CASE WHEN COALESCE(va.views, 0) = 0 THEN 0
                ELSE ROUND(
                  COALESCE(ca.clicks, 0)::numeric / va.views::numeric * 100,
                  2
                )::float
           END AS "ctrPercent"
    FROM apps a
    JOIN vendors v ON v.id = a.vendor_id
    LEFT JOIN views_agg va ON va.app_id = a.id
    LEFT JOIN clicks_agg ca ON ca.app_id = a.id
    WHERE a.status = 'published'
      AND (COALESCE(va.views, 0) > 0 OR COALESCE(ca.clicks, 0) > 0)
    ORDER BY "ctrPercent" DESC, views DESC
    LIMIT 20
  `);
  return rows as unknown as CtrRow[];
}

// ── Metric 7: Vendor signup funnel (state snapshot, no range) ───────

export type SignupFunnel = {
  signedUp: number;
  onboarded: number;
  companyCreated: number;
  hasPublishedApp: number;
};

/**
 * State-snapshot funnel — current counts at each stage across all
 * time, not a per-period count. Locked decision per the A.6 PR 1
 * scope.
 */
export async function getSignupFunnel(): Promise<SignupFunnel> {
  const rows = await db.execute<SignupFunnel>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM vendor_members) AS "signedUp",
      (SELECT COUNT(*)::int FROM vendor_members WHERE onboarded = true) AS "onboarded",
      (SELECT COUNT(*)::int FROM vendors) AS "companyCreated",
      (SELECT COUNT(*)::int FROM vendors v
        WHERE EXISTS (
          SELECT 1 FROM apps WHERE apps.vendor_id = v.id AND apps.status = 'published'
        )
      ) AS "hasPublishedApp"
  `);
  const [row] = rows as unknown as SignupFunnel[];
  return (
    row ?? { signedUp: 0, onboarded: 0, companyCreated: 0, hasPublishedApp: 0 }
  );
}

// ── Metric 8: Admin activity (last 14 days, ignores range param) ────

export type AdminActivityRow = { day: string; action: string; n: number };

/**
 * Daily admin activity over the last 14 days. Excludes system rows
 * (actor_vendor_member_id IS NULL — GDPR webhooks, metadata-sync
 * failures) so the metric reflects human moderation load only.
 */
export async function getAdminActivity(): Promise<AdminActivityRow[]> {
  const rows = await db.execute<AdminActivityRow>(sql`
    SELECT DATE_TRUNC('day', created_at)::date::text AS day,
           action, COUNT(*)::int AS n
    FROM audit_log
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND actor_vendor_member_id IS NOT NULL
    GROUP BY day, action
    ORDER BY day, action
  `);
  return rows as unknown as AdminActivityRow[];
}

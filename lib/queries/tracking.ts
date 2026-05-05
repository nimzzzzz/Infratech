import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { outboundClicks } from "@/lib/db/schema";

/**
 * Daily page-view counter. Single UPSERT against the (app_id, day)
 * primary key — table stays bounded at apps × days regardless of
 * traffic volume.
 *
 * No bot filtering (Stage 2 plan Q3 / requirements §9.2): vendor
 * analytics will be labelled "Page views (raw, includes crawlers)"
 * alongside the more meaningful Outbound clicks number. Stage 7 can
 * layer dedup if vendors complain.
 */
export async function recordAppView(appId: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.execute(sql`
    INSERT INTO app_views (app_id, day, count)
    VALUES (${appId}, ${today}::date, 1)
    ON CONFLICT (app_id, day)
    DO UPDATE SET count = app_views.count + 1
  `);
}

/**
 * Single outbound-click row. Per-row append (no rollup) so the recent-
 * activity chart in the vendor dashboard can show timestamps. Retention
 * pruning is a Stage 7 concern.
 */
export async function recordOutboundClick(opts: {
  appId: number;
  userAgent: string | null;
  referrer: string | null;
}): Promise<void> {
  await db.insert(outboundClicks).values({
    appId: opts.appId,
    userAgent: opts.userAgent,
    referrer: opts.referrer,
  });
}

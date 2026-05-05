import {
  pgTable,
  serial,
  integer,
  timestamp,
  date,
  text,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { apps } from "./apps";

/**
 * Two analytics tables. Everything else is captured by Plausible at the
 * page level (Stage 7) — these two are first-class because vendors see
 * them in their dashboard.
 *
 * app_views is rolled up daily, not per-request. The pageview-handler
 * upserts (app_id, day, count + 1) so the table stays bounded at
 * (apps × days) regardless of traffic volume.
 *
 * outbound_clicks logs every "Visit website" click. Kept raw so the
 * vendor-facing chart can show recent activity, with a periodic prune
 * job (admin-controlled retention, not in Stage 1).
 */
export const appViews = pgTable(
  "app_views",
  {
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.appId, t.day] })],
);

export const outboundClicks = pgTable(
  "outbound_clicks",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
  },
  (t) => [index("ix_outbound_app_clicked").on(t.appId, t.clickedAt)],
);

export type AppView = typeof appViews.$inferSelect;
export type OutboundClick = typeof outboundClicks.$inferSelect;

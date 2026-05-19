import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import {
  stages,
  capabilities,
  industries,
  pricingModels,
} from "./taxonomy";

/**
 * Apps and their tag joins. The status enum drives the moderation lifecycle:
 *
 *   draft → pending_review → published
 *                          → changes_requested → pending_review (resubmit)
 *                          → rejected (terminal-ish; admin can revive)
 *   published → unpublished (vendor or admin pull)
 *
 * search_vector is a stored generated column built from name (weight A),
 * tagline (B), and description (C). A GIN index over it supports the
 * Stage 2 /browse free-text search. The column lives in the schema so we
 * can read it via Drizzle in Stage 2; in this stage it's write-only via
 * the generated expression.
 */
export const appStatus = pgEnum("app_status", [
  "draft",
  "pending_review",
  "published",
  "changes_requested",
  "rejected",
  "unpublished",
]);

const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

export const apps = pgTable(
  "apps",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /**
     * Denormalised vendor name. Maintained by triggers — populated on
     * INSERT and on vendor_id change by apps_set_vendor_name(); cascaded
     * on vendor rename by vendors_propagate_name_to_apps(). Lives on the
     * apps row so search_vector (a GENERATED column) can include it
     * without joining at index-build time.
     */
    vendorName: text("vendor_name").notNull().default(""),
    tagline: text("tagline"),
    description: text("description"),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    /**
     * Phase C — vendor-supplied YouTube / Vimeo URL for the product
     * detail page. Validation + normalisation happens at the Zod
     * layer (lib/media/video.ts); the stored value is the
     * normalised player-embed URL.
     */
    videoUrl: text("video_url"),
    foundedYear: integer("founded_year"),
    hqLocation: text("hq_location"),
    pricingDetails: text("pricing_details"),
    integrations: text("integrations").array().notNull().default(sql`'{}'::text[]`),
    geographicAvailability: text("geographic_availability"),
    status: appStatus("status").notNull().default("draft"),
    /**
     * Admin-imposed moderation overlay (A.4 PR 3). Independent of
     * `status` — a flagged product stays at `status = "published"`
     * but every public query AND condition gates on flagged = false.
     * Migration 0021 adds the column + a partial index on flagged =
     * true. Reversible — admin can unflag at /admin/directory/[id].
     */
    flagged: boolean("flagged").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    editorNote: text("editor_note"),
    /**
     * GENERATED ALWAYS AS (...) STORED tsvector. Searches name (weight A)
     * + vendor_name (weight B). Tagline + description deliberately
     * EXCLUDED — search is name-only by product spec; capability/stage/
     * industry filtering is handled by the sidebar, not free-text.
     */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(name, '')), 'A') || setweight(to_tsvector('english', coalesce(vendor_name, '')), 'B')`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("ux_apps_slug").on(t.slug),
    index("ix_apps_status").on(t.status),
    index("ix_apps_vendor_id").on(t.vendorId),
    index("ix_apps_featured").on(t.featured),
    index("ix_apps_search_vector").using("gin", t.searchVector),
  ],
);

export const appStages = pgTable(
  "app_stages",
  {
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    stageId: integer("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.appId, t.stageId] })],
);

export const appCapabilities = pgTable(
  "app_capabilities",
  {
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    capabilityId: integer("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.appId, t.capabilityId] })],
);

export const appIndustries = pgTable(
  "app_industries",
  {
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    industryId: integer("industry_id")
      .notNull()
      .references(() => industries.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.appId, t.industryId] })],
);

export const appPricingModels = pgTable(
  "app_pricing_models",
  {
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    pricingModelId: integer("pricing_model_id")
      .notNull()
      .references(() => pricingModels.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.appId, t.pricingModelId] })],
);

export const appScreenshots = pgTable(
  "app_screenshots",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Required per CLAUDE.md §3 rule 8 (a11y + SEO). */
    alt: text("alt").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_app_screenshots_app_id_position").on(t.appId, t.position)],
);

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
export type AppStatus = (typeof appStatus.enumValues)[number];
export type AppScreenshot = typeof appScreenshots.$inferSelect;

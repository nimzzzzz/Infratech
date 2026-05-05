import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Taxonomy tables — the controlled vocabularies an app gets tagged with.
 * Stages and capabilities are admin-editable (intro_md feeds the SEO landing
 * page above the filtered app list). Industries / pricing / regions are
 * fixed lists — vendors can propose additions but those land in the
 * submission payload jsonb, not as new rows here.
 */

export const stages = pgTable(
  "stages",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortDescription: text("short_description"),
    introMd: text("intro_md"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ux_stages_slug").on(t.slug)],
);

export const capabilities = pgTable(
  "capabilities",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    introMd: text("intro_md"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ux_capabilities_slug").on(t.slug)],
);

export const industries = pgTable(
  "industries",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ux_industries_slug").on(t.slug)],
);

export const pricingModels = pgTable(
  "pricing_models",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ux_pricing_models_slug").on(t.slug)],
);

export const regions = pgTable(
  "regions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ux_regions_slug").on(t.slug)],
);

export type Stage = typeof stages.$inferSelect;
export type Capability = typeof capabilities.$inferSelect;
export type Industry = typeof industries.$inferSelect;
export type PricingModel = typeof pricingModels.$inferSelect;
export type Region = typeof regions.$inferSelect;

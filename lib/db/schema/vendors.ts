import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { regions } from "./taxonomy";

/**
 * Vendors are the companies that own apps. A vendor row exists in two flavours:
 *
 *   • Editorial stub — created by an admin, no clerk_user_id yet. The vendor
 *     can later "claim" their listing on first LinkedIn sign-in.
 *   • Self-registered — created via the Clerk webhook on first sign-in,
 *     clerk_user_id set, onboarded=false until the vendor confirms their
 *     company info on /dashboard/onboarding.
 *
 * contact_email is the address Resend forwards visitor inquiries to. It is
 * NEVER rendered publicly (CLAUDE.md §3 rule 5).
 */
export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    clerkUserId: text("clerk_user_id"),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    shortBlurb: text("short_blurb"),
    description: text("description"),
    websiteUrl: text("website_url"),
    linkedinUrl: text("linkedin_url"),
    foundedYear: integer("founded_year"),
    employeeBand: text("employee_band"),
    hqCountry: text("hq_country"),
    hqCity: text("hq_city"),
    logoUrl: text("logo_url"),
    onboarded: boolean("onboarded").notNull().default(false),
    suspended: boolean("suspended").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ux_vendors_slug").on(t.slug),
    uniqueIndex("ux_vendors_clerk_user_id").on(t.clerkUserId),
    index("ix_vendors_suspended").on(t.suspended),
  ],
);

/**
 * vendor_members are the humans who sign in via Clerk and act on a
 * vendor's behalf. The split lets multiple Clerk users represent the
 * same company — the vendor record stays authoritative for the
 * company; this table holds per-human session + onboarding state.
 *
 * vendor_id is nullable: at first sign-in we create the member row
 * before they've confirmed which company they belong to. The
 * /dashboard/onboarding step inserts a vendors row and repoints
 * vendor_id from NULL to the new id.
 *
 * GDPR delete (user.deleted webhook): clear PII fields + clerk_user_id
 * and set suspended=true. Don't touch the vendor row — the company
 * still exists; only this human's link to it is severed.
 */
export const vendorMembers = pgTable(
  "vendor_members",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),
    clerkUserId: text("clerk_user_id").notNull(),
    name: text("name").notNull(),
    primaryEmail: text("primary_email").notNull(),
    linkedinUrl: text("linkedin_url"),
    role: text("role"),
    onboarded: boolean("onboarded").notNull().default(false),
    suspended: boolean("suspended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ux_vendor_members_clerk_user_id").on(t.clerkUserId),
    index("ix_vendor_members_vendor").on(t.vendorId),
    index("ix_vendor_members_suspended").on(t.suspended),
  ],
);

/** Regions a vendor actively serves. */
export const vendorRegions = pgTable(
  "vendor_regions",
  {
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.vendorId, t.regionId] })],
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type VendorMember = typeof vendorMembers.$inferSelect;
export type NewVendorMember = typeof vendorMembers.$inferInsert;
export type VendorRegion = typeof vendorRegions.$inferSelect;

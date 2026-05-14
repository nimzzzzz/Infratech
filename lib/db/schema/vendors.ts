import { sql } from "drizzle-orm";
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
 * Vendors are the companies that own apps. Per-human session +
 * onboarding state lives on vendor_members (below); this table is
 * authoritative for the company itself.
 *
 *   • Editorial stub — created by an admin, no associated
 *     vendor_members row yet. A vendor can later "claim" their
 *     listing once a human signs in via Clerk and links to it.
 *   • Self-registered — created in /dashboard/onboarding when a
 *     vendor_member confirms their company; that flow inserts the
 *     vendors row and repoints vendor_members.vendor_id from NULL.
 *
 * contact_email is the address Resend forwards visitor inquiries to.
 * It is NEVER rendered publicly (CLAUDE.md §3 rule 5).
 */
export const vendors = pgTable(
  "vendors",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
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
    /**
     * LinkedIn profile picture URL from Clerk (V.2, 2026-05-13).
     * Set by the webhook from `image_url` on user.created /
     * user.updated. Nullable — `UserAvatar` falls back to initials
     * when the URL is missing or the image fetch errors out.
     */
    avatarUrl: text("avatar_url"),
    role: text("role"),
    onboarded: boolean("onboarded").notNull().default(false),
    suspended: boolean("suspended").notNull().default(false),
    /**
     * Admin flag (Phase A.1, 2026-05-12). The single-human-table model
     * supersedes the legacy `admins` table: every authenticated human
     * is a vendor_members row, distinguished by is_admin. The legacy
     * `admins` table is retained for audit_log FK compatibility but
     * has no readers or writers post-A.1.
     *
     * Set by the Clerk webhook against CLERK_ADMIN_EMAILS (email
     * allowlist) on user.created / user.updated, or by manual UPDATE
     * for invited admins whose sign-in email differs from their
     * allowlisted address.
     */
    isAdmin: boolean("is_admin").notNull().default(false),
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
    // Partial index — only the few admin rows are indexed, the rest
    // (vast majority is_admin=false) are skipped. Supports admin
    // lookups and admin-list pages without bloating storage.
    index("ix_vendor_members_is_admin")
      .on(t.isAdmin)
      .where(sql`is_admin = true`),
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

/**
 * Phase C — photos / screenshots displayed on the vendor profile
 * page. Vendor-level (not product-level — keyed on vendor_id). Same
 * column shape as the dormant app_screenshots table for consistency
 * (url / alt / position). Max 8 per vendor enforced at the wizard /
 * publish layer, not by a constraint here.
 */
export const vendorGalleryImages = pgTable(
  "vendor_gallery_images",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Required per CLAUDE.md §3 rule 8 (a11y + SEO). */
    alt: text("alt").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_vendor_gallery_images_vendor_position").on(
      t.vendorId,
      t.position,
    ),
  ],
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type VendorMember = typeof vendorMembers.$inferSelect;
export type NewVendorMember = typeof vendorMembers.$inferInsert;
export type VendorRegion = typeof vendorRegions.$inferSelect;
export type VendorGalleryImage = typeof vendorGalleryImages.$inferSelect;
export type NewVendorGalleryImage = typeof vendorGalleryImages.$inferInsert;

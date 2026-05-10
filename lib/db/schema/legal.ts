import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { vendorMembers } from "./vendors";

/**
 * Audit trail of every legal-acceptance event captured during the
 * onboarding modal. One row per click of the "I have read and agree"
 * checkbox; users may re-accept on terms version bumps and each
 * acceptance lands as its own row.
 *
 * The id is a UUID (not serial) because we expect this table to
 * live forever — bigserial overflow risk is theoretical, but UUIDs
 * also de-correlate row order from issuance time which is the
 * semantically right choice for legal-evidence storage.
 *
 * vendor_member_id ON DELETE CASCADE: when a human's
 * vendor_members row is hard-deleted (very rare — GDPR delete
 * usually anonymises rather than removes), their acceptance rows
 * go too, since they're meaningless without the actor.
 */
export const vendorMemberLegalAcceptances = pgTable(
  "vendor_member_legal_acceptances",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vendorMemberId: integer("vendor_member_id")
      .notNull()
      .references(() => vendorMembers.id, { onDelete: "cascade" }),
    termsVersion: text("terms_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [index("ix_vmla_vendor_member").on(t.vendorMemberId)],
);

export type VendorMemberLegalAcceptance =
  typeof vendorMemberLegalAcceptances.$inferSelect;
export type NewVendorMemberLegalAcceptance =
  typeof vendorMemberLegalAcceptances.$inferInsert;

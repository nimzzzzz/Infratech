import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { vendors, vendorMembers } from "./vendors";
import { apps } from "./apps";
import { admins } from "./audit";

/**
 * Submissions are the moderation queue.
 *
 *   • new   — vendor submitting a brand-new app. payload contains the full
 *             proposed app (name, tagline, description, taxonomy refs,
 *             customCapabilities/customIndustries proposals, optional
 *             company-on-first-submit data). app_id is NULL until approved.
 *
 *   • claim — DEPRECATED 2026-05-06. The directory is invitation-only and
 *             listings are seeded by the admin team — there is no public
 *             "claim an existing listing" path. Enum value is retained so
 *             historical / seeded rows keep loading; new rows MUST be
 *             type = 'new'. Do not add a writer for type = 'claim'.
 *
 * Suggestions schema is similarly retained but unused — the surface that
 * wrote into it (/suggest) was removed at the same scope-narrowing.
 */
export const submissionType = pgEnum("submission_type", ["new", "claim"]);

/**
 * Submission lifecycle states (Phase A.2 rename + extension).
 *
 *   - pending_review    — vendor submitted; in admin's queue
 *   - edited_awaiting_vendor_approval — admin made edits; vendor must approve
 *   - published         — live on the public directory (terminal happy path)
 *   - rejected          — admin rejected with reason; vendor can resubmit
 *
 * The legacy values `in_review` and `changes_requested` remain in the
 * enum for back-compat (Postgres can't drop enum values without
 * rewriting every row referencing them) but no production writer
 * emits them post-A.2. Drop in a future cleanup phase.
 *
 * Migration 0013 renames `pending` → `pending_review` and `approved`
 * → `published` in place (RENAME VALUE, non-blocking).
 */
export const submissionStatus = pgEnum("submission_status", [
  "pending_review",
  "in_review",
  "changes_requested",
  "published",
  "edited_awaiting_vendor_approval",
  "rejected",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    type: submissionType("type").notNull(),
    status: submissionStatus("status").notNull().default("pending_review"),
    submitterVendorId: integer("submitter_vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    /** Set on first publish; subsequent publishes update the same row. */
    appId: integer("app_id").references(() => apps.id, { onDelete: "set null" }),
    /** Legacy FK at admins.id; kept for back-compat. New writers
     *  populate reviewedBy (vendor_members.id) instead. */
    reviewerAdminId: integer("reviewer_admin_id").references(() => admins.id, {
      onDelete: "set null",
    }),
    /**
     * Phase A.2: the vendor_member who took the last state-changing
     * action (admin approve/edit/reject, or vendor approve/request-
     * changes/resubmit). Replaces reviewerAdminId for new writes.
     */
    reviewedBy: integer("reviewed_by").references(() => vendorMembers.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    /** Admin's edited copy of the payload (full payload, not a diff)
     *  when status === "edited_awaiting_vendor_approval". On vendor
     *  approval this becomes the canonical apps-row source. */
    adminEdits: jsonb("admin_edits"),
    /** Admin's reason text when status === "rejected". Shown to the
     *  vendor on their dashboard and in the rejection email. */
    rejectionReason: text("rejection_reason"),
    /** Vendor's note when sending the submission back to admin via
     *  vendor-request-changes. Cleared on the admin's next action. */
    vendorFeedback: text("vendor_feedback"),
    /** Legacy review-notes column (unused post-A.2; admins now use
     *  rejectionReason / adminEdits / vendorFeedback specifically). */
    reviewNotes: text("review_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_submissions_status_submitted_at").on(t.status, t.submittedAt),
    index("ix_submissions_submitter").on(t.submitterVendorId),
    index("ix_submissions_reviewed_by").on(t.reviewedBy),
  ],
);

export const suggestionStatus = pgEnum("suggestion_status", [
  "new",
  "contacted",
  "listed",
  "dismissed",
]);

export const suggestions = pgTable(
  "suggestions",
  {
    id: serial("id").primaryKey(),
    submitterName: text("submitter_name").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    appName: text("app_name").notNull(),
    appUrl: text("app_url").notNull(),
    reason: text("reason"),
    status: suggestionStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ix_suggestions_status_created").on(t.status, t.createdAt)],
);

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionType = (typeof submissionType.enumValues)[number];
export type SubmissionStatus = (typeof submissionStatus.enumValues)[number];
export type Suggestion = typeof suggestions.$inferSelect;
export type SuggestionStatus = (typeof suggestionStatus.enumValues)[number];

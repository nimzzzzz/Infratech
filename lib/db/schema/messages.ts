import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { vendors } from "./vendors";
import { apps } from "./apps";

/**
 * Contact-vendor messages. A visitor sends one from /apps/[slug]/contact;
 * the API forwards via Resend to the vendor's contact_email AND writes a
 * row here so it shows in /dashboard/messages.
 *
 * vendor_id is denormalised from apps.vendor_id at insert time so the
 * inbox query is a single index lookup. If the app moves vendor (rare),
 * historical messages stay attributed to the receiving vendor at the
 * time of send — which is the correct behaviour for an inquiry log.
 */
export const messageStatus = pgEnum("message_status", [
  "unread",
  "read",
  "archived",
]);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    senderName: text("sender_name").notNull(),
    senderEmail: text("sender_email").notNull(),
    senderCompany: text("sender_company"),
    senderRole: text("sender_role"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: messageStatus("status").notNull().default("unread"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_contact_messages_vendor_status").on(t.vendorId, t.status),
    index("ix_contact_messages_app_id").on(t.appId),
  ],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
export type MessageStatus = (typeof messageStatus.enumValues)[number];

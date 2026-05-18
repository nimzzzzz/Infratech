import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contactMessages, apps, vendors } from "@/lib/db/schema";

export type VendorMessageListItem = {
  id: number;
  appId: number;
  appSlug: string;
  appName: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  senderRole: string | null;
  subject: string;
  body: string;
  status: "unread" | "read" | "archived";
  createdAt: Date;
};

export async function listMessagesForVendor(
  vendorId: number,
): Promise<VendorMessageListItem[]> {
  return db
    .select({
      id: contactMessages.id,
      appId: contactMessages.appId,
      appSlug: apps.slug,
      appName: apps.name,
      senderName: contactMessages.senderName,
      senderEmail: contactMessages.senderEmail,
      senderCompany: contactMessages.senderCompany,
      senderRole: contactMessages.senderRole,
      subject: contactMessages.subject,
      body: contactMessages.body,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .innerJoin(apps, eq(apps.id, contactMessages.appId))
    .where(eq(contactMessages.vendorId, vendorId))
    .orderBy(desc(contactMessages.createdAt));
}

export async function getMessageByIdForVendor(
  id: number,
  vendorId: number,
): Promise<VendorMessageListItem | null> {
  const [row] = await db
    .select({
      id: contactMessages.id,
      appId: contactMessages.appId,
      appSlug: apps.slug,
      appName: apps.name,
      senderName: contactMessages.senderName,
      senderEmail: contactMessages.senderEmail,
      senderCompany: contactMessages.senderCompany,
      senderRole: contactMessages.senderRole,
      subject: contactMessages.subject,
      body: contactMessages.body,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .innerJoin(apps, eq(apps.id, contactMessages.appId))
    .where(
      and(eq(contactMessages.id, id), eq(contactMessages.vendorId, vendorId)),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Lookup used by POST /api/contact-vendor before sending mail. Returns
 * the published app + its vendor's send-relevant fields, or null if the
 * slug doesn't match a published app. Draft / suspended-vendor apps are
 * intentionally not surfaced — the route returns 404 either way so we
 * don't leak the existence of a draft.
 */
export type ContactContext = {
  app: { id: number; slug: string; name: string };
  vendor: {
    id: number;
    name: string;
    contactEmail: string | null;
    suspended: boolean;
  };
};

export async function getAppContactContext(
  slug: string,
): Promise<ContactContext | null> {
  const [row] = await db
    .select({
      appId: apps.id,
      appSlug: apps.slug,
      appName: apps.name,
      appStatus: apps.status,
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorContactEmail: vendors.contactEmail,
      vendorSuspended: vendors.suspended,
    })
    .from(apps)
    .innerJoin(vendors, eq(vendors.id, apps.vendorId))
    .where(eq(apps.slug, slug))
    .limit(1);
  if (!row) return null;
  if (row.appStatus !== "published") return null;
  return {
    app: { id: row.appId, slug: row.appSlug, name: row.appName },
    vendor: {
      id: row.vendorId,
      name: row.vendorName,
      contactEmail: row.vendorContactEmail,
      suspended: row.vendorSuspended,
    },
  };
}

export async function recordContactMessage(input: {
  appId: number;
  vendorId: number;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  senderRole: string | null;
  subject: string;
  body: string;
}): Promise<void> {
  await db.insert(contactMessages).values({
    appId: input.appId,
    vendorId: input.vendorId,
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    senderCompany: input.senderCompany,
    senderRole: input.senderRole,
    subject: input.subject,
    body: input.body,
    // status defaults to 'unread'
  });
}

export async function countUnreadForVendor(vendorId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(
      and(
        eq(contactMessages.vendorId, vendorId),
        eq(contactMessages.status, "unread"),
      ),
    );
  return row?.count ?? 0;
}

// ────────────────────────────────────────────────────────────────────
// Admin-side inquiry queries (A.5).
//
// Read-only by design — the admin pages never mutate
// contact_messages.status. That status (unread / read / archived) is
// the VENDOR's workflow on their own dashboard; an admin marking a
// message read would silently flip the vendor's unread badge.
// ────────────────────────────────────────────────────────────────────

export type AdminInquiryListItem = {
  id: number;
  appId: number;
  appSlug: string;
  appName: string;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  senderName: string;
  senderEmail: string;
  senderCompany: string | null;
  senderRole: string | null;
  subject: string;
  body: string;
  status: "unread" | "read" | "archived";
  createdAt: Date;
};

/**
 * Every contact_messages row across all vendors, newest first.
 * Joined with apps + vendors so the list can show "for <product> /
 * <vendor>" without a follow-up query. Admin-only — gated by the
 * page-level getAdminSession() check.
 */
export async function listInquiriesForAdmin(): Promise<AdminInquiryListItem[]> {
  return db
    .select({
      id: contactMessages.id,
      appId: contactMessages.appId,
      appSlug: apps.slug,
      appName: apps.name,
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
      senderName: contactMessages.senderName,
      senderEmail: contactMessages.senderEmail,
      senderCompany: contactMessages.senderCompany,
      senderRole: contactMessages.senderRole,
      subject: contactMessages.subject,
      body: contactMessages.body,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .innerJoin(apps, eq(apps.id, contactMessages.appId))
    .innerJoin(vendors, eq(vendors.id, contactMessages.vendorId))
    .orderBy(desc(contactMessages.createdAt));
}

/** Single inquiry by id with the same join shape as the list. Null
 *  if not found. Admin-only — no vendor scoping. */
export async function getInquiryByIdForAdmin(
  id: number,
): Promise<AdminInquiryListItem | null> {
  const [row] = await db
    .select({
      id: contactMessages.id,
      appId: contactMessages.appId,
      appSlug: apps.slug,
      appName: apps.name,
      vendorId: vendors.id,
      vendorName: vendors.name,
      vendorSlug: vendors.slug,
      senderName: contactMessages.senderName,
      senderEmail: contactMessages.senderEmail,
      senderCompany: contactMessages.senderCompany,
      senderRole: contactMessages.senderRole,
      subject: contactMessages.subject,
      body: contactMessages.body,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .innerJoin(apps, eq(apps.id, contactMessages.appId))
    .innerJoin(vendors, eq(vendors.id, contactMessages.vendorId))
    .where(eq(contactMessages.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Rolling-window count for the admin dashboard's "Inquiries (last 7
 * days)" tile. Cheap COUNT(*) on the timestamp filter — one round
 * trip; fires inside the admin overview's existing Promise.all batch.
 */
export async function countInquiriesLast7Days(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(gte(contactMessages.createdAt, sevenDaysAgo));
  return row?.count ?? 0;
}

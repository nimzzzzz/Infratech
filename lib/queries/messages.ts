import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
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

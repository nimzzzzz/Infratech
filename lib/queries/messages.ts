import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contactMessages, apps } from "@/lib/db/schema";

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

import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { vendorLeadershipContacts } from "@/lib/db/schema";
import type { LeadershipContactInput } from "@/lib/submissions/leadership-contacts";

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type LeadershipContactPayload = {
  name: string;
  title: string;
  linkedinUrl: string;
};

export type VendorLeadershipContact = LeadershipContactPayload & {
  id: number;
  displayOrder: number;
};

export async function listVendorLeadershipContacts(
  vendorId: number,
): Promise<VendorLeadershipContact[]> {
  const rows = await db
    .select({
      id: vendorLeadershipContacts.id,
      name: vendorLeadershipContacts.name,
      title: vendorLeadershipContacts.title,
      linkedinUrl: vendorLeadershipContacts.linkedinUrl,
      displayOrder: vendorLeadershipContacts.displayOrder,
    })
    .from(vendorLeadershipContacts)
    .where(eq(vendorLeadershipContacts.vendorId, vendorId))
    .orderBy(asc(vendorLeadershipContacts.displayOrder));

  return rows;
}

export async function replaceVendorLeadershipContactsInTx(
  tx: Tx,
  vendorId: number,
  contacts: LeadershipContactInput[] | null | undefined,
): Promise<void> {
  await tx
    .delete(vendorLeadershipContacts)
    .where(eq(vendorLeadershipContacts.vendorId, vendorId));

  const clean = normaliseLeadershipContacts(contacts);
  if (clean.length === 0) return;

  await tx.insert(vendorLeadershipContacts).values(
    clean.map((contact, index) => ({
      vendorId,
      vendorMemberId: contact.vendorMemberId ?? null,
      name: contact.name,
      title: contact.title,
      linkedinUrl: contact.linkedinUrl,
      displayOrder: index,
    })),
  );
}

export function normaliseLeadershipContacts(
  contacts: LeadershipContactInput[] | null | undefined,
): LeadershipContactInput[] {
  if (!Array.isArray(contacts)) return [];
  return contacts
    .slice(0, 4)
    .map((contact) => ({
      name: contact.name.trim(),
      title: contact.title.trim(),
      linkedinUrl: contact.linkedinUrl.trim(),
      vendorMemberId: contact.vendorMemberId ?? null,
    }))
    .filter(
      (contact) =>
        contact.name.length > 0 &&
        contact.title.length > 0 &&
        contact.linkedinUrl.length > 0,
    );
}

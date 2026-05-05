import { describe, it, expect, beforeEach } from "vitest";
import {
  listMessagesForVendor,
  getMessageByIdForVendor,
  countUnreadForVendor,
} from "@/lib/queries/messages";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

let vendorAId: number;
let vendorBId: number;
let appAId: number;
let messageAId: number;

beforeEach(async () => {
  // Seed lookup ids — Oracle and Procore are reliably present.
  const [oracle] = await db.execute<{ id: number }>(
    sql`SELECT id FROM vendors WHERE slug = 'oracle'`,
  );
  const [procore] = await db.execute<{ id: number }>(
    sql`SELECT id FROM vendors WHERE slug = 'procore-technologies'`,
  );
  const [aconex] = await db.execute<{ id: number }>(
    sql`SELECT id FROM apps WHERE slug = 'aconex'`,
  );
  vendorAId = oracle.id;
  vendorBId = procore.id;
  appAId = aconex.id;

  const [msgA] = await db.execute<{ id: number }>(sql`
    INSERT INTO contact_messages (
      app_id, vendor_id, sender_name, sender_email, subject, body, status
    ) VALUES (
      ${appAId}, ${vendorAId}, 'Tester', 't@example.com', 'Test', 'Hello', 'unread'
    ) RETURNING id
  `);
  messageAId = msgA.id;

  await db.execute(sql`
    INSERT INTO contact_messages (
      app_id, vendor_id, sender_name, sender_email, subject, body, status
    ) VALUES (
      ${appAId}, ${vendorAId}, 'Tester2', 't2@example.com', 'Test 2', 'Read msg', 'read'
    )
  `);
});

describe("message queries", () => {
  it("listMessagesForVendor returns vendor's messages with appName/appSlug joined", async () => {
    const msgs = await listMessagesForVendor(vendorAId);
    expect(msgs.length).toBe(2);
    expect(msgs[0].appSlug).toBe("aconex");
    expect(msgs[0].appName).toBe("Aconex");
  });

  it("listMessagesForVendor returns empty for vendor with no messages", async () => {
    const msgs = await listMessagesForVendor(vendorBId);
    expect(msgs).toEqual([]);
  });

  it("getMessageByIdForVendor returns message when scoped to correct vendor", async () => {
    const msg = await getMessageByIdForVendor(messageAId, vendorAId);
    expect(msg?.id).toBe(messageAId);
    expect(msg?.subject).toBe("Test");
  });

  it("getMessageByIdForVendor returns null when scoped to a DIFFERENT vendor (cross-tenant block)", async () => {
    const msg = await getMessageByIdForVendor(messageAId, vendorBId);
    expect(msg).toBeNull();
  });

  it("countUnreadForVendor returns the count of unread messages only", async () => {
    const n = await countUnreadForVendor(vendorAId);
    expect(n).toBe(1);
  });
});

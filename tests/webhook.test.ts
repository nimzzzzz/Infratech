import { describe, it, expect, vi, beforeEach } from "vitest";
import { Webhook } from "svix";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// ──────────────────────────────────────────────────────────────────────
// Mock Clerk SDK so webhook tests never hit the real API.
// ──────────────────────────────────────────────────────────────────────
const mockUpdateUserMetadata = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { updateUserMetadata: mockUpdateUserMetadata },
    }),
}));

// Import the route handler AFTER mocks are set up.
import { POST } from "@/app/api/webhooks/clerk/route";

const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET!;
if (!SIGNING_SECRET) {
  throw new Error("CLERK_WEBHOOK_SIGNING_SECRET required for webhook tests");
}

const wh = new Webhook(SIGNING_SECRET);

function signedRequest(payload: unknown): Request {
  const body = JSON.stringify(payload);
  const id = `msg_test_${Math.random().toString(36).slice(2, 10)}`;
  const ts = new Date();
  const tsSec = Math.floor(ts.getTime() / 1000).toString();
  const signature = wh.sign(id, ts, body);
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": tsSec,
      "svix-signature": signature,
    },
    body,
  });
}

function unsignedRequest(payload: unknown): Request {
  return new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const linkedInVendorPayload = (id: string) => ({
  type: "user.created",
  data: {
    id,
    first_name: "Marina",
    last_name: "Volkov",
    email_addresses: [{ id: "ea_1", email_address: "marina@arctus.io" }],
    primary_email_address_id: "ea_1",
    external_accounts: [{ provider: "oauth_linkedin_oidc" }],
    public_metadata: {},
  },
});

const adminPayload = (id: string) => ({
  type: "user.created",
  data: {
    id,
    first_name: "Test",
    last_name: "Admin",
    email_addresses: [{ id: "ea_a", email_address: `${id}@admin.test` }],
    primary_email_address_id: "ea_a",
    external_accounts: [],
    public_metadata: { role: "admin" },
  },
});

beforeEach(() => {
  mockUpdateUserMetadata.mockReset();
});

describe("POST /api/webhooks/clerk", () => {
  // ── (a) ─────────────────────────────────────────────────────────────
  it("a) user.created (LinkedIn, no role): vendor row inserted, sync attempted, succeeds", async () => {
    mockUpdateUserMetadata.mockResolvedValueOnce({});
    const res = await POST(signedRequest(linkedInVendorPayload("user_a")));
    expect(res.status).toBe(200);

    const rows = await db.execute<{ id: number; name: string; onboarded: boolean }>(
      sql`SELECT id, name, onboarded FROM vendors WHERE clerk_user_id = 'user_a'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Marina Volkov");
    expect(rows[0].onboarded).toBe(false);

    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_a", {
      publicMetadata: { role: "vendor" },
    });
    const breadcrumbs = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM audit_log WHERE action = 'clerk.metadata_sync_failed' AND target_id = 'user_a'`,
    );
    expect(Number(breadcrumbs[0].count)).toBe(0);
  });

  // ── (b) ─────────────────────────────────────────────────────────────
  it("b) user.created (LinkedIn, no role) + sync FAILS: vendor STILL inserted, breadcrumb logged", async () => {
    mockUpdateUserMetadata.mockRejectedValueOnce(new Error("Not Found"));
    const res = await POST(signedRequest(linkedInVendorPayload("user_b")));
    expect(res.status).toBe(200);

    const vendorRows = await db.execute<{ id: number }>(
      sql`SELECT id FROM vendors WHERE clerk_user_id = 'user_b'`,
    );
    expect(vendorRows).toHaveLength(1);

    const breadcrumbs = await db.execute<{ action: string; target_id: string; after: any }>(
      sql`SELECT action, target_id, after FROM audit_log WHERE action = 'clerk.metadata_sync_failed' AND target_id = 'user_b'`,
    );
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].after?.error).toBe("Not Found");
  });

  // ── (c) ─────────────────────────────────────────────────────────────
  it("c) user.created with role=admin: admins row inserted, NO sync attempted", async () => {
    const res = await POST(signedRequest(adminPayload("user_c_admin")));
    expect(res.status).toBe(200);

    const rows = await db.execute<{ name: string; role: string }>(
      sql`SELECT name, role FROM admins WHERE clerk_user_id = 'user_c_admin'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Test Admin");
    expect(rows[0].role).toBe("admin");

    const vendorRows = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM vendors WHERE clerk_user_id = 'user_c_admin'`,
    );
    expect(Number(vendorRows[0].count)).toBe(0);

    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  // ── (d) ─────────────────────────────────────────────────────────────
  it("d) user.deleted on a vendor: anonymise + audit_log + apps→unpublished", async () => {
    // Set up: insert a vendor + a published app owned by them
    const [vendor] = await db.execute<{ id: number }>(sql`
      INSERT INTO vendors (slug, clerk_user_id, name, contact_email, linkedin_url, onboarded)
      VALUES ('del-vendor', 'user_d', 'Del Vendor', 'd@example.com', 'https://linkedin.com/x', true)
      RETURNING id
    `);
    const [app] = await db.execute<{ id: number }>(sql`
      INSERT INTO apps (slug, vendor_id, name, website_url, status)
      VALUES ('del-app', ${vendor.id}, 'Del App', 'https://del.example.com', 'published')
      RETURNING id
    `);

    const res = await POST(
      signedRequest({
        type: "user.deleted",
        data: { id: "user_d", deleted: true },
      }),
    );
    expect(res.status).toBe(200);

    const after = await db.execute<{
      name: string;
      contact_email: string | null;
      linkedin_url: string | null;
      clerk_user_id: string | null;
      suspended: boolean;
    }>(sql`
      SELECT name, contact_email, linkedin_url, clerk_user_id, suspended
      FROM vendors WHERE id = ${vendor.id}
    `);
    expect(after[0].name).toBe("[deleted vendor]");
    expect(after[0].contact_email).toBeNull();
    expect(after[0].linkedin_url).toBeNull();
    expect(after[0].clerk_user_id).toBeNull();
    expect(after[0].suspended).toBe(true);

    const audit = await db.execute<{ admin_id: number | null; target_id: string }>(sql`
      SELECT admin_id, target_id FROM audit_log
      WHERE action = 'vendor.gdpr_delete' AND target_id = ${String(vendor.id)}
    `);
    expect(audit).toHaveLength(1);
    expect(audit[0].admin_id).toBeNull();

    const appAfter = await db.execute<{ status: string }>(
      sql`SELECT status FROM apps WHERE id = ${app.id}`,
    );
    expect(appAfter[0].status).toBe("unpublished");
  });

  // ── (e) ─────────────────────────────────────────────────────────────
  it("e) user.deleted on an admin: hard-deleted + audit_log entry", async () => {
    const [admin] = await db.execute<{ id: number }>(sql`
      INSERT INTO admins (clerk_user_id, name, email, role)
      VALUES ('user_e_admin', 'E Admin', 'e@admin.example', 'admin')
      RETURNING id
    `);

    const res = await POST(
      signedRequest({
        type: "user.deleted",
        data: { id: "user_e_admin", deleted: true },
      }),
    );
    expect(res.status).toBe(200);

    const stillThere = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM admins WHERE id = ${admin.id}`,
    );
    expect(Number(stillThere[0].count)).toBe(0);

    const audit = await db.execute<{ count: string | number }>(sql`
      SELECT COUNT(*) AS count FROM audit_log
      WHERE action = 'admin.gdpr_delete' AND target_id = ${String(admin.id)}
    `);
    expect(Number(audit[0].count)).toBe(1);
  });

  // ── (f) ─────────────────────────────────────────────────────────────
  it("f) user.updated: name/email synced, role drift reconciled to Clerk", async () => {
    await db.execute(sql`
      INSERT INTO vendors (slug, clerk_user_id, name, contact_email, onboarded)
      VALUES ('upd-vendor', 'user_f', 'Old Name', 'old@example.com', false)
    `);
    mockUpdateUserMetadata.mockResolvedValueOnce({});

    const res = await POST(
      signedRequest({
        type: "user.updated",
        data: {
          id: "user_f",
          first_name: "New",
          last_name: "Name",
          email_addresses: [
            { id: "ea_new", email_address: "new@example.com" },
          ],
          primary_email_address_id: "ea_new",
          external_accounts: [{ provider: "oauth_linkedin_oidc" }],
          public_metadata: {},  // role missing — drift from DB ("vendor")
        },
      }),
    );
    expect(res.status).toBe(200);

    const after = await db.execute<{ name: string; contact_email: string }>(sql`
      SELECT name, contact_email FROM vendors WHERE clerk_user_id = 'user_f'
    `);
    expect(after[0].name).toBe("New Name");
    expect(after[0].contact_email).toBe("new@example.com");

    expect(mockUpdateUserMetadata).toHaveBeenCalledWith("user_f", {
      publicMetadata: { role: "vendor" },
    });
  });

  // ── (g) ─────────────────────────────────────────────────────────────
  it("g) Invalid signature: 401, no DB writes", async () => {
    const before = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM vendors`,
    );

    const res = await POST(unsignedRequest(linkedInVendorPayload("user_g")));
    expect(res.status).toBe(401);

    const after = await db.execute<{ count: string | number }>(
      sql`SELECT COUNT(*) AS count FROM vendors`,
    );
    expect(Number(after[0].count)).toBe(Number(before[0].count));
  });

  // ── (h) ─────────────────────────────────────────────────────────────
  it("h) Unknown event type: 200 (no-op)", async () => {
    const res = await POST(
      signedRequest({
        type: "session.created",
        data: { id: "sess_x" },
      }),
    );
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  apps,
  submissions,
  vendors,
  vendorMembers,
  auditLog,
} from "@/lib/db/schema";

/**
 * Integration tests for /api/admin/submissions/[id]/(approve|edit|reject).
 * Each case seeds a vendor + admin vendor_member + submission inside
 * the test transaction, calls the route, and asserts the DB state +
 * audit row. Resend + next/server.after() are mocked so no real
 * emails fire and the after() callback is captured-not-executed.
 */

const afterCallbacks: Array<() => unknown | Promise<unknown>> = [];
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((fn: () => unknown | Promise<unknown>) => {
      afterCallbacks.push(fn);
    }),
  };
});

const authMock = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authMock.userId })),
}));

beforeEach(() => {
  authMock.userId = null;
  afterCallbacks.length = 0;
});

async function seedVendor(slug: string) {
  const [v] = await db
    .insert(vendors)
    .values({
      slug,
      name: `Vendor ${slug}`,
      contactEmail: `${slug}@x.test`,
      websiteUrl: "https://example.com",
    })
    .returning({ id: vendors.id });
  return v.id;
}

async function seedAdmin(clerkUserId: string) {
  const [m] = await db
    .insert(vendorMembers)
    .values({
      vendorId: null,
      clerkUserId,
      name: "Test Admin",
      primaryEmail: `${clerkUserId}@admin.test`,
      onboarded: true,
      isAdmin: true,
    })
    .returning({ id: vendorMembers.id });
  return m.id;
}

async function seedVendorMember(clerkUserId: string, vendorId: number) {
  const [m] = await db
    .insert(vendorMembers)
    .values({
      vendorId,
      clerkUserId,
      name: "Test Vendor Person",
      primaryEmail: `${clerkUserId}@vendor.test`,
      onboarded: true,
      isAdmin: false,
    })
    .returning({ id: vendorMembers.id });
  return m.id;
}

async function seedSubmission(opts: {
  vendorId: number;
  status?: "pending_review" | "published" | "rejected" | "edited_awaiting_vendor_approval";
  payload?: Record<string, unknown>;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(submissions)
    .values({
      type: "new",
      status: opts.status ?? "pending_review",
      submitterVendorId: opts.vendorId,
      payload: opts.payload ?? {
        slug: `test-${Math.random().toString(36).slice(2, 8)}`,
        name: "Test Product",
        url: "https://example.com",
        tagline: "A tagline.",
        description: "A description.",
        stages: ["delivery"],
        capabilities: [],
        industries: [],
        pricing: "user-subscription-freemium",
      },
    })
    .returning({ id: submissions.id });
  return row;
}

function makeRequest(body: unknown, id: number, action: string): Request {
  return new Request(
    `http://localhost/api/admin/submissions/${id}/${action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/admin/submissions/:id/approve", () => {
  it("happy path: pending_review → published, creates app row, audit row written", async () => {
    const vendorId = await seedVendor("approve-happy");
    const adminId = await seedAdmin("user_admin_approve_happy");
    authMock.userId = "user_admin_approve_happy";
    const sub = await seedSubmission({
      vendorId,
      payload: {
        slug: `approve-happy-${Date.now()}`,
        name: "Approve Happy Product",
        url: "https://approvehappy.test",
        tagline: "tagline",
        description: "desc",
        stages: [],
        capabilities: [],
        industries: [],
        pricing: "user-subscription-freemium",
      },
    });

    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/approve/route"
    );
    const res = await POST(makeRequest({}, sub.id, "approve"), {
      params: Promise.resolve({ id: String(sub.id) }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.appId).toBe("number");

    // Submission transitioned.
    const [updated] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, sub.id));
    expect(updated.status).toBe("published");
    expect(updated.appId).toBe(json.appId);
    expect(updated.reviewedBy).toBe(adminId);
    expect(updated.publishedAt).not.toBeNull();

    // App row exists with published status.
    const [appRow] = await db.select().from(apps).where(eq(apps.id, json.appId));
    expect(appRow.status).toBe("published");
    expect(appRow.vendorId).toBe(vendorId);

    // Audit row written with actor.
    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, String(sub.id)));
    const approve = audits.find((a) => a.action === "submission.approve");
    expect(approve).toBeDefined();
    expect(approve!.actorVendorMemberId).toBe(adminId);
  });

  it("401 when not signed in", async () => {
    const vendorId = await seedVendor("approve-401");
    const sub = await seedSubmission({ vendorId });
    authMock.userId = null;
    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/approve/route"
    );
    const res = await POST(makeRequest({}, sub.id, "approve"), {
      params: Promise.resolve({ id: String(sub.id) }),
    });
    expect(res.status).toBe(401);
  });

  it("403 when actor is not an admin", async () => {
    const vendorId = await seedVendor("approve-403");
    await seedVendorMember("user_v_approve_403", vendorId);
    authMock.userId = "user_v_approve_403";
    const sub = await seedSubmission({ vendorId });
    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/approve/route"
    );
    const res = await POST(makeRequest({}, sub.id, "approve"), {
      params: Promise.resolve({ id: String(sub.id) }),
    });
    expect(res.status).toBe(403);
  });

  it("409 invalid_transition when submission is already published", async () => {
    const vendorId = await seedVendor("approve-409");
    await seedAdmin("user_admin_approve_409");
    authMock.userId = "user_admin_approve_409";
    const sub = await seedSubmission({ vendorId, status: "published" });
    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/approve/route"
    );
    const res = await POST(makeRequest({}, sub.id, "approve"), {
      params: Promise.resolve({ id: String(sub.id) }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("invalid_transition");
  });
});

describe("POST /api/admin/submissions/:id/edit", () => {
  it("happy path: pending_review → edited_awaiting, admin_edits merged over payload", async () => {
    const vendorId = await seedVendor("edit-happy");
    const adminId = await seedAdmin("user_admin_edit_happy");
    authMock.userId = "user_admin_edit_happy";
    const sub = await seedSubmission({
      vendorId,
      payload: {
        slug: "edit-orig",
        name: "Original Name",
        url: "https://orig.test",
        tagline: "orig tagline",
        description: "orig desc",
        stages: ["delivery"],
        capabilities: [],
        industries: [],
        pricing: "user-subscription-freemium",
      },
    });

    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/edit/route"
    );
    const res = await POST(
      makeRequest(
        { name: "Edited Name", tagline: "edited tagline" },
        sub.id,
        "edit",
      ),
      { params: Promise.resolve({ id: String(sub.id) }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("edited_awaiting_vendor_approval");
    expect(json.adminEdits.name).toBe("Edited Name");
    expect(json.adminEdits.tagline).toBe("edited tagline");
    // Unchanged fields inherit from payload.
    expect(json.adminEdits.description).toBe("orig desc");

    const [updated] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, sub.id));
    expect(updated.status).toBe("edited_awaiting_vendor_approval");
    expect(updated.reviewedBy).toBe(adminId);

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, String(sub.id)));
    expect(audits.find((a) => a.action === "submission.edit")).toBeDefined();
  });

  it("rejects HTML in the description field", async () => {
    const vendorId = await seedVendor("edit-xss");
    await seedAdmin("user_admin_edit_xss");
    authMock.userId = "user_admin_edit_xss";
    const sub = await seedSubmission({ vendorId });
    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/edit/route"
    );
    const res = await POST(
      makeRequest({ description: "<script>alert(1)</script>" }, sub.id, "edit"),
      { params: Promise.resolve({ id: String(sub.id) }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/submissions/:id/reject", () => {
  it("happy path: pending_review → rejected with reason; audit + email queued", async () => {
    const vendorId = await seedVendor("reject-happy");
    const adminId = await seedAdmin("user_admin_reject_happy");
    authMock.userId = "user_admin_reject_happy";
    const sub = await seedSubmission({ vendorId });
    const reason =
      "The description over-promises features the website doesn't list. Trim to factual claims.";

    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/reject/route"
    );
    const res = await POST(
      makeRequest({ reason }, sub.id, "reject"),
      { params: Promise.resolve({ id: String(sub.id) }) },
    );
    expect(res.status).toBe(200);

    const [updated] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, sub.id));
    expect(updated.status).toBe("rejected");
    expect(updated.rejectionReason).toBe(reason);
    expect(updated.reviewedBy).toBe(adminId);

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, String(sub.id)));
    expect(audits.find((a) => a.action === "submission.reject")).toBeDefined();

    // Email queued via after().
    expect(afterCallbacks.length).toBe(1);
  });

  it("rejects a reason shorter than 10 chars", async () => {
    const vendorId = await seedVendor("reject-short");
    await seedAdmin("user_admin_reject_short");
    authMock.userId = "user_admin_reject_short";
    const sub = await seedSubmission({ vendorId });
    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/reject/route"
    );
    const res = await POST(
      makeRequest({ reason: "too short" }, sub.id, "reject"),
      { params: Promise.resolve({ id: String(sub.id) }) },
    );
    expect(res.status).toBe(400);
  });
});

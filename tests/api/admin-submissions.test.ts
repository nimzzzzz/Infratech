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

  // Phase C — publish writes media fields to apps / vendors and
  // inserts app_screenshots rows keyed on the freshly-created apps
  // row. Gallery is now product-level (one set per app).
  it("writes media: apps.logo_url + apps.video_url, vendors.logo_url, app_screenshots rows", async () => {
    const { appScreenshots } = await import("@/lib/db/schema");
    const vendorId = await seedVendor("media-happy");
    const adminId = await seedAdmin("user_admin_media_happy");
    void adminId;
    authMock.userId = "user_admin_media_happy";
    const sub = await seedSubmission({
      vendorId,
      payload: {
        slug: `media-happy-${Date.now()}`,
        name: "Media Happy Product",
        url: "https://media-happy.test",
        tagline: "tagline",
        description: "desc",
        stages: [],
        capabilities: [],
        industries: [],
        pricing: "user-subscription-freemium",
        productLogoUrl: "https://x.public.blob.vercel-storage.com/app_logo/42/p.png",
        productLogoAlt: "Logo",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        companyLogoUrl: "https://x.public.blob.vercel-storage.com/vendor_logo/42/c.png",
        companyLogoAlt: "Company logo",
        productGallery: [
          {
            url: "https://x.public.blob.vercel-storage.com/app_gallery/42/g1.jpg",
            alt: "Dashboard",
            position: 0,
          },
          {
            url: "https://x.public.blob.vercel-storage.com/app_gallery/42/g2.jpg",
            alt: "Reports",
            position: 1,
          },
        ],
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

    const [appRow] = await db
      .select()
      .from(apps)
      .where(eq(apps.id, json.appId));
    expect(appRow.logoUrl).toBe(
      "https://x.public.blob.vercel-storage.com/app_logo/42/p.png",
    );
    expect(appRow.videoUrl).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );

    const [vendorRow] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, vendorId));
    expect(vendorRow.logoUrl).toBe(
      "https://x.public.blob.vercel-storage.com/vendor_logo/42/c.png",
    );

    const galleryRows = await db
      .select()
      .from(appScreenshots)
      .where(eq(appScreenshots.appId, json.appId))
      .orderBy(appScreenshots.position);
    expect(galleryRows).toHaveLength(2);
    expect(galleryRows[0].alt).toBe("Dashboard");
    expect(galleryRows[0].position).toBe(0);
    expect(galleryRows[1].alt).toBe("Reports");
    expect(galleryRows[1].position).toBe(1);
  });

  // Phase C — re-publish on an existing app (idempotent path) wipes
  // and re-inserts the screenshot set. Seeds an apps row with three
  // screenshots, sets the submission's app_id to it (admin edit flow
  // before vendor approval), then approves with a shorter payload and
  // asserts the new set replaces the old.
  it("re-publish gallery: wipes existing rows and inserts the new set", async () => {
    const { appScreenshots } = await import("@/lib/db/schema");
    const vendorId = await seedVendor("media-republish");
    const adminId = await seedAdmin("user_admin_media_republish");
    void adminId;
    authMock.userId = "user_admin_media_republish";

    // Seed an existing apps row + initial gallery (simulates a prior
    // publish that's now being re-published).
    const [existingApp] = await db
      .insert(apps)
      .values({
        slug: `media-republish-${Date.now()}`,
        name: "Republish Product",
        vendorId,
        websiteUrl: "https://republish.test",
        status: "published",
      })
      .returning({ id: apps.id });
    await db.insert(appScreenshots).values([
      { appId: existingApp.id, url: "https://x.public.blob.vercel-storage.com/app_gallery/0/old1.jpg", alt: "Old 1", position: 0 },
      { appId: existingApp.id, url: "https://x.public.blob.vercel-storage.com/app_gallery/0/old2.jpg", alt: "Old 2", position: 1 },
      { appId: existingApp.id, url: "https://x.public.blob.vercel-storage.com/app_gallery/0/old3.jpg", alt: "Old 3", position: 2 },
    ]);

    // Seed a submission tied to the existing apps row via app_id.
    const [sub] = await db
      .insert(submissions)
      .values({
        type: "new",
        status: "pending_review",
        submitterVendorId: vendorId,
        appId: existingApp.id,
        payload: {
          slug: `media-republish-${Date.now()}`,
          name: "Republish Product",
          url: "https://republish.test",
          tagline: "tagline",
          description: "desc",
          stages: [],
          capabilities: [],
          industries: [],
          pricing: "user-subscription-freemium",
          productGallery: [
            {
              url: "https://x.public.blob.vercel-storage.com/app_gallery/0/new1.jpg",
              alt: "New 1",
              position: 0,
            },
          ],
        },
      })
      .returning({ id: submissions.id });

    const { POST } = await import(
      "@/app/api/admin/submissions/[id]/approve/route"
    );
    const res = await POST(makeRequest({}, sub.id, "approve"), {
      params: Promise.resolve({ id: String(sub.id) }),
    });
    expect(res.status).toBe(200);

    const rows = await db
      .select()
      .from(appScreenshots)
      .where(eq(appScreenshots.appId, existingApp.id))
      .orderBy(appScreenshots.position);
    expect(rows).toHaveLength(1);
    expect(rows[0].alt).toBe("New 1");
  });

  // Phase C — publishing a NEW product for a vendor who already has
  // another published app + screenshots must NOT touch the existing
  // app's screenshots. Gallery is product-level, keyed on apps.id;
  // wipe-and-reinsert only runs against the app being published.
  it("publishing a second product leaves the first product's screenshots untouched", async () => {
    const { appScreenshots } = await import("@/lib/db/schema");
    const vendorId = await seedVendor("media-isolation");
    const adminId = await seedAdmin("user_admin_media_isolation");
    void adminId;
    authMock.userId = "user_admin_media_isolation";

    // Seed an existing published app + screenshots (the "first product").
    const [firstApp] = await db
      .insert(apps)
      .values({
        slug: `first-${Date.now()}`,
        name: "First Product",
        vendorId,
        websiteUrl: "https://first.test",
        status: "published",
      })
      .returning({ id: apps.id });
    await db.insert(appScreenshots).values([
      { appId: firstApp.id, url: "https://x.public.blob.vercel-storage.com/app_gallery/0/keep1.jpg", alt: "K1", position: 0 },
      { appId: firstApp.id, url: "https://x.public.blob.vercel-storage.com/app_gallery/0/keep2.jpg", alt: "K2", position: 1 },
    ]);

    // Approve a NEW submission for the same vendor with its own (small)
    // gallery — should create a second app, leave the first's gallery
    // alone.
    const sub = await seedSubmission({
      vendorId,
      payload: {
        slug: `second-${Date.now()}`,
        name: "Second Product",
        url: "https://second.test",
        tagline: "tagline",
        description: "desc",
        stages: [],
        capabilities: [],
        industries: [],
        pricing: "user-subscription-freemium",
        productGallery: [
          {
            url: "https://x.public.blob.vercel-storage.com/app_gallery/0/second1.jpg",
            alt: "S1",
            position: 0,
          },
        ],
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

    // First app's screenshots untouched.
    const firstRows = await db
      .select()
      .from(appScreenshots)
      .where(eq(appScreenshots.appId, firstApp.id))
      .orderBy(appScreenshots.position);
    expect(firstRows).toHaveLength(2);
    expect(firstRows[0].alt).toBe("K1");

    // New app got its own gallery.
    const secondRows = await db
      .select()
      .from(appScreenshots)
      .where(eq(appScreenshots.appId, json.appId))
      .orderBy(appScreenshots.position);
    expect(secondRows).toHaveLength(1);
    expect(secondRows[0].alt).toBe("S1");
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

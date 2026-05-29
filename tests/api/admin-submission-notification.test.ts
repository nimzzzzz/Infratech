import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  vendorMembers,
  vendorMemberLegalAcceptances,
  vendors,
} from "@/lib/db/schema";
import { __resetResendForTests } from "@/lib/email/client";
import { __resetVendorMemberRateLimitForTests } from "@/lib/rate-limit/vendor-member";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

/**
 * Admin submission-notification tests.
 *
 * Mock setup mirrors tests/api/contact-vendor.test.ts:
 *   - next/server.after() is captured-not-executed so we drive it
 *     manually and can assert it was (or wasn't) registered.
 *   - resend is replaced wholesale via a vi.hoisted stub class.
 *   - @clerk/nextjs/server.auth() returns a userId we control.
 *   - @/lib/auth/admin-allowlist.getAdminEmails is mocked so the
 *     recipient list is controllable per-test (avoids the env.clerk()
 *     lazy-parse cache fighting us between cases).
 *
 * Two layers of coverage:
 *   1. Direct notifyAdminsOfSubmission() tests — seed a submission +
 *      vendor row of each type, assert the composed payload.
 *   2. Route-level tests on POST /api/submissions — prove the after()
 *      callback is registered on the success path ONLY (not on
 *      honeypot trip or validation failure). The product-edit /
 *      company-edit routes wire after() with the identical one-liner;
 *      their payloads are covered by the direct tests.
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

const resendMock = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "mock-msg-id" }, error: null })),
}));
vi.mock("resend", () => {
  class MockResend {
    emails = resendMock;
  }
  return { Resend: MockResend };
});

const authMock = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authMock.userId })),
}));

const adminListMock = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock("@/lib/auth/admin-allowlist", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/admin-allowlist")>();
  return { ...actual, getAdminEmails: () => adminListMock.list };
});

type SendArgs = {
  to: string;
  bcc?: string[];
  subject: string;
  html: string;
};

beforeEach(() => {
  afterCallbacks.length = 0;
  authMock.userId = null;
  adminListMock.list = ["admin-a@allinfratech.com", "admin-b@allinfratech.com"];
  resendMock.send.mockReset();
  resendMock.send.mockResolvedValue({ data: { id: "mock-msg-id" }, error: null });
  __resetResendForTests();
  __resetVendorMemberRateLimitForTests();
});

async function seedVendor(slug: string, name: string): Promise<number> {
  const [row] = await db
    .insert(vendors)
    .values({ slug, name })
    .returning({ id: vendors.id });
  return row.id;
}

async function seedSubmission(opts: {
  type: "new" | "product_edit" | "company_edit";
  vendorId: number;
  payload: Record<string, unknown>;
}): Promise<number> {
  const [row] = await db
    .insert(submissions)
    .values({
      type: opts.type,
      status: "pending_review",
      submitterVendorId: opts.vendorId,
      payload: opts.payload,
    })
    .returning({ id: submissions.id });
  return row.id;
}

describe("notifyAdminsOfSubmission — payload per type", () => {
  it("new: subject + headline use the product name, BCCs all admins", async () => {
    const { notifyAdminsOfSubmission } = await import(
      "@/lib/email/send-admin-notification"
    );
    const vendorId = await seedVendor("northstrand-inc", "Northstrand Inc");
    const submissionId = await seedSubmission({
      type: "new",
      vendorId,
      payload: { name: "Northstrand Field", tagline: "Schedule risk analysis." },
    });

    const res = await notifyAdminsOfSubmission({ submissionId });
    expect(res.ok).toBe(true);
    expect(resendMock.send).toHaveBeenCalledTimes(1);

    const [args] = resendMock.send.mock.calls[0] as unknown as [SendArgs];
    expect(args.subject).toBe("New submission for review: Northstrand Field");
    expect(args.bcc).toEqual([
      "admin-a@allinfratech.com",
      "admin-b@allinfratech.com",
    ]);
    // No personal To — admins are BCC'd, never exposed in the To header.
    expect(args.to.length).toBeGreaterThan(0);
    expect(adminListMock.list).not.toContain(args.to);
    expect(args.html).toContain("Northstrand Field");
    expect(args.html).toContain("Northstrand Inc");
    expect(args.html).toContain("/admin/submissions/" + submissionId);
  });

  it("product_edit: subject reads 'Product edit for review: {product}'", async () => {
    const { notifyAdminsOfSubmission } = await import(
      "@/lib/email/send-admin-notification"
    );
    const vendorId = await seedVendor("acme", "Acme Corp");
    const submissionId = await seedSubmission({
      type: "product_edit",
      vendorId,
      payload: { name: "Acme Scheduler", tagline: "Now faster." },
    });

    const res = await notifyAdminsOfSubmission({ submissionId });
    expect(res.ok).toBe(true);

    const [args] = resendMock.send.mock.calls[0] as unknown as [SendArgs];
    expect(args.subject).toBe("Product edit for review: Acme Scheduler");
    expect(args.html).toContain("Acme Scheduler");
    expect(args.html).toContain("Acme Corp");
  });

  it("company_edit: subject + headline use the vendor name (no product)", async () => {
    const { notifyAdminsOfSubmission } = await import(
      "@/lib/email/send-admin-notification"
    );
    const vendorId = await seedVendor("globex", "Globex Ltd");
    const submissionId = await seedSubmission({
      type: "company_edit",
      vendorId,
      payload: { description: "Updated company blurb." },
    });

    const res = await notifyAdminsOfSubmission({ submissionId });
    expect(res.ok).toBe(true);

    const [args] = resendMock.send.mock.calls[0] as unknown as [SendArgs];
    expect(args.subject).toBe("Company profile edit for review: Globex Ltd");
    expect(args.html).toContain("Company profile edit — Globex Ltd");
  });

  it("empty allowlist: no send, still resolves ok", async () => {
    adminListMock.list = [];
    const { notifyAdminsOfSubmission } = await import(
      "@/lib/email/send-admin-notification"
    );
    const vendorId = await seedVendor("nobody", "Nobody Inc");
    const submissionId = await seedSubmission({
      type: "new",
      vendorId,
      payload: { name: "Quiet Product" },
    });

    const res = await notifyAdminsOfSubmission({ submissionId });
    expect(res.ok).toBe(true);
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});

// ── Route-level: after() fires on the success path only ──────────────
async function seedMember(opts: {
  clerkUserId: string;
  vendorId?: number | null;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(vendorMembers)
    .values({
      vendorId: opts.vendorId ?? null,
      clerkUserId: opts.clerkUserId,
      name: "Test Member",
      primaryEmail: `${opts.clerkUserId}@test.example`,
      onboarded: true,
      suspended: false,
    })
    .returning({ id: vendorMembers.id });
  await db.insert(vendorMemberLegalAcceptances).values({
    vendorMemberId: row.id,
    termsVersion: TERMS_VERSION,
  });
  return row;
}

const validBody = (overrides: Record<string, unknown> = {}) => ({
  companyName: "Northstrand Inc",
  companyWebsite: "https://northstrand.example.com",
  companyFounded: "2018",
  companyHeadquarters: "United Kingdom",
  companyRegions: ["emea"],
  companyDescription: "Plain English description of the company.",
  name: "Northstrand Field",
  url: "https://northstrand.example.com",
  tagline: "Schedule risk analysis trained on completed projects.",
  description: "Plain English description of what the product does.",
  stages: ["delivery"],
  capabilities: ["risk-management"],
  industries: ["construction"],
  pricing: "per-seat",
  ...overrides,
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/submissions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.50",
      "user-agent": "Vitest/1.0",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/submissions — admin notification wiring", () => {
  it("success: registers after() and sends one BCC'd email when driven", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({ clerkUserId: "user_notify_ok", vendorId: null });
    authMock.userId = "user_notify_ok";

    const res = await POST(makeRequest(validBody()));
    expect(res.status).toBe(200);

    // Mail not sent yet — after() callback queued, not executed.
    expect(afterCallbacks.length).toBe(1);
    expect(resendMock.send).not.toHaveBeenCalled();

    await afterCallbacks[0]();
    expect(resendMock.send).toHaveBeenCalledTimes(1);
    const [args] = resendMock.send.mock.calls[0] as unknown as [SendArgs];
    expect(args.subject).toBe("New submission for review: Northstrand Field");
    expect(args.bcc).toEqual([
      "admin-a@allinfratech.com",
      "admin-b@allinfratech.com",
    ]);
  });

  it("honeypot trip: no after() registered, no email", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({ clerkUserId: "user_notify_honey", vendorId: null });
    authMock.userId = "user_notify_honey";

    const res = await POST(
      makeRequest(validBody({ website3: "https://spam.example/" })),
    );
    expect(res.status).toBe(200);
    expect(afterCallbacks.length).toBe(0);
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  it("validation failure: no after() registered, no email", async () => {
    const { POST } = await import("@/app/api/submissions/route");
    await seedMember({ clerkUserId: "user_notify_bad", vendorId: null });
    authMock.userId = "user_notify_bad";

    const res = await POST(makeRequest(validBody({ name: "" })));
    expect(res.status).toBe(400);
    expect(afterCallbacks.length).toBe(0);
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});

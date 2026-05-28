import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  submissions,
  vendorMemberLegalAcceptances,
  vendorMembers,
  vendors,
} from "@/lib/db/schema";
import { TERMS_VERSION } from "@/lib/legal/terms-version";

const authMock = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: authMock.userId })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  authMock.userId = null;
});

async function seedVendorMember(clerkUserId: string) {
  const [vendor] = await db
    .insert(vendors)
    .values({
      slug: `company-edit-${clerkUserId}`,
      name: "Company Edit Test",
      websiteUrl: "https://company-edit.test",
    })
    .returning({ id: vendors.id });

  const [member] = await db
    .insert(vendorMembers)
    .values({
      vendorId: vendor.id,
      clerkUserId,
      name: "Test Founder",
      primaryEmail: `${clerkUserId}@example.test`,
      linkedinUrl: "https://www.linkedin.com/in/testfounder",
      role: "Founder",
      onboarded: true,
    })
    .returning({ id: vendorMembers.id, vendorId: vendorMembers.vendorId });

  await db.insert(vendorMemberLegalAcceptances).values({
    vendorMemberId: member.id,
    termsVersion: TERMS_VERSION,
  });

  return { vendorId: vendor.id, memberId: member.id };
}

const validCompanyEdit = (overrides: Record<string, unknown> = {}) => ({
  companyName: "Company Edit Test",
  companyWebsite: "https://company-edit.test",
  companyFounded: "2020",
  companyHeadquarters: "Canada",
  companyRegions: ["north-america"],
  companyDescription: "A company profile update.",
  companyLogoUrl: "",
  companyLogoAlt: "",
  ...overrides,
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/company-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/company-edit — leadership contacts", () => {
  it("adds the signed-in member to the review payload when omitted", async () => {
    const { vendorId, memberId } = await seedVendorMember(
      "user_company_edit_self",
    );
    authMock.userId = "user_company_edit_self";
    const { POST } = await import("@/app/api/company-edit/route");

    const res = await POST(
      makeRequest(validCompanyEdit({ leadershipContacts: [] })),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, json.submissionId));

    expect(submission.submitterVendorId).toBe(vendorId);
    expect(submission.payload).toMatchObject({
      leadershipContacts: [
        {
          name: "Test Founder",
          title: "Founder",
          linkedinUrl: "https://linkedin.com/in/testfounder",
          vendorMemberId: memberId,
        },
      ],
    });
  });

  it("stores leadership contacts in the review payload", async () => {
    const { vendorId, memberId } = await seedVendorMember(
      "user_company_edit_people",
    );
    authMock.userId = "user_company_edit_people";
    const { POST } = await import("@/app/api/company-edit/route");

    const res = await POST(
      makeRequest(
        validCompanyEdit({
          leadershipContacts: [
            {
              name: "Test Founder",
              title: "Founder",
              linkedinUrl: "https://www.linkedin.com/in/testfounder",
            },
            {
              name: "Second Executive",
              title: "Chief Product Officer",
              linkedinUrl: "linkedin.com/in/secondexec",
            },
          ],
        }),
      ),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, json.submissionId));

    expect(submission.submitterVendorId).toBe(vendorId);
    expect(submission.payload).toMatchObject({
      leadershipContacts: [
        {
          name: "Test Founder",
          title: "Founder",
          linkedinUrl: "https://linkedin.com/in/testfounder",
          vendorMemberId: memberId,
        },
        {
          name: "Second Executive",
          title: "Chief Product Officer",
          linkedinUrl: "https://linkedin.com/in/secondexec",
        },
      ],
    });
  });

  it("rejects more than four leadership contacts", async () => {
    await seedVendorMember("user_company_edit_many_people");
    authMock.userId = "user_company_edit_many_people";
    const { POST } = await import("@/app/api/company-edit/route");

    const res = await POST(
      makeRequest(
        validCompanyEdit({
          leadershipContacts: Array.from({ length: 5 }, (_, i) => ({
            name: `Executive ${i + 1}`,
            title: "Executive",
            linkedinUrl: `https://www.linkedin.com/in/executive-${i + 1}`,
          })),
        }),
      ),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.leadershipContacts).toBeTruthy();
  });
});

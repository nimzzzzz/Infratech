import { describe, expect, it } from "vitest";
import { companyEditBodySchema } from "@/app/api/company-edit/schema";

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

describe("companyEditBodySchema leadership contacts", () => {
  it("normalises leadership LinkedIn URLs", () => {
    const parsed = companyEditBodySchema.safeParse(
      validCompanyEdit({
        leadershipContacts: [
          {
            name: "Test Founder",
            title: "Founder",
            linkedinUrl: "linkedin.com/in/testfounder",
          },
        ],
      }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.leadershipContacts).toEqual([
      {
        name: "Test Founder",
        title: "Founder",
        linkedinUrl: "https://linkedin.com/in/testfounder",
      },
    ]);
  });

  it("limits leadership contacts to four people", () => {
    const parsed = companyEditBodySchema.safeParse(
      validCompanyEdit({
        leadershipContacts: Array.from({ length: 5 }, (_, i) => ({
          name: `Executive ${i + 1}`,
          title: "Executive",
          linkedinUrl: `https://www.linkedin.com/in/executive-${i + 1}`,
        })),
      }),
    );

    expect(parsed.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ensureSubmittingMemberLeadershipContact } from "@/lib/submissions/leadership-contacts";

const submittingMember = {
  id: 42,
  name: "Test Founder",
  role: "Founder",
  linkedinUrl: "linkedin.com/in/testfounder",
};

describe("ensureSubmittingMemberLeadershipContact", () => {
  it("adds the submitting member as the first leadership contact", () => {
    expect(
      ensureSubmittingMemberLeadershipContact([], submittingMember),
    ).toEqual([
      {
        name: "Test Founder",
        title: "Founder",
        linkedinUrl: "https://linkedin.com/in/testfounder",
        vendorMemberId: 42,
      },
    ]);
  });

  it("deduplicates the submitting member by LinkedIn URL and keeps the list capped at four", () => {
    const contacts = ensureSubmittingMemberLeadershipContact(
      [
        {
          name: "Duplicate Founder",
          title: "CEO",
          linkedinUrl: "https://www.linkedin.com/in/testfounder/",
        },
        {
          name: "Executive 1",
          title: "COO",
          linkedinUrl: "https://linkedin.com/in/executive-1",
        },
        {
          name: "Executive 2",
          title: "CPO",
          linkedinUrl: "https://linkedin.com/in/executive-2",
        },
        {
          name: "Executive 3",
          title: "CTO",
          linkedinUrl: "https://linkedin.com/in/executive-3",
        },
        {
          name: "Executive 4",
          title: "CFO",
          linkedinUrl: "https://linkedin.com/in/executive-4",
        },
      ],
      submittingMember,
    );

    expect(contacts).toHaveLength(4);
    expect(contacts[0]).toMatchObject({
      name: "Test Founder",
      title: "Founder",
      linkedinUrl: "https://linkedin.com/in/testfounder",
      vendorMemberId: 42,
    });
    expect(contacts.map((contact) => contact.name)).toEqual([
      "Test Founder",
      "Executive 1",
      "Executive 2",
      "Executive 3",
    ]);
  });

  it("links the first manual contact to the submitting member when the member profile is incomplete", () => {
    const contacts = [
      {
        name: "Manual Founder",
        title: "Founder",
        linkedinUrl: "https://linkedin.com/in/manualfounder",
      },
    ];

    expect(
      ensureSubmittingMemberLeadershipContact(contacts, {
        ...submittingMember,
        linkedinUrl: null,
      }),
    ).toEqual([
      {
        ...contacts[0],
        vendorMemberId: 42,
      },
    ]);
  });
});

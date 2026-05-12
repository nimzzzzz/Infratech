import { describe, it, expect } from "vitest";
import { isAdminEmailWithList } from "@/lib/auth/admin-allowlist";

/**
 * Unit tests for the allowlist matcher. We use the With-List variant
 * so we don't need to wrestle with env.clerk() mocks per case.
 */

describe("isAdminEmailWithList", () => {
  it("returns false for empty / null / undefined candidates", () => {
    expect(isAdminEmailWithList("", "a@x.com")).toBe(false);
    expect(isAdminEmailWithList(null, "a@x.com")).toBe(false);
    expect(isAdminEmailWithList(undefined, "a@x.com")).toBe(false);
  });

  it("returns false for empty raw list (allowlist defeated)", () => {
    expect(isAdminEmailWithList("a@x.com", "")).toBe(false);
  });

  it("exact match (case-insensitive)", () => {
    expect(isAdminEmailWithList("Nima@Example.com", "nima@example.com")).toBe(
      true,
    );
    expect(isAdminEmailWithList("NIMA@EXAMPLE.COM", "nima@example.com")).toBe(
      true,
    );
  });

  it("trims whitespace in env value entries", () => {
    expect(
      isAdminEmailWithList("b@y.com", " a@x.com , b@y.com , c@z.com "),
    ).toBe(true);
  });

  it("trims whitespace in candidate", () => {
    expect(isAdminEmailWithList("  b@y.com  ", "a@x.com,b@y.com")).toBe(true);
  });

  it("rejects non-listed emails", () => {
    expect(isAdminEmailWithList("evil@spam.com", "a@x.com,b@y.com")).toBe(
      false,
    );
  });

  it("no wildcards — exact match only", () => {
    expect(isAdminEmailWithList("anyone@resolute.ae", "@resolute.ae")).toBe(
      false,
    );
    expect(isAdminEmailWithList("anyone@resolute.ae", "*@resolute.ae")).toBe(
      false,
    );
  });

  it("ignores empty entries between commas", () => {
    expect(isAdminEmailWithList("a@x.com", "a@x.com,,b@y.com")).toBe(true);
    expect(isAdminEmailWithList("a@x.com", ",,,")).toBe(false);
  });
});

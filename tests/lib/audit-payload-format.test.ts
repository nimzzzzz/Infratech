import { describe, it, expect } from "vitest";
import { formatAuditPayload } from "@/lib/admin/audit-payload-format";

/**
 * Pure-function tests for the per-action audit payload formatter.
 * No DB. Each formatter is exercised against the exact before/after
 * shape its writer produces (see route handlers under
 * app/api/admin and app/api/submissions).
 *
 * The defense-in-depth check for vendor_member.gdpr_delete is the
 * critical case — even if the query layer regressed and a payload
 * leaked through, this layer must still return null.
 */

describe("formatAuditPayload — submission.reject", () => {
  it("returns Reason expander when rejectionReason is a non-empty string", () => {
    const result = formatAuditPayload(
      "submission.reject",
      { status: "pending_review" },
      { status: "rejected", rejectionReason: "Spammy product description" },
    );
    expect(result).toEqual({
      label: "Reason",
      body: "Spammy product description",
    });
  });

  it("returns null when rejectionReason is null", () => {
    const result = formatAuditPayload(
      "submission.reject",
      { status: "pending_review" },
      { status: "rejected", rejectionReason: null },
    );
    expect(result).toBeNull();
  });

  it("returns null when rejectionReason is missing entirely", () => {
    const result = formatAuditPayload(
      "submission.reject",
      { status: "pending_review" },
      { status: "rejected" },
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — submission.edit", () => {
  it("returns Changes expander with comma-separated diffed field names", () => {
    const result = formatAuditPayload(
      "submission.edit",
      {
        status: "pending_review",
        payload: { name: "Old", tagline: "Same", description: "Old desc" },
      },
      {
        status: "edited_awaiting_vendor_approval",
        adminEdits: {
          name: "New",
          tagline: "Same",
          description: "Polished",
        },
      },
    );
    expect(result?.label).toBe("Changes");
    expect(result?.body).toBe("Changed: description, name");
  });

  it("returns null when payload and adminEdits are identical", () => {
    const same = { name: "Foo", tagline: "Bar" };
    const result = formatAuditPayload(
      "submission.edit",
      { status: "pending_review", payload: same },
      { status: "edited_awaiting_vendor_approval", adminEdits: same },
    );
    expect(result).toBeNull();
  });

  it("returns null when payload is missing on one side", () => {
    const result = formatAuditPayload(
      "submission.edit",
      { status: "pending_review" },
      { status: "edited_awaiting_vendor_approval", adminEdits: null },
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — submission.vendor_request_changes", () => {
  it("returns Vendor feedback expander with the feedback string", () => {
    const result = formatAuditPayload(
      "submission.vendor_request_changes",
      { status: "edited_awaiting_vendor_approval" },
      {
        status: "pending_review",
        vendorFeedback: "Please remove the made-up integration claim.",
      },
    );
    expect(result).toEqual({
      label: "Vendor feedback",
      body: "Please remove the made-up integration claim.",
    });
  });
});

describe("formatAuditPayload — vendor.suspend", () => {
  it("returns Reason expander when reason is set", () => {
    const result = formatAuditPayload(
      "vendor.suspend",
      { suspended: false },
      { suspended: true, reason: "Repeated terms-of-service violations" },
    );
    expect(result).toEqual({
      label: "Reason",
      body: "Repeated terms-of-service violations",
    });
  });

  it("returns null for trivial flip with reason === null", () => {
    const result = formatAuditPayload(
      "vendor.suspend",
      { suspended: false },
      { suspended: true, reason: null },
    );
    expect(result).toBeNull();
  });

  it("returns null when reason is empty string", () => {
    const result = formatAuditPayload(
      "vendor.suspend",
      { suspended: false },
      { suspended: true, reason: "   " },
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — app.flag", () => {
  it("returns Reason expander when reason is set (same shape as vendor.suspend)", () => {
    const result = formatAuditPayload(
      "app.flag",
      { flagged: false },
      { flagged: true, reason: "Inaccurate pricing claims" },
    );
    expect(result).toEqual({
      label: "Reason",
      body: "Inaccurate pricing claims",
    });
  });

  it("returns null for trivial flip with no reason", () => {
    const result = formatAuditPayload(
      "app.flag",
      { flagged: false },
      { flagged: true, reason: null },
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — vendor.delete", () => {
  it("returns Deleted record expander with N products, M submissions", () => {
    const result = formatAuditPayload(
      "vendor.delete",
      {
        name: "Arctus",
        productCount: 3,
        submissionCount: 5,
        memberEmails: [{ name: "Jane", primaryEmail: "jane@example.com" }],
        reason: null,
      },
      null,
    );
    expect(result).toEqual({
      label: "Deleted record",
      body: "3 products, 5 submissions",
    });
  });

  it("appends · Reason: ... when a reason was captured", () => {
    const result = formatAuditPayload(
      "vendor.delete",
      {
        name: "Arctus",
        productCount: 3,
        submissionCount: 5,
        reason: "Repeated spam",
      },
      null,
    );
    expect(result?.label).toBe("Deleted record");
    expect(result?.body).toBe(
      "3 products, 5 submissions · Reason: Repeated spam",
    );
  });

  it("uses singular product/submission when count is 1", () => {
    const result = formatAuditPayload(
      "vendor.delete",
      { productCount: 1, submissionCount: 1, reason: null },
      null,
    );
    expect(result?.body).toBe("1 product, 1 submission");
  });

  it("does NOT surface memberEmails or other PII fields in the body", () => {
    const result = formatAuditPayload(
      "vendor.delete",
      {
        name: "Arctus",
        productCount: 1,
        submissionCount: 1,
        memberEmails: [{ name: "Jane Doe", primaryEmail: "jane@example.com" }],
        reason: null,
      },
      null,
    );
    expect(result?.body).not.toMatch(/Jane Doe/);
    expect(result?.body).not.toMatch(/jane@example\.com/);
  });
});

describe("formatAuditPayload — vendor_member.gdpr_delete (defense in depth)", () => {
  it("returns null even when before contains a non-null PII payload", () => {
    // This case should NEVER happen at runtime — the query layer
    // nulls before/after for this action. But the formatter must
    // return null regardless so a regression upstream still keeps
    // PII off the page.
    const result = formatAuditPayload(
      "vendor_member.gdpr_delete",
      {
        name: "Jane Doe",
        primaryEmail: "jane@example.com",
        sensitive: "should never appear",
      },
      { sensitive: "also should never appear" },
    );
    expect(result).toBeNull();
  });

  it("returns null with null before/after (the normal post-redaction shape)", () => {
    const result = formatAuditPayload(
      "vendor_member.gdpr_delete",
      null,
      null,
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — clerk.metadata_sync_failed", () => {
  it("returns Error expander with the error string", () => {
    const result = formatAuditPayload(
      "clerk.metadata_sync_failed",
      { intendedIsAdmin: true },
      { error: "Network timeout after 5000ms" },
    );
    expect(result).toEqual({
      label: "Error",
      body: "Network timeout after 5000ms",
    });
  });

  it("returns null when error is missing", () => {
    const result = formatAuditPayload(
      "clerk.metadata_sync_failed",
      { intendedIsAdmin: true },
      {},
    );
    expect(result).toBeNull();
  });
});

describe("formatAuditPayload — no-expander actions", () => {
  it("submission.approve returns null", () => {
    expect(
      formatAuditPayload(
        "submission.approve",
        { status: "pending_review" },
        { status: "published", appId: 42, type: "new" },
      ),
    ).toBeNull();
  });

  it("submission.vendor_approve returns null", () => {
    expect(
      formatAuditPayload(
        "submission.vendor_approve",
        { status: "edited_awaiting_vendor_approval" },
        { status: "published", appId: 42 },
      ),
    ).toBeNull();
  });

  it("submission.resubmit returns null", () => {
    expect(
      formatAuditPayload(
        "submission.resubmit",
        { status: "rejected", payload: {} },
        { status: "pending_review", payload: {} },
      ),
    ).toBeNull();
  });

  it("vendor.unsuspend returns null (writer never includes reason)", () => {
    expect(
      formatAuditPayload(
        "vendor.unsuspend",
        { suspended: true },
        { suspended: false },
      ),
    ).toBeNull();
  });

  it("app.unflag returns null (writer never includes reason)", () => {
    expect(
      formatAuditPayload(
        "app.unflag",
        { flagged: true },
        { flagged: false },
      ),
    ).toBeNull();
  });

  it("unknown action returns null (forward-compat)", () => {
    expect(formatAuditPayload("future.action", {}, {})).toBeNull();
  });
});

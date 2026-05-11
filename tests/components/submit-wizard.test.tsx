import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmitWizard } from "@/components/dashboard/submit-wizard";

/**
 * Render-smoke tests for SubmitWizard.
 *
 * NOTE: Full handleSubmit → fetch → router-push integration is
 * covered at the HTTP boundary in tests/api/submissions.test.ts.
 * Driving the wizard to its submit state through the UI is brittle
 * (depends on rendered text of every chip group + step ordering),
 * so this file stays at a smoke level for now. End-to-end browser
 * coverage is the right home for the full flow once Playwright /
 * Cypress is wired (out of scope for PR 2).
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe("SubmitWizard", () => {
  it("renders the multi-step wizard with the company step for a fresh signup (skipCompanyStep=false)", () => {
    render(
      <SubmitWizard prefill={{ vendor: "", domain: "" }} skipCompanyStep={false} />,
    );
    // Step indicator should say "New listing" eyebrow + "First, about your company." headline.
    expect(screen.getByText(/new listing/i)).toBeInTheDocument();
    expect(
      screen.getByText(/first, about your company/i),
    ).toBeInTheDocument();
    // Company name input rendered.
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    // Logo upload widget replaced with the "coming soon" notice.
    expect(
      screen.getByText(/Logo uploads are coming soon/i),
    ).toBeInTheDocument();
  });

  it("renders the single-page submit for returning vendors (skipCompanyStep=true)", () => {
    render(
      <SubmitWizard
        prefill={{ vendor: "Returning Co", domain: "returning.example" }}
        skipCompanyStep
      />,
    );
    // Eyebrow is "Add a product" (returning flow), not "New listing".
    expect(screen.getByText(/^Add a product$/i)).toBeInTheDocument();
    // The "Tell us about the new product" headline marks the
    // returning-vendor entry view.
    expect(
      screen.getByText(/tell us about the new product/i),
    ).toBeInTheDocument();
    // Product logo notice is the "coming soon" placeholder.
    expect(
      screen.getAllByText(/Logo uploads are coming soon/i).length,
    ).toBeGreaterThan(0);
  });
});

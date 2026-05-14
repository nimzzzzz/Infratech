import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // Step indicator should say "New listing" eyebrow + "Your company." headline.
    expect(screen.getByText(/new listing/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^your company\.$/i }),
    ).toBeInTheDocument();
    // Company name input rendered.
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    // Phase C — real upload widgets land (no more "coming soon"
    // placeholder). Gallery section + logo section both render.
    expect(
      screen.getByText(/^Company gallery$/i, { selector: "p" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Company logo$/i, { selector: "p" }),
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
    // The "Your new product." headline marks the
    // returning-vendor entry view.
    expect(
      screen.getByRole("heading", { name: /^your new product\.$/i }),
    ).toBeInTheDocument();
    // Phase C — product logo widget renders (was the "coming soon"
    // placeholder before).
    expect(
      screen.getByText(/Product logo/i, { selector: "p" }),
    ).toBeInTheDocument();
    // Phase C — video URL field renders too.
    expect(screen.getByLabelText(/Product video/i)).toBeInTheDocument();
  });

  // Phase C PR 2 — video preview renders inline when the user types
  // a recognised YouTube / Vimeo URL. The schema test (in
  // tests/api/submissions.test.ts) covers server-side rejection of
  // bad URLs; this test covers the client-side preview behaviour.
  it("shows an inline video embed when a valid URL is pasted", () => {
    render(
      <SubmitWizard
        prefill={{ vendor: "Returning Co", domain: "returning.example" }}
        skipCompanyStep
      />,
    );
    const input = screen.getByLabelText(/Product video/i) as HTMLInputElement;
    expect(input.value).toBe("");
    // No iframe yet.
    expect(document.querySelector("iframe")).toBeNull();

    fireEvent.change(input, {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("does NOT show an iframe for an invalid video URL", () => {
    render(
      <SubmitWizard
        prefill={{ vendor: "Returning Co", domain: "returning.example" }}
        skipCompanyStep
      />,
    );
    const input = screen.getByLabelText(/Product video/i) as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: "https://dailymotion.com/video/xyz" },
    });
    expect(document.querySelector("iframe")).toBeNull();
  });
});

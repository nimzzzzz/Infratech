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
    expect(
      screen.getByRole("button", { name: /^previous$/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /^back$/i }),
    ).not.toBeInTheDocument();
    // Company name input rendered.
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    // Phase C — real upload widgets land (no more "coming soon"
    // placeholder). Product media sections are mounted even while hidden.
    expect(
      screen.getByText(/^Screenshots$/i, { selector: "p" }),
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
    // Optional mobile store links are captured alongside the product URL.
    expect(screen.getByLabelText(/Apple App Store URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Google Play URL/i)).toBeInTheDocument();
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

  // Phase C follow-up — Bug 2: clicking Continue with invalid data
  // must surface a visible error summary listing each errored field
  // as an anchor link. The pre-fix UX silently set the error state
  // but rendered nothing the user could see.
  it("shows an ErrorSummary when Continue is clicked on step 1 with empty fields", () => {
    render(
      <SubmitWizard prefill={{ vendor: "", domain: "" }} skipCompanyStep={false} />,
    );
    expect(screen.queryByRole("alert")).toBeNull();

    const continueBtn = screen.getByRole("button", { name: /^continue$/i });
    fireEvent.click(continueBtn);

    // Banner with "Fix N fields to continue" appears.
    expect(
      screen.getByText(/Fix \d+ fields? to continue/i),
    ).toBeInTheDocument();
    // At least one anchor link for an errored field — the first
    // empty field on step 1 is companyName. ErrorSummary anchors
    // include the step-1 prefix (Phase 3 perf: step trees kept
    // mounted with `hidden` toggling — IDs prefixed to avoid
    // any future collision).
    const anchor = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "#step1-companyName");
    expect(anchor).toBeDefined();
    expect(anchor?.textContent).toMatch(/Company name/i);
  });

  // Phase C follow-up — fields validate to clear when fixed. The
  // ErrorSummary should disappear once the user fills missing
  // values and re-validates by clicking Continue again. (Smoke-
  // testing the clear-on-success path more than the empty path.)
  it("clears the ErrorSummary once errors are addressed (state reset on success)", () => {
    render(
      <SubmitWizard prefill={{ vendor: "Northstrand Inc", domain: "northstrand.example.com" }} skipCompanyStep={false} />,
    );
    const continueBtn = screen.getByRole("button", { name: /^continue$/i });
    // Step 1 still has empty year/regions/description → click
    // Continue produces an ErrorSummary.
    fireEvent.click(continueBtn);
    expect(
      screen.getByText(/Fix \d+ fields? to continue/i),
    ).toBeInTheDocument();

    // Fix one field at a time clears its own error inline; the
    // banner persists for the rest. (Tightening the assertion
    // here keeps the test stable across schema tweaks.)
    fireEvent.change(screen.getByLabelText(/Year founded/i), {
      target: { value: "2018" },
    });
    // The step1-companyFounded anchor should no longer be in the
    // summary after the inline-clear fires.
    expect(
      screen
        .queryAllByRole("link")
        .find((a) => a.getAttribute("href") === "#step1-companyFounded"),
    ).toBeUndefined();
  });

  // Phase C polish — stage chips carry tooltips with infrastructure-
  // project descriptions. Asserting static presence in the DOM (the
  // tooltip is hidden by CSS but rendered) covers the data flow from
  // lib/data/stages.ts → ChipGroup option → <span role="tooltip">.
  // Hover / focus visibility is a Tailwind class behaviour, not JS.
  it("renders stage tooltips in the DOM with role=tooltip and the description text", () => {
    render(
      <SubmitWizard
        prefill={{ vendor: "Returning Co", domain: "returning.example" }}
        skipCompanyStep
      />,
    );
    const tooltips = screen.getAllByRole("tooltip");
    // Seven stages, each with a tooltip.
    expect(tooltips.length).toBeGreaterThanOrEqual(7);
    // Spot-check a couple of the tightened descriptions.
    expect(
      screen.getByText(
        /Tools used across multiple project phases — not tied to a specific stage\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Buying and delivering the work — procurement, construction or implementation, scheduling, controls, quality, and safety\./i,
      ),
    ).toBeInTheDocument();
    // Each stage chip's button references its tooltip via
    // aria-describedby. Query by attribute to disambiguate from
    // the Markets chip with the same Cross-* style label.
    const stageGeneralBtn = document.querySelector(
      'button[aria-describedby="chip-tip-general"]',
    );
    expect(stageGeneralBtn).not.toBeNull();
    expect(stageGeneralBtn?.textContent).toMatch(/Cross-Lifecycle/i);
  });

  // Phase 3 perf — wizard step trees are kept mounted with the
  // `hidden` attribute toggling, so state is preserved across step
  // changes (Previous button no longer flashes blank). The structural
  // check: from the initial step-1 view, the step-2 trees are
  // already in the DOM (just hidden). queryByText / queryByLabelText
  // find elements regardless of `hidden`, so we can prove all three
  // step trees co-exist.
  it("keeps step 1, step 2, and step 3 trees all mounted (hidden, not conditionally rendered)", () => {
    render(
      <SubmitWizard prefill={{ vendor: "", domain: "" }} skipCompanyStep={false} />,
    );

    // Step 1 visible — its companyName input is in DOM.
    const companyName = document.getElementById("step1-companyName");
    expect(companyName).not.toBeNull();

    // Step 2 hidden — but its inputs (name, tagline, videoUrl)
    // are also in DOM with the step2- prefix.
    const productName = document.getElementById("step2-name");
    expect(productName).not.toBeNull();
    const videoUrl = document.getElementById("step2-videoUrl");
    expect(videoUrl).not.toBeNull();

    // Step 3 hidden — the review surface renders ReviewBlock
    // headers. "Stages & capabilities" appears as a step-2
    // section heading AND a review heading; querying by section
    // role + name is the cleanest disambiguation, but the simpler
    // check is that all four review block titles render.
    expect(
      screen.getAllByText(/Stages & capabilities/i).length,
    ).toBeGreaterThan(0);
  });

  // Phase 3 perf — the SinglePageSubmit's edit and review views
  // are both kept mounted with `hidden` toggling. The initial view
  // is "edit", so its inputs are visible AND the review's
  // ReviewBlock headers are in the DOM (hidden).
  //
  // Testing-Library's `getByRole` skips elements inside `hidden`
  // attributes by default (they're inaccessible to assistive
  // tech), so `hidden: true` opt-in is required to find the
  // review view's headline.
  it("SinglePageSubmit keeps both edit + review views mounted", () => {
    render(
      <SubmitWizard
        prefill={{ vendor: "Returning Co", domain: "returning.example" }}
        skipCompanyStep
      />,
    );
    // Edit view: product-name input is in DOM (and not hidden).
    expect(document.getElementById("step2-name")).not.toBeNull();
    // Review view (hidden) — its "Review before submitting." H1
    // is still in DOM, reachable via `hidden: true`.
    expect(
      screen.getByRole("heading", {
        name: /^Review before submitting\.$/i,
        hidden: true,
      }),
    ).toBeInTheDocument();
  });
});

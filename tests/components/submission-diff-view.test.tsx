import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubmissionDiffView } from "@/components/dashboard/submission-diff-view";
import { diffPayload } from "@/lib/submissions/diff";

describe("SubmissionDiffView", () => {
  it("renders only changed fields by default, with the unchanged toggle", () => {
    const diff = diffPayload(
      { name: "Old name", tagline: "Same tagline", description: "Same desc" },
      { name: "New name", tagline: "Same tagline", description: "Same desc" },
    );
    render(<SubmissionDiffView diff={diff} />);

    // Changed field visible on both sides.
    expect(screen.getByText("Old name")).toBeInTheDocument();
    expect(screen.getByText("New name")).toBeInTheDocument();

    // Unchanged tagline value not visible.
    expect(screen.queryByText("Same tagline")).toBeNull();

    // The "show unchanged" toggle reports the count of hidden fields.
    const toggle = screen.getByRole("button", {
      name: /show unchanged fields \(\d+\)/i,
    });
    expect(toggle).toBeInTheDocument();
  });

  it("toggling the unchanged-fields button reveals the rest", () => {
    const diff = diffPayload(
      { name: "Old", tagline: "Same" },
      { name: "New", tagline: "Same" },
    );
    render(<SubmissionDiffView diff={diff} />);
    expect(screen.queryByText("Same")).toBeNull();

    const toggle = screen.getByRole("button", {
      name: /show unchanged fields/i,
    });
    fireEvent.click(toggle);

    // Unchanged values appear twice (original column + edited column).
    const taglineCells = screen.getAllByText("Same");
    expect(taglineCells.length).toBeGreaterThan(0);

    // Toggle button label flips.
    expect(
      screen.getByRole("button", { name: /hide unchanged fields/i }),
    ).toBeInTheDocument();
  });

  it("renders the matched-as-is fallback when no fields changed", () => {
    const diff = diffPayload(
      { name: "Same", tagline: "Same" },
      { name: "Same", tagline: "Same" },
    );
    render(<SubmissionDiffView diff={diff} />);
    expect(
      screen.getByText(/our edits matched your submission as-is/i),
    ).toBeInTheDocument();
  });

  it("renders array values as comma-separated text", () => {
    const diff = diffPayload(
      { stages: ["delivery"] },
      { stages: ["delivery", "operations"] },
    );
    render(<SubmissionDiffView diff={diff} />);
    expect(screen.getByText("delivery")).toBeInTheDocument();
    expect(screen.getByText("delivery, operations")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalAcceptanceModal } from "@/components/onboarding/legal-acceptance-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

beforeEach(() => {
  document.body.style.overflow = "";
});

describe("LegalAcceptanceModal", () => {
  it("does not render when initialOnboarded=true", () => {
    render(<LegalAcceptanceModal initialOnboarded={true} firstName="Nima" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders blocking dialog when initialOnboarded=false", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName="Nima" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    expect(screen.getByText(/Welcome, Nima\./)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /accept and continue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("falls back to a generic greeting when firstName is null", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName={null} />);
    expect(screen.getByText(/Welcome to AllInfratech\./)).toBeInTheDocument();
  });

  it("renders the lead paragraph and all 9 declaration bullets", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName="Test" />);

    expect(
      screen.getByText(/I agree to the/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/confirm the declarations below/),
    ).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBe(9);

    expect(listItems[0].textContent).toMatch(/authorised to represent/);
    expect(listItems[1].textContent).toMatch(/accurate, current/);
    expect(listItems[2].textContent).toMatch(/necessary rights and permissions/);
    expect(listItems[3].textContent).toMatch(/permission to use, display/);
    expect(listItems[4].textContent).toMatch(/does not guarantee publication/);
    expect(listItems[5].textContent).toMatch(/edited, declined, suspended/);
    expect(listItems[6].textContent).toMatch(/visitor enquiries/);
    expect(listItems[7].textContent).toMatch(/keeping the submitted information/);
    expect(listItems[8].textContent).toMatch(/does not independently verify/);
  });

  it("renders the checkbox with 'I agree and confirm the above' label", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName="Test" />);
    expect(
      screen.getByText("I agree and confirm the above."),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
});

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
    // Body scroll not locked when modal absent.
    expect(document.body.style.overflow).toBe("");
  });

  it("renders blocking dialog when initialOnboarded=false", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName="Nima" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // Greeting personalised when firstName provided.
    expect(screen.getByText(/Welcome, Nima\./)).toBeInTheDocument();

    // Accept-and-continue submit button + sign-out escape both present.
    expect(
      screen.getByRole("button", { name: /accept and continue/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();

    // Body scroll locked while modal is up.
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("falls back to a generic greeting when firstName is null", () => {
    render(<LegalAcceptanceModal initialOnboarded={false} firstName={null} />);
    expect(screen.getByText(/Welcome to AllInfratech\./)).toBeInTheDocument();
  });
});

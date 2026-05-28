import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

let pathname = "/dashboard";
const signOut = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut }),
}));

const headerProps = {
  companyName: "Oracle",
  userName: "Nima",
  userAvatarUrl: null,
  userTitle: null,
  unreadCount: 0,
};

describe("DashboardHeader", () => {
  it("shows a Dashboard escape link during onboarding when a vendor dashboard exists", () => {
    pathname = "/dashboard/onboarding/submit";

    render(<DashboardHeader {...headerProps} canReturnToDashboard />);

    const dashboardLink = screen.getByRole("link", { name: /^dashboard$/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(
      screen.queryByRole("link", { name: /^overview$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^messages$/i }),
    ).not.toBeInTheDocument();
  });

  it("marks the onboarding Dashboard link pending immediately after click", () => {
    pathname = "/dashboard/onboarding/submit";

    render(<DashboardHeader {...headerProps} canReturnToDashboard />);

    const dashboardLink = screen.getByRole("link", { name: /^dashboard$/i });
    fireEvent.click(dashboardLink);

    expect(dashboardLink).toHaveAttribute("aria-busy", "true");
  });
});

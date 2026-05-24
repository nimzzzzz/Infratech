import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "@/components/site/header";
import { AllInfratechWordmark } from "@/components/shared/allinfratech-wordmark";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false }),
}));

describe("Header wordmark", () => {
  it("renders the AllInfratech logo as three stacked words with orange initials", () => {
    render(<Header />);

    const homeLink = screen.getByRole("link", { name: "AllInfratech home" });
    expect(
      screen.getByText(
        "A repository of infrastructure-related technology products and companies",
      ),
    ).toBeInTheDocument();

    const wordmark = within(homeLink).getByLabelText("all infra tech");
    expect(wordmark).toHaveClass("leading-[0.82]");

    const words = Array.from(
      homeLink.querySelectorAll("[data-allinfratech-word]"),
    ).map((el) => el.textContent);
    expect(words).toEqual(["all", "infra", "tech"]);

    const accents = Array.from(
      homeLink.querySelectorAll("[data-allinfratech-accent]"),
    );
    expect(accents.map((el) => el.textContent)).toEqual(["a", "i", "t"]);
    for (const accent of accents) {
      expect(accent).toHaveClass("text-[var(--color-coral)]");
    }
  });

  it("keeps tight line-height when a page overrides the logo font size", () => {
    render(<AllInfratechWordmark className="text-[21px] text-white" />);

    expect(screen.getByLabelText("all infra tech")).toHaveClass(
      "leading-[0.82]",
    );
  });
});

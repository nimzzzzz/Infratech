import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { LinkedInSignInButton } from "@/components/auth/linkedin-sign-in-button";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => <img {...props} />,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: null }),
}));

vi.mock("@clerk/nextjs/legacy", () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { authenticateWithRedirect: vi.fn() },
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false }),
}));

describe("Login page", () => {
  it("uses the updated vendor reach copy", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(
      screen.getByText(
        /Reach infrastructure and related companies\. Sign in with LinkedIn to get started\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders the LinkedIn button with the official local logo asset", () => {
    render(
      <LinkedInSignInButton
        redirectUrlComplete="/post-signin"
        label="Sign in with LinkedIn"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Sign in with LinkedIn",
    });
    const logo = button.querySelector("img");
    expect(logo).toHaveAttribute("src", "/logos/linkedin/inbug-white.png");
    expect(logo).toHaveAttribute("alt", "");
  });
});

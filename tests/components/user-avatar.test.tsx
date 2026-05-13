import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UserAvatar } from "@/components/shared/user-avatar";

/**
 * V.2 — UserAvatar's two render modes (avatar fetched from Clerk,
 * monogram fallback) plus the runtime error fallback. The fallback
 * branch is the load-bearing one: a broken image URL must not leave
 * a busted icon in the header.
 */

describe("UserAvatar", () => {
  it("renders the image when avatarUrl is provided", () => {
    render(
      <UserAvatar
        avatarUrl="https://img.clerk.com/avatar.jpg"
        name="Nima Sedaghati"
      />,
    );
    const img = screen.getByRole("img", { name: "Nima Sedaghati" });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("https://img.clerk.com/avatar.jpg");
  });

  it("renders initials when avatarUrl is null", () => {
    render(<UserAvatar avatarUrl={null} name="Nima Sedaghati" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByLabelText("Nima Sedaghati")).toHaveTextContent("NS");
  });

  it("falls back to initials when the image errors out", () => {
    render(
      <UserAvatar
        avatarUrl="https://broken.example/avatar.jpg"
        name="Test User"
      />,
    );
    const img = screen.getByRole("img", { name: "Test User" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByLabelText("Test User")).toHaveTextContent("TU");
  });

  it("derives initials from the first two whitespace-separated tokens", () => {
    render(<UserAvatar avatarUrl={null} name="Mary Jane Watson" />);
    expect(screen.getByLabelText("Mary Jane Watson")).toHaveTextContent("MJ");
  });

  it("renders an em-dash when name has no usable initials", () => {
    render(<UserAvatar avatarUrl={null} name="" />);
    expect(screen.getByLabelText("")).toHaveTextContent("—");
  });
});

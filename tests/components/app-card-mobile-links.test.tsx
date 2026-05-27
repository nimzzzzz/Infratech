import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppCard } from "@/components/browse/app-card";
import type { AppCard as AppCardData } from "@/lib/queries/apps";

type AppCardWithMobile = AppCardData & {
  appleAppStoreUrl?: string | null;
  googlePlayUrl?: string | null;
};

function card(overrides: Partial<AppCardWithMobile> = {}): AppCardWithMobile {
  return {
    id: 101,
    slug: "field-product",
    name: "Field Product",
    tagline: "Mobile field workflows for project teams.",
    logoUrl: null,
    vendor: { slug: "field-co", name: "Field Co" },
    pricingSlugs: ["per-seat"],
    stages: [{ slug: "delivery", name: "Procure & Deliver" }],
    capabilitySlugs: ["field-execution"],
    industrySlugs: ["construction"],
    publishedAt: null,
    appleAppStoreUrl: null,
    googlePlayUrl: null,
    ...overrides,
  };
}

describe("AppCard mobile store links", () => {
  it("shows store badges below the divider without a mobile heading or nested links", () => {
    const { container } = render(
      <AppCard
        app={card({
          appleAppStoreUrl: "https://apps.apple.com/app/example/id123",
          googlePlayUrl:
            "https://play.google.com/store/apps/details?id=com.example.app",
        })}
      />,
    );

    expect(screen.getByText("App Store")).toBeInTheDocument();
    expect(screen.getByText("Google Play")).toBeInTheDocument();
    expect(screen.queryByText(/mobile apps/i)).toBeNull();
    expect(screen.queryByText("Subscription")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("does not render an empty mobile row when no store links exist", () => {
    render(<AppCard app={card()} />);

    expect(screen.queryByText("App Store")).toBeNull();
    expect(screen.queryByText("Google Play")).toBeNull();
    expect(screen.queryByText(/mobile apps/i)).toBeNull();
  });
});

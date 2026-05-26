import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilterSidebar } from "@/components/browse/filter-sidebar";
import { IndustryQuickFilter } from "@/components/browse/industry-quick-filter";
import type { FacetCounts } from "@/lib/queries/facets";

const pushSpy = vi.fn();
let currentSearch = new URLSearchParams();
let currentPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearch,
}));

class ResizeObserverStub implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

const facets: FacetCounts = {
  stage: {
    general: 15,
    feasibility: 2,
    definition: 10,
    delivery: 11,
    operations: 5,
    "post-delivery": 3,
  },
  industry: {
    construction: 12,
    infrastructure: 9,
    energy: 5,
    "real-estate": 1,
    manufacturing: 2,
    general: 2,
  },
  capability: {},
  pricing: {},
};

describe("home filter placement", () => {
  beforeEach(() => {
    pushSpy.mockClear();
    currentSearch = new URLSearchParams();
    currentPathname = "/";
    global.ResizeObserver = ResizeObserverStub;
  });

  it("moves infrastructure lifecycle into the sidebar with numbered stage labels", () => {
    render(<FilterSidebar facets={facets} />);

    expect(
      screen.getByRole("heading", { name: "Infrastructure lifecycle" }),
    ).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("1. Feasibility")).toBeInTheDocument();
    expect(screen.getByText("2. Definition")).toBeInTheDocument();
    expect(screen.getByText("3. Delivery")).toBeInTheDocument();
    expect(screen.getByText("4. Operations")).toBeInTheDocument();
    expect(screen.getByText("5. Post-Delivery")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Industry" }),
    ).not.toBeInTheDocument();
  });

  it("uses the horizontal quick filter for industries", () => {
    render(<IndustryQuickFilter />);

    expect(screen.getByText("Filter by industry")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Construction" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Infrastructure" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manufacturing" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "1. Feasibility" }),
    ).not.toBeInTheDocument();
  });
});

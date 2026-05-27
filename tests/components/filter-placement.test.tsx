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
    "post-delivery": 3,
    operations: 5,
    "renewal-exit": 0,
  },
  industry: {
    construction: 12,
    manufacturing: 2,
    "natural-resources": 0,
    "public-civic-assets": 0,
    "real-estate": 1,
    infrastructure: 9,
    energy: 5,
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
    expect(screen.getByText("Cross-Lifecycle")).toBeInTheDocument();
    expect(screen.getByText("1. Strategy & Feasibility")).toBeInTheDocument();
    expect(screen.getByText("2. Development & Design")).toBeInTheDocument();
    expect(screen.getByText("3. Procure & Deliver")).toBeInTheDocument();
    expect(screen.getByText("4. Handover & Closeout")).toBeInTheDocument();
    expect(screen.getByText("5. Operate & Maintain")).toBeInTheDocument();
    expect(screen.getByText("6. Renewal & Exit")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Industry" }),
    ).not.toBeInTheDocument();
  });

  it("uses the horizontal quick filter for markets", () => {
    render(<IndustryQuickFilter />);

    expect(screen.getByText("Filter by market")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Construction & Capital Projects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Industrial & Manufacturing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Real Estate & Facilities" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cross-Market" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "1. Strategy & Feasibility" }),
    ).not.toBeInTheDocument();
  });
});

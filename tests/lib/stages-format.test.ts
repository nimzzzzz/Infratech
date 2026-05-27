import { describe, it, expect } from "vitest";
import { formatStageLabel } from "@/lib/stages/format";

describe("formatStageLabel", () => {
  it("returns 'Cross-Lifecycle' verbatim (no number prefix)", () => {
    expect(formatStageLabel("general")).toBe("Cross-Lifecycle");
  });

  it("prefixes strategy and feasibility with '1.'", () => {
    expect(formatStageLabel("feasibility")).toBe("1. Strategy & Feasibility");
  });

  it("prefixes development and design with '2.'", () => {
    expect(formatStageLabel("definition")).toBe("2. Development & Design");
  });

  it("prefixes procurement and delivery with '3.'", () => {
    expect(formatStageLabel("delivery")).toBe("3. Procure & Deliver");
  });

  it("prefixes handover and closeout with '4.'", () => {
    expect(formatStageLabel("post-delivery")).toBe("4. Handover & Closeout");
  });

  it("prefixes operate and maintain with '5.'", () => {
    expect(formatStageLabel("operations")).toBe("5. Operate & Maintain");
  });

  it("prefixes renewal and exit with '6.'", () => {
    expect(formatStageLabel("renewal-exit")).toBe("6. Renewal & Exit");
  });

  it("passes unknown slugs through verbatim", () => {
    expect(formatStageLabel("not-a-real-slug")).toBe("not-a-real-slug");
  });

  it("passes the empty string through verbatim", () => {
    expect(formatStageLabel("")).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import { formatStageLabel } from "@/lib/stages/format";

describe("formatStageLabel", () => {
  it("returns 'General' verbatim (no number prefix)", () => {
    expect(formatStageLabel("general")).toBe("General");
  });

  it("prefixes feasibility with '1.'", () => {
    expect(formatStageLabel("feasibility")).toBe("1. Feasibility");
  });

  it("prefixes definition with '2.'", () => {
    expect(formatStageLabel("definition")).toBe("2. Definition");
  });

  it("prefixes delivery with '3.'", () => {
    expect(formatStageLabel("delivery")).toBe("3. Delivery");
  });

  it("prefixes operations with '4.'", () => {
    expect(formatStageLabel("operations")).toBe("4. Operations");
  });

  it("prefixes post-delivery with '5.' and preserves the hyphen", () => {
    expect(formatStageLabel("post-delivery")).toBe("5. Post-Delivery");
  });

  it("passes unknown slugs through verbatim", () => {
    expect(formatStageLabel("not-a-real-slug")).toBe("not-a-real-slug");
  });

  it("passes the empty string through verbatim", () => {
    expect(formatStageLabel("")).toBe("");
  });
});

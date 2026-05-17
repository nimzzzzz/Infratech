import { describe, it, expect } from "vitest";
import {
  diffPayload,
  hasAnyChange,
  changedFieldKeys,
  unchangedFieldKeys,
} from "@/lib/submissions/diff";

describe("diffPayload", () => {
  it("returns all whitelisted fields with original + edited + changed", () => {
    const d = diffPayload(
      { name: "Old", tagline: "Old tagline", url: "http://nope" },
      { name: "New", tagline: "Old tagline" },
    );
    expect(d.name.original).toBe("Old");
    expect(d.name.edited).toBe("New");
    expect(d.name.changed).toBe(true);

    expect(d.tagline.changed).toBe(false);
    // Fields not in either input render as null on both sides; that's
    // unchanged from the vendor's perspective.
    expect(d.description.original).toBeNull();
    expect(d.description.edited).toBeNull();
    expect(d.description.changed).toBe(false);
  });

  it("treats null and empty-string as equivalent", () => {
    const d = diffPayload({ description: "" }, { description: null as unknown as string });
    expect(d.description.changed).toBe(false);
  });

  it("array comparison is order- and length-sensitive", () => {
    const same = diffPayload(
      { stages: ["delivery", "operations"] },
      { stages: ["delivery", "operations"] },
    );
    expect(same.stages.changed).toBe(false);

    const reordered = diffPayload(
      { stages: ["delivery", "operations"] },
      { stages: ["operations", "delivery"] },
    );
    expect(reordered.stages.changed).toBe(true);

    const added = diffPayload(
      { stages: ["delivery"] },
      { stages: ["delivery", "feasibility"] },
    );
    expect(added.stages.changed).toBe(true);
  });

  it("only diffs the whitelist — extra payload fields are ignored", () => {
    const d = diffPayload(
      { name: "x", customCapabilities: ["proposed"] },
      { name: "x" },
    );
    // customCapabilities isn't part of the whitelist; not present in
    // the returned shape.
    expect(Object.keys(d)).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "tagline",
        "description",
        "stages",
        "capabilities",
        "industries",
        "pricingModels",
      ]),
    );
    // customCapabilities isn't in the whitelist; not present in result.
    expect(d.customCapabilities).toBeUndefined();
  });

  it("hasAnyChange / changedFieldKeys / unchangedFieldKeys agree", () => {
    const d = diffPayload(
      { name: "Old", tagline: "Same" },
      { name: "New", tagline: "Same" },
    );
    expect(hasAnyChange(d)).toBe(true);
    expect(changedFieldKeys(d)).toEqual(["name"]);
    expect(unchangedFieldKeys(d)).toContain("tagline");
    expect(unchangedFieldKeys(d)).not.toContain("name");
  });

  it("returns no changes when both inputs are null", () => {
    const d = diffPayload(null, null);
    expect(hasAnyChange(d)).toBe(false);
  });

  it("returns no changes when edits payload is null (no admin edit yet)", () => {
    const d = diffPayload({ name: "Original" }, null);
    // null edits means the value on the edited side is null; that
    // doesn't equal "Original", so this WOULD register as changed
    // for the name field. That's correct: the diff component
    // shouldn't render at all when adminEdits is null (the
    // dashboard card gates on status, not on the diff).
    expect(d.name.changed).toBe(true);
  });
});

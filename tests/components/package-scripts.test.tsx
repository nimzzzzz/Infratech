import { describe, expect, it } from "vitest";
import pkg from "../../package.json";

describe("package scripts", () => {
  it("runs database migrations before production builds", () => {
    expect(pkg.scripts?.prebuild).toBe("npm run db:migrate");
  });
});

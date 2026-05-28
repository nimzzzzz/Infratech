import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const expectedTitle =
  "Allinfratech - repository of infrastructure-related technology products and companies";

vi.mock("next/font/google", () => ({
  Alike: () => ({ variable: "--font-alike" }),
  Pavanam: () => ({ variable: "--font-pavanam" }),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
}));

vi.mock("@/components/site/main-chrome", () => ({
  MainChrome: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/home/index-page", () => ({
  HomeIndex: () => null,
}));

describe("site metadata", () => {
  it("uses the requested site title on the root metadata and home page", async () => {
    const [{ metadata: rootMetadata }, { metadata: homeMetadata }] =
      await Promise.all([import("@/app/layout"), import("@/app/page")]);

    expect(rootMetadata.title).toMatchObject({
      default: expectedTitle,
      template: `%s · Allinfratech`,
    });
    expect(rootMetadata.openGraph?.title).toBe(expectedTitle);
    expect(homeMetadata.title).toBe(expectedTitle);
  });

  it("ships a real favicon.ico with common browser icon sizes", () => {
    const favicon = readFileSync(join(process.cwd(), "app/favicon.ico"));

    expect([...favicon.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    expect(favicon.length).toBeGreaterThan(1000);

    const entries = [0, 1, 2].map((index) => {
      const offset = 6 + index * 16;
      return {
        width: favicon[offset],
        height: favicon[offset + 1],
      };
    });

    expect(entries).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
  });
});

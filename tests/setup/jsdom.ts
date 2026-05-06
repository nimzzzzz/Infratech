import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `server-only` throws on import outside a server bundle. Component
// modules can transitively reach it; stub to no-op.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});

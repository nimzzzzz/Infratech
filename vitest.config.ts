import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    // Neon EU + per-test TLS handshake + v8 coverage instrumentation
    // pushes individual cases past the 5s default. 30s is generous;
    // a real-data slowdown would still surface as a failure.
    testTimeout: 30000,
    hookTimeout: 30000,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/ui/**", "node_modules/**"],
          setupFiles: ["./tests/setup/env.ts", "./tests/setup/db-tx.ts"],
          // Tests share a single Neon connection per file via the
          // transaction fixture. Run files sequentially so concurrent
          // BEGINs from different files don't fight for the connection.
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.{ts,tsx}"],
          // Empty for Stage 1 — UI tests land later.
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: [
        "lib/queries/**",
        "lib/auth/**",
        "lib/browse/filters.ts",
        "app/api/webhooks/**",
        "middleware.ts",
      ],
      exclude: [
        "lib/data/**",
        "components/admin/queue-list.tsx",
        "tests/**",
        "node_modules/**",
      ],
      reporter: ["text", "html"],
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // tsconfig has "jsx": "preserve" (Next handles it). Vitest 4 / Vite 7
  // uses oxc as the default transformer — point it at the automatic
  // React jsx-runtime so .tsx tests can render components.
  oxc: {
    jsx: { runtime: "automatic" },
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
          include: [
            "tests/ui/**/*.test.{ts,tsx}",
            "tests/components/**/*.test.{ts,tsx}",
          ],
          // No db-tx setup here — these tests don't touch Postgres.
          // jest-dom matchers + a no-op `server-only` mock so component
          // graphs that pull in server modules transitively can still load.
          setupFiles: ["./tests/setup/jsdom.ts"],
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
        "app/api/clicks/**",
        "app/api/views/**",
        "components/browse/search-bar.tsx",
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

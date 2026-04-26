import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * RLS integration tests config — runs against a real Supabase staging
 * project, NOT in-memory. Slow (~30-60s for the suite) and never included
 * in the default `npm test` run. Invoke via `npm run test:rls`.
 *
 * Sequential execution (singleFork) avoids auth.admin createUser races
 * against Supabase rate limits.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/test/rls/**/*.rls.test.ts"],
    setupFiles: ["./src/test/rls/global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    globals: true,
    environment: "node",
  },
});

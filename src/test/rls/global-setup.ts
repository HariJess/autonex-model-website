import { beforeAll } from "vitest";
import { cleanupOrphanTestUsers } from "./setup";

/**
 * Global beforeAll for the RLS suite. Runs once at the start of the run
 * (singleFork) and removes test users that previous crashed runs left
 * behind in auth.users. Keeps the staging DB clean and prevents Auth
 * rate-limit accumulation.
 */
beforeAll(async () => {
  const deleted = await cleanupOrphanTestUsers();
  if (deleted > 0) {
    console.log(`[RLS setup] Cleaned up ${deleted} orphan test user(s) from previous runs.`);
  }
}, 60000);

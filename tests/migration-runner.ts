import type { TestConvex } from "convex-test";
import type { FunctionReference } from "convex/server";
import { vi } from "vitest";

import type schema from "../convex/schema";

// The backfill migrations chain themselves through the scheduler one batch at
// a time, so tests must drain scheduled functions to run one to completion.
export async function runMigrationToCompletion(
  t: TestConvex<typeof schema>,
  migration: FunctionReference<"mutation", "internal", { cursor?: string }>,
) {
  vi.useFakeTimers();
  try {
    await t.mutation(migration, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

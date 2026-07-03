import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";

export function assertGroupIsActive(group: Doc<"groups">) {
  if (group.archivedAt !== undefined) {
    throw new ConvexError("Group is archived");
  }
}

export function validateAmountCents(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new ConvexError("Amount must be a safe integer number of cents");
  }

  if (value <= 0) {
    throw new ConvexError("Amount must be greater than zero");
  }

  return value;
}

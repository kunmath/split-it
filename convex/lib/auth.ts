import { ConvexError } from "convex/values";

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type UserLookupCtx = QueryCtx | MutationCtx;

const NOT_AUTHENTICATED_ERROR = "Not authenticated";
const CURRENT_USER_NOT_SYNCED_ERROR = "Current user not synced";

async function getAuthIdentity(ctx: UserLookupCtx) {
  return ctx.auth.getUserIdentity();
}

async function getUserByClerkUserId(ctx: UserLookupCtx, clerkUserId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

export async function getCurrentUser(ctx: UserLookupCtx): Promise<Doc<"users"> | null> {
  const identity = await getAuthIdentity(ctx);
  if (identity === null) {
    return null;
  }

  return getUserByClerkUserId(ctx, identity.subject);
}

export async function requireUser(ctx: UserLookupCtx): Promise<Doc<"users">> {
  const identity = await getAuthIdentity(ctx);
  if (identity === null) {
    throw new ConvexError(NOT_AUTHENTICATED_ERROR);
  }

  const user = await getUserByClerkUserId(ctx, identity.subject);
  if (user === null) {
    throw new ConvexError(CURRENT_USER_NOT_SYNCED_ERROR);
  }

  return user;
}

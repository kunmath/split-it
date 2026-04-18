import { ConvexError } from "convex/values";

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type UserLookupCtx = QueryCtx | MutationCtx;
type UserMutationCtx = MutationCtx;

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

function buildUserFieldsFromIdentity(identity: {
  email?: string;
  name?: string;
  pictureUrl?: string;
  subject: string;
}) {
  const email = identity.email?.trim().toLowerCase();
  if (!email) {
    throw new ConvexError("Authenticated user is missing an email address");
  }

  return {
    name: identity.name?.trim() || email,
    email,
    clerkUserId: identity.subject,
    imageUrl: identity.pictureUrl?.trim() || undefined,
  } satisfies Pick<Doc<"users">, "name" | "email" | "clerkUserId" | "imageUrl">;
}

export async function getCurrentUser(ctx: UserLookupCtx): Promise<Doc<"users"> | null> {
  const identity = await getAuthIdentity(ctx);
  if (identity === null) {
    return null;
  }

  return getUserByClerkUserId(ctx, identity.subject);
}

export async function ensureUser(ctx: UserMutationCtx): Promise<Doc<"users">> {
  const identity = await getAuthIdentity(ctx);
  if (identity === null) {
    throw new ConvexError(NOT_AUTHENTICATED_ERROR);
  }

  const existingUser = await getUserByClerkUserId(ctx, identity.subject);
  if (existingUser !== null) {
    return existingUser;
  }

  const userFields = buildUserFieldsFromIdentity(identity);
  const userId = await ctx.db.insert("users", userFields);
  const createdUser = await ctx.db.get(userId);

  if (createdUser === null) {
    throw new ConvexError("Failed to create current user");
  }

  return createdUser;
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

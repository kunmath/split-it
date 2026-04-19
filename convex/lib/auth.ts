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

export function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase();
  if (!email) {
    throw new ConvexError("Authenticated user is missing an email address");
  }

  return email;
}

export async function getUserByClerkUserId(ctx: UserLookupCtx, clerkUserId: string) {
  return ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

export async function getUserByEmail(ctx: UserLookupCtx, email: string) {
  return ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

export function buildUserFieldsFromIdentity(identity: {
  email?: string;
  name?: string;
  pictureUrl?: string;
  subject: string;
}) {
  const email = normalizeEmail(identity.email);

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

  const userByClerkUserId = await getUserByClerkUserId(ctx, identity.subject);
  if (userByClerkUserId !== null) {
    return userByClerkUserId;
  }

  if (!identity.email?.trim()) {
    return null;
  }

  return getUserByEmail(ctx, normalizeEmail(identity.email));
}

async function patchUserIdentity(
  ctx: UserMutationCtx,
  user: Doc<"users">,
  args: {
    clerkUserId: string;
    email: string;
  },
) {
  const patch: Partial<Pick<Doc<"users">, "clerkUserId" | "email">> = {};

  if (user.clerkUserId !== args.clerkUserId) {
    patch.clerkUserId = args.clerkUserId;
  }

  if (user.email !== args.email) {
    patch.email = args.email;
  }

  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
  }
}

export async function ensureUser(ctx: UserMutationCtx): Promise<Doc<"users">> {
  const identity = await getAuthIdentity(ctx);
  if (identity === null) {
    throw new ConvexError(NOT_AUTHENTICATED_ERROR);
  }

  const existingUser = await getUserByClerkUserId(ctx, identity.subject);
  if (existingUser !== null) {
    if (identity.email?.trim()) {
      const email = normalizeEmail(identity.email);
      await patchUserIdentity(ctx, existingUser, {
        clerkUserId: identity.subject,
        email,
      });
    }

    const updatedUser = await ctx.db.get(existingUser._id);
    if (updatedUser === null) {
      throw new ConvexError("Failed to update current user");
    }

    return updatedUser;
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

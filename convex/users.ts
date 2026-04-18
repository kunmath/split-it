import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

type StoredUserFields = Pick<Doc<"users">, "name" | "email" | "clerkUserId" | "imageUrl">;

function buildCurrentUserFields(identity: {
  email?: string;
  name?: string;
  pictureUrl?: string;
  subject: string;
}): StoredUserFields {
  const email = identity.email?.trim().toLowerCase();
  if (!email) {
    throw new ConvexError("Authenticated user is missing an email address");
  }

  return {
    name: identity.name?.trim() || email,
    email,
    clerkUserId: identity.subject,
    imageUrl: identity.pictureUrl?.trim() || undefined,
  };
}

async function upsertUser(ctx: MutationCtx, userFields: StoredUserFields) {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userFields.clerkUserId))
    .unique();

  if (existingUser !== null) {
    const patch: Partial<StoredUserFields> = {};

    if (existingUser.name !== userFields.name) {
      patch.name = userFields.name;
    }
    if (existingUser.email !== userFields.email) {
      patch.email = userFields.email;
    }
    if (existingUser.imageUrl !== userFields.imageUrl) {
      patch.imageUrl = userFields.imageUrl;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existingUser._id, patch);
    }

    return existingUser._id;
  }

  return ctx.db.insert("users", userFields);
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    return getCurrentUser(ctx);
  },
});

export const storeCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError("Called storeCurrentUser without authentication");
    }

    return upsertUser(ctx, buildCurrentUserFields(identity));
  },
});

export const upsertFromClerk = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return upsertUser(
      ctx,
      buildCurrentUserFields({
        email: args.email,
        name: args.name,
        pictureUrl: args.imageUrl,
        subject: args.clerkUserId,
      }),
    );
  },
});

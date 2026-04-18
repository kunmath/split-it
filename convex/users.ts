import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import {
  buildUserFieldsFromIdentity,
  getCurrentUser,
  getUserByClerkUserId,
  getUserByEmail,
  normalizeEmail,
  requireUser,
} from "./lib/auth";
import { getAvatarOption, isAvatarKey } from "../lib/avatar-options";

type StoredUserFields = Pick<Doc<"users">, "name" | "email" | "clerkUserId" | "imageUrl">;

function sanitizeDisplayName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length < 2) {
    throw new ConvexError("Display name must be at least 2 characters.");
  }

  if (normalized.length > 40) {
    throw new ConvexError("Display name must be 40 characters or fewer.");
  }

  return normalized;
}

async function patchStoredUserIdentity(
  ctx: MutationCtx,
  user: Doc<"users">,
  userFields: StoredUserFields,
) {
  const patch: Partial<Pick<Doc<"users">, "clerkUserId" | "email">> = {};

  if (user.clerkUserId !== userFields.clerkUserId) {
    patch.clerkUserId = userFields.clerkUserId;
  }

  if (user.email !== userFields.email) {
    patch.email = userFields.email;
  }

  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
  }
}

async function upsertUser(ctx: MutationCtx, userFields: StoredUserFields) {
  const existingUser =
    await getUserByEmail(ctx, userFields.email)
    ?? await getUserByClerkUserId(ctx, userFields.clerkUserId);

  if (existingUser !== null) {
    await patchStoredUserIdentity(ctx, existingUser, userFields);
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
  args: {
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError("Called storeCurrentUser without authentication");
    }

    const existingUserByClerkUserId = await getUserByClerkUserId(ctx, identity.subject);
    if (existingUserByClerkUserId !== null) {
      if (identity.email?.trim()) {
        const userFields = buildUserFieldsFromIdentity(identity);
        await patchStoredUserIdentity(ctx, existingUserByClerkUserId, userFields);
      }

      return existingUserByClerkUserId._id;
    }

    const email = identity.email?.trim() || args.email?.trim();
    if (!email) {
      throw new ConvexError("Current user sync is missing an email address.");
    }

    const userFields = buildUserFieldsFromIdentity({
      email,
      name: identity.name ?? args.name,
      pictureUrl: identity.pictureUrl ?? args.imageUrl,
      subject: identity.subject,
    });
    const existingUser =
      await getUserByEmail(ctx, userFields.email)
      ?? existingUserByClerkUserId;

    if (existingUser !== null) {
      await patchStoredUserIdentity(ctx, existingUser, userFields);
      return existingUser._id;
    }

    return upsertUser(ctx, userFields);
  },
});

export const saveProfile = mutation({
  args: {
    avatarKey: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const displayName = sanitizeDisplayName(args.displayName);

    if (!isAvatarKey(args.avatarKey)) {
      throw new ConvexError("Select one of the available avatars.");
    }

    const avatar = getAvatarOption(args.avatarKey);

    await ctx.db.patch(user._id, {
      avatarKey: args.avatarKey,
      imageUrl: avatar.src,
      name: displayName,
      profileCompletedAt: user.profileCompletedAt ?? Date.now(),
    });

    return user._id;
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
      buildUserFieldsFromIdentity({
        email: normalizeEmail(args.email),
        name: args.name,
        pictureUrl: args.imageUrl,
        subject: args.clerkUserId,
      }),
    );
  },
});

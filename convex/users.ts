import { ConvexError, v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getUserByClerkUserId,
  requireUser,
  syncUser,
} from "./lib/auth";
import { getAvatarOption, isAvatarKey } from "../lib/avatar-options";

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

    const verifiedEmail = identity.email?.trim();
    const email = verifiedEmail || args.email?.trim();

    if (!email) {
      const existingUser = await getUserByClerkUserId(ctx, identity.subject);
      if (existingUser !== null) {
        return existingUser._id;
      }

      throw new ConvexError("Current user sync is missing an email address.");
    }

    const user = await syncUser(ctx, {
      clerkUserId: identity.subject,
      email,
      emailIsVerified: Boolean(verifiedEmail),
      name: identity.name ?? args.name,
      imageUrl: identity.pictureUrl ?? args.imageUrl,
    });

    return user._id;
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
    const user = await syncUser(ctx, {
      clerkUserId: args.clerkUserId,
      email: args.email,
      emailIsVerified: true,
      name: args.name,
      imageUrl: args.imageUrl,
    });

    return user._id;
  },
});

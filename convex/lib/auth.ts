import { ConvexError } from "convex/values";

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type UserLookupCtx = QueryCtx | MutationCtx;

const NOT_AUTHENTICATED_ERROR = "Not authenticated";
const CURRENT_USER_NOT_SYNCED_ERROR = "Current user not synced";

// Users seeded by demo tooling get "demo-..." ids; real Clerk ids never use
// that prefix. A placeholder row may be claimed by the first verified sign-in
// with a matching email.
const PLACEHOLDER_CLERK_USER_ID_PREFIX = "demo-";

export function isPlaceholderClerkUserId(clerkUserId: string) {
  return clerkUserId.startsWith(PLACEHOLDER_CLERK_USER_ID_PREFIX);
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
  const matches = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();

  if (matches.length <= 1) {
    return matches[0] ?? null;
  }

  // Legacy duplicate emails can exist from before sync was unified. Prefer the
  // row claimed by a real Clerk account so sign-in keeps working.
  return matches.find((user) => !isPlaceholderClerkUserId(user.clerkUserId)) ?? matches[0]!;
}

function buildStaleEmailTombstone(user: Doc<"users">) {
  return `stale-${user._id}@retired.split-it.local`;
}

export type SyncUserArgs = {
  clerkUserId: string;
  email: string;
  // True when the email came from the Clerk identity or a verified webhook.
  // Client-supplied emails must never link to or displace existing accounts.
  emailIsVerified: boolean;
  name?: string;
  imageUrl?: string;
};

// Single write path for user identity. The Clerk user id is the canonical key;
// email is only a one-time linking fallback for placeholder rows.
export async function syncUser(ctx: MutationCtx, args: SyncUserArgs): Promise<Doc<"users">> {
  const email = normalizeEmail(args.email);

  const existingByClerkId = await getUserByClerkUserId(ctx, args.clerkUserId);
  if (existingByClerkId !== null) {
    if (args.emailIsVerified && existingByClerkId.email !== email) {
      const emailHolder = await getUserByEmail(ctx, email);

      if (emailHolder !== null && emailHolder._id !== existingByClerkId._id) {
        // Clerk enforces unique emails across accounts, so any other row still
        // holding this email is stale. Retire it to keep emails unique here.
        await ctx.db.patch(emailHolder._id, { email: buildStaleEmailTombstone(emailHolder) });
      }

      await ctx.db.patch(existingByClerkId._id, { email });
    }

    const updatedUser = await ctx.db.get(existingByClerkId._id);
    if (updatedUser === null) {
      throw new ConvexError("Failed to update current user");
    }

    return updatedUser;
  }

  const existingByEmail = await getUserByEmail(ctx, email);
  if (existingByEmail !== null) {
    if (!args.emailIsVerified) {
      throw new ConvexError("This email is already linked to another account");
    }

    if (isPlaceholderClerkUserId(existingByEmail.clerkUserId)) {
      // First real sign-in for a seeded/placeholder row: claim it.
      await ctx.db.patch(existingByEmail._id, { clerkUserId: args.clerkUserId });

      const claimedUser = await ctx.db.get(existingByEmail._id);
      if (claimedUser === null) {
        throw new ConvexError("Failed to update current user");
      }

      return claimedUser;
    }

    // Same verified email but a different Clerk account: the old row's email is
    // stale (Clerk enforces unique emails). Never attach this sign-in to it —
    // that would hand this person someone else's groups and balances.
    await ctx.db.patch(existingByEmail._id, { email: buildStaleEmailTombstone(existingByEmail) });
  }

  const userId = await ctx.db.insert("users", {
    name: args.name?.trim() || email,
    email,
    clerkUserId: args.clerkUserId,
    imageUrl: args.imageUrl?.trim() || undefined,
  });
  const createdUser = await ctx.db.get(userId);

  if (createdUser === null) {
    throw new ConvexError("Failed to create current user");
  }

  return createdUser;
}

export async function getCurrentUser(ctx: UserLookupCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
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

  // Before the first mutation claims it, a seeded placeholder row is only
  // findable by email. Rows claimed by a different Clerk account are never
  // returned — that would expose someone else's data.
  const userByEmail = await getUserByEmail(ctx, normalizeEmail(identity.email));

  return userByEmail !== null && isPlaceholderClerkUserId(userByEmail.clerkUserId)
    ? userByEmail
    : null;
}

export async function ensureUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError(NOT_AUTHENTICATED_ERROR);
  }

  if (!identity.email?.trim()) {
    const existingUser = await getUserByClerkUserId(ctx, identity.subject);
    if (existingUser !== null) {
      return existingUser;
    }

    throw new ConvexError("Authenticated user is missing an email address");
  }

  return syncUser(ctx, {
    clerkUserId: identity.subject,
    email: identity.email,
    emailIsVerified: true,
    name: identity.name,
    imageUrl: identity.pictureUrl,
  });
}

export async function requireUser(ctx: UserLookupCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError(NOT_AUTHENTICATED_ERROR);
  }

  const user = await getUserByClerkUserId(ctx, identity.subject);
  if (user === null) {
    throw new ConvexError(CURRENT_USER_NOT_SYNCED_ERROR);
  }

  return user;
}

import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 18;

type InviteStatus = Doc<"groupInvites">["status"];

export type InviteCtx = QueryCtx | MutationCtx;

export function deriveInviteStatus(
  invite: Doc<"groupInvites">,
  now: number,
): InviteStatus {
  if (invite.status === "accepted") {
    return "accepted";
  }

  if (invite.status === "expired" || invite.expiresAt <= now) {
    return "expired";
  }

  return "pending";
}

export async function getInviteByToken(ctx: InviteCtx, token: string) {
  return ctx.db
    .query("groupInvites")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

async function createUniqueInviteToken(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
    const token = Array.from(bytes, (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
    const existingInvite = await getInviteByToken(ctx, token);

    if (existingInvite === null) {
      return token;
    }
  }

  throw new ConvexError("Unable to create a unique invite link");
}

export async function expirePendingGroupInvites(
  ctx: MutationCtx,
  groupId: Id<"groups">,
) {
  const invites = await ctx.db
    .query("groupInvites")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  for (const invite of invites) {
    if (invite.status === "pending") {
      await ctx.db.patch(invite._id, { status: "expired" });
    }
  }
}

export async function getPendingInviteForGroup(
  ctx: InviteCtx,
  groupId: Id<"groups">,
  now: number,
) {
  const invites = await ctx.db
    .query("groupInvites")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  return (
    invites
      .filter((invite) => deriveInviteStatus(invite, now) === "pending")
      .sort((left, right) => right._creationTime - left._creationTime)[0] ??
    null
  );
}

export async function createPendingInvite(
  ctx: MutationCtx,
  args: {
    email?: string;
    groupId: Id<"groups">;
    invitedBy: Id<"users">;
    now: number;
  },
) {
  const token = await createUniqueInviteToken(ctx);
  const expiresAt = args.now + INVITE_TTL_MS;

  const inviteId = await ctx.db.insert("groupInvites", {
    email: args.email,
    groupId: args.groupId,
    invitedBy: args.invitedBy,
    token,
    status: "pending",
    expiresAt,
  });

  const invite = await ctx.db.get(inviteId);

  if (invite === null) {
    throw new ConvexError("Invite could not be created");
  }

  return invite;
}

export async function rotatePendingInviteForGroup(
  ctx: MutationCtx,
  args: {
    groupId: Id<"groups">;
    invitedBy: Id<"users">;
    now: number;
  },
) {
  await expirePendingGroupInvites(ctx, args.groupId);

  return createPendingInvite(ctx, args);
}

export async function ensurePendingInviteForGroup(
  ctx: MutationCtx,
  args: {
    email?: string;
    groupId: Id<"groups">;
    invitedBy: Id<"users">;
    now: number;
  },
) {
  const existingInvite = await getPendingInviteForGroup(ctx, args.groupId, args.now);

  if (existingInvite === null) {
    await expirePendingGroupInvites(ctx, args.groupId);
    return createPendingInvite(ctx, args);
  }

  if (args.email !== undefined && existingInvite.email !== args.email) {
    await ctx.db.patch(existingInvite._id, { email: args.email });
    return {
      ...existingInvite,
      email: args.email,
    };
  }

  return existingInvite;
}

export function normalizeInviteEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email) {
    throw new ConvexError("Email is required");
  }

  if (email.length > 254) {
    throw new ConvexError("Email must be 254 characters or fewer");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError("Enter a valid email address");
  }

  return email;
}

import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { requireGroupOwner } from "./lib/permissions";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 18;

type InviteCtx = QueryCtx | MutationCtx;
type InviteStatus = Doc<"groupInvites">["status"];

function deriveInviteStatus(invite: Doc<"groupInvites">, now: number): InviteStatus {
  if (invite.status === "accepted") {
    return "accepted";
  }

  if (invite.status === "expired" || invite.expiresAt <= now) {
    return "expired";
  }

  return "pending";
}

async function getInviteByToken(ctx: InviteCtx, token: string) {
  return ctx.db
    .query("groupInvites")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

async function createUniqueInviteToken(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    const existingInvite = await getInviteByToken(ctx, token);

    if (existingInvite === null) {
      return token;
    }
  }

  throw new ConvexError("Unable to create a unique invite link");
}

async function expirePendingGroupInvites(ctx: MutationCtx, groupId: Id<"groups">, now: number) {
  const invites = await ctx.db
    .query("groupInvites")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  for (const invite of invites) {
    if (deriveInviteStatus(invite, now) === "pending") {
      await ctx.db.patch(invite._id, { status: "expired" });
    }
  }
}

async function getPendingInviteForGroup(ctx: InviteCtx, groupId: Id<"groups">, now: number) {
  const invites = await ctx.db
    .query("groupInvites")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  return invites
    .filter((invite) => deriveInviteStatus(invite, now) === "pending")
    .sort((left, right) => right._creationTime - left._creationTime)[0] ?? null;
}

export const getGroupComposerData = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const group = await ctx.db.get(args.groupId);

    if (group === null || group.archivedAt !== undefined) {
      return null;
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", args.groupId).eq("userId", user._id))
      .unique();

    if (membership === null || membership.status !== "active") {
      return null;
    }

    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const activeMemberships = groupMembers.filter((member) => member.status === "active");
    const memberUsers = await Promise.all(activeMemberships.map((member) => ctx.db.get(member.userId)));
    const now = Date.now();
    const activeInvite =
      membership.role === "owner" ? await getPendingInviteForGroup(ctx, group._id, now) : null;

    return {
      groupId: group._id,
      groupName: group.name,
      groupDescription: group.description,
      groupCurrency: group.currency,
      currentUserRole: membership.role,
      canInvite: membership.role === "owner",
      memberCount: activeMemberships.length,
      members: activeMemberships
        .map((member, index) => {
          const memberUser = memberUsers[index];

          return {
            id: member.userId,
            name: memberUser?.name ?? "Group member",
            email: memberUser?.email ?? "",
            imageUrl: memberUser?.imageUrl,
            isCurrentUser: member.userId === user._id,
            role: member.role,
          };
        })
        .sort((left, right) => {
          if (left.isCurrentUser && !right.isCurrentUser) {
            return -1;
          }

          if (!left.isCurrentUser && right.isCurrentUser) {
            return 1;
          }

          if (left.role === "owner" && right.role !== "owner") {
            return -1;
          }

          if (left.role !== "owner" && right.role === "owner") {
            return 1;
          }

          return left.name.localeCompare(right.name);
        }),
      activeInvite:
        activeInvite === null
          ? null
          : {
              token: activeInvite.token,
              expiresAt: activeInvite.expiresAt,
            },
    };
  },
});

export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await getInviteByToken(ctx, args.token);

    if (invite === null) {
      return null;
    }

    const group = await ctx.db.get(invite.groupId);

    if (group === null || group.archivedAt !== undefined) {
      return null;
    }

    const now = Date.now();
    const inviteStatus = deriveInviteStatus(invite, now);
    const inviter = await ctx.db.get(invite.invitedBy);
    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    const activeMemberships = groupMembers.filter((member) => member.status === "active");
    const activeUsers = await Promise.all(activeMemberships.map((member) => ctx.db.get(member.userId)));
    const currentUser = await getCurrentUser(ctx);
    const viewerMembership =
      currentUser === null
        ? null
        : await ctx.db
            .query("groupMembers")
            .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", currentUser._id))
            .unique();

    return {
      token: invite.token,
      groupId: group._id,
      groupName: group.name,
      groupDescription: group.description,
      groupCurrency: group.currency,
      inviterName: inviter?.name ?? "Group owner",
      expiresAt: invite.expiresAt,
      inviteStatus,
      memberCount: activeMemberships.length,
      memberPreview: activeUsers
        .map((memberUser, index) => ({
          id: activeMemberships[index]!.userId,
          name: memberUser?.name ?? "Group member",
          imageUrl: memberUser?.imageUrl,
        }))
        .slice(0, 4),
      viewerMembershipRole:
        viewerMembership !== null && viewerMembership.status === "active" ? viewerMembership.role : null,
    };
  },
});

export const create = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { user, group } = await requireGroupOwner(ctx, args.groupId);
    const now = Date.now();

    await expirePendingGroupInvites(ctx, group._id, now);

    const token = await createUniqueInviteToken(ctx);
    const expiresAt = now + INVITE_TTL_MS;

    await ctx.db.insert("groupInvites", {
      groupId: group._id,
      invitedBy: user._id,
      token,
      status: "pending",
      expiresAt,
    });

    return {
      token,
      expiresAt,
    };
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invite = await getInviteByToken(ctx, args.token);

    if (invite === null) {
      throw new ConvexError("Invite link not found");
    }

    const group = await ctx.db.get(invite.groupId);

    if (group === null || group.archivedAt !== undefined) {
      throw new ConvexError("This group is no longer available");
    }

    const now = Date.now();
    const inviteStatus = deriveInviteStatus(invite, now);

    if (inviteStatus === "accepted") {
      throw new ConvexError("This invite link has already been used");
    }

    if (inviteStatus === "expired") {
      if (invite.status === "pending") {
        await ctx.db.patch(invite._id, { status: "expired" });
      }

      throw new ConvexError("This invite link has expired");
    }

    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", user._id))
      .unique();

    if (existingMembership !== null && existingMembership.status === "active") {
      return {
        groupId: group._id,
        groupName: group.name,
        alreadyMember: true,
      };
    }

    if (existingMembership !== null) {
      await ctx.db.patch(existingMembership._id, {
        role: existingMembership.role,
        status: "active",
        joinedAt: now,
      });
    } else {
      await ctx.db.insert("groupMembers", {
        groupId: group._id,
        userId: user._id,
        role: "member",
        status: "active",
        joinedAt: now,
      });
    }

    await ctx.db.patch(invite._id, {
      acceptedBy: user._id,
      status: "accepted",
    });

    return {
      groupId: group._id,
      groupName: group.name,
      alreadyMember: false,
    };
  },
});

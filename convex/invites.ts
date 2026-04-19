import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib/auth";
import { buildInviteUrl, isInviteEmailEnabled, requireInviteEmailConfig } from "./lib/inviteEmail";
import {
  deriveInviteStatus,
  ensurePendingInviteForGroup,
  getInviteByToken,
  getPendingInviteForGroup,
  normalizeInviteEmail,
  rotatePendingInviteForGroup,
} from "./lib/inviteHelpers";
import { requireGroupOwner } from "./lib/permissions";
import {
  GROUP_MEMBER_ROLE,
  INVITE_STATUS,
  MEMBERSHIP_STATUS,
} from "./lib/constants";

function assertGroupIsActive(group: Doc<"groups">) {
  if (group.archivedAt !== undefined) {
    throw new ConvexError("Group is archived");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInviteExpiry(expiresAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(expiresAt);
}

function buildInviteEmailHtml(args: {
  expiresAt: number;
  groupDescription?: string;
  groupName: string;
  inviteUrl: string;
  inviterName: string;
}) {
  const safeGroupName = escapeHtml(args.groupName);
  const safeInviterName = escapeHtml(args.inviterName);
  const safeDescription = args.groupDescription
    ? escapeHtml(args.groupDescription)
    : null;
  const safeInviteUrl = escapeHtml(args.inviteUrl);

  return `
    <div style="background:#131313;padding:32px 20px;font-family:Arial,sans-serif;color:#e5e2e1;">
      <div style="max-width:560px;margin:0 auto;border-radius:28px;padding:32px;background:linear-gradient(180deg,#1c1b1b,#131313);border:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0 0 12px;color:#4edea3;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;">Split-It Invite</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.1;">Join ${safeGroupName}</h1>
        <p style="margin:0 0 20px;color:#bbcabf;font-size:15px;line-height:1.7;">
          ${safeInviterName} sent you a secure single-use invite link for this shared expense group.
        </p>
        ${
          safeDescription
            ? `<p style="margin:0 0 20px;color:#bbcabf;font-size:14px;line-height:1.7;">${safeDescription}</p>`
            : ""
        }
        <div style="margin:0 0 24px;padding:18px 20px;border-radius:22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#4edea3;">Invite Rules</p>
          <p style="margin:0;color:#bbcabf;font-size:14px;line-height:1.7;">
            This link works once and expires on ${escapeHtml(formatInviteExpiry(args.expiresAt))}. If the owner generates or sends a fresh invite later, the previous pending link rotates out.
          </p>
        </div>
        <a href="${safeInviteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#4edea3;color:#003824;font-weight:700;text-decoration:none;">
          Accept Invite
        </a>
        <p style="margin:18px 0 0;color:#bbcabf;font-size:13px;line-height:1.7;word-break:break-word;">
          If the button does not open, use this link:<br />
          <a href="${safeInviteUrl}" style="color:#4edea3;text-decoration:none;">${safeInviteUrl}</a>
        </p>
      </div>
    </div>
  `;
}

function buildInviteEmailText(args: {
  expiresAt: number;
  groupDescription?: string;
  groupName: string;
  inviteUrl: string;
  inviterName: string;
}) {
  return [
    `${args.inviterName} invited you to join ${args.groupName} on Split-It.`,
    args.groupDescription?.trim() ? args.groupDescription.trim() : null,
    `This single-use invite expires on ${formatInviteExpiry(args.expiresAt)}.`,
    "If a fresh invite is generated later, the previous pending link rotates out.",
    "",
    args.inviteUrl,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
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

    if (membership === null || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
      return null;
    }

    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const activeMemberships = groupMembers.filter(
      (member) => member.status === MEMBERSHIP_STATUS.ACTIVE,
    );
    const memberUsers = await Promise.all(activeMemberships.map((member) => ctx.db.get(member.userId)));
    const now = Date.now();
    const activeInvite =
      membership.role === GROUP_MEMBER_ROLE.OWNER
        ? await getPendingInviteForGroup(ctx, group._id, now)
        : null;

    return {
      groupId: group._id,
      groupName: group.name,
      groupDescription: group.description,
      groupCurrency: group.currency,
      currentUserRole: membership.role,
      canInvite: membership.role === GROUP_MEMBER_ROLE.OWNER,
      inviteEmailEnabled: isInviteEmailEnabled(),
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

          if (left.role === GROUP_MEMBER_ROLE.OWNER && right.role !== GROUP_MEMBER_ROLE.OWNER) {
            return -1;
          }

          if (left.role !== GROUP_MEMBER_ROLE.OWNER && right.role === GROUP_MEMBER_ROLE.OWNER) {
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
    const activeMemberships = groupMembers.filter(
      (member) => member.status === MEMBERSHIP_STATUS.ACTIVE,
    );
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
        viewerMembership !== null && viewerMembership.status === MEMBERSHIP_STATUS.ACTIVE
          ? viewerMembership.role
          : null,
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

    assertGroupIsActive(group);

    const invite = await rotatePendingInviteForGroup(ctx, {
      groupId: group._id,
      invitedBy: user._id,
      now,
    });

    return {
      token: invite.token,
      expiresAt: invite.expiresAt,
    };
  },
});

export const sendEmailInvite = mutation({
  args: {
    groupId: v.id("groups"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, group } = await requireGroupOwner(ctx, args.groupId);

    assertGroupIsActive(group);
    requireInviteEmailConfig();

    const email = normalizeInviteEmail(args.email);
    const now = Date.now();
    const invite = await ensurePendingInviteForGroup(ctx, {
      email,
      groupId: group._id,
      invitedBy: user._id,
      now,
    });

    await ctx.scheduler.runAfter(0, internal.invites.deliverInviteEmail, {
      email,
      expiresAt: invite.expiresAt,
      groupDescription: group.description,
      groupName: group.name,
      inviterName: user.name,
      token: invite.token,
    });

    return {
      token: invite.token,
      expiresAt: invite.expiresAt,
      email,
    };
  },
});

export const deliverInviteEmail = internalAction({
  args: {
    email: v.string(),
    expiresAt: v.number(),
    groupDescription: v.optional(v.string()),
    groupName: v.string(),
    inviterName: v.string(),
    token: v.string(),
  },
  handler: async (_ctx, args) => {
    const { apiKey, from, appUrl } = requireInviteEmailConfig();
    const inviteUrl = buildInviteUrl(args.token, appUrl);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.email],
        subject: `${args.inviterName} invited you to join ${args.groupName}`,
        html: buildInviteEmailHtml({
          expiresAt: args.expiresAt,
          groupDescription: args.groupDescription,
          groupName: args.groupName,
          inviteUrl,
          inviterName: args.inviterName,
        }),
        text: buildInviteEmailText({
          expiresAt: args.expiresAt,
          groupDescription: args.groupDescription,
          groupName: args.groupName,
          inviteUrl,
          inviterName: args.inviterName,
        }),
      }),
    });

    if (!response.ok) {
      const details = await response.text();

      throw new Error(
        `Resend rejected the invite email (${response.status}): ${details.slice(0, 240)}`,
      );
    }

    return {
      email: args.email,
      token: args.token,
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

    if (inviteStatus === INVITE_STATUS.ACCEPTED) {
      throw new ConvexError("This invite link has already been used");
    }

    if (inviteStatus === INVITE_STATUS.EXPIRED) {
      if (invite.status === INVITE_STATUS.PENDING) {
        await ctx.db.patch(invite._id, { status: INVITE_STATUS.EXPIRED });
      }

      throw new ConvexError("This invite link has expired");
    }

    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", user._id))
      .unique();

    if (existingMembership !== null && existingMembership.status === MEMBERSHIP_STATUS.ACTIVE) {
      return {
        groupId: group._id,
        groupName: group.name,
        alreadyMember: true,
      };
    }

    if (existingMembership !== null) {
      await ctx.db.patch(existingMembership._id, {
        role: existingMembership.role,
        status: MEMBERSHIP_STATUS.ACTIVE,
        joinedAt: now,
      });
    } else {
      await ctx.db.insert("groupMembers", {
        groupId: group._id,
        userId: user._id,
        role: GROUP_MEMBER_ROLE.MEMBER,
        status: MEMBERSHIP_STATUS.ACTIVE,
        joinedAt: now,
      });
    }

    await ctx.db.patch(invite._id, {
      acceptedBy: user._id,
      status: INVITE_STATUS.ACCEPTED,
    });

    return {
      groupId: group._id,
      groupName: group.name,
      alreadyMember: false,
    };
  },
});

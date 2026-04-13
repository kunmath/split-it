import { ConvexError, v } from "convex/values";

import type { Id, Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";

const GROUP_ICON_KEYS = ["home", "plane", "utensils", "cart", "mountain", "fuel"] as const;
const groupIconKey = v.union(
  v.literal("home"),
  v.literal("plane"),
  v.literal("utensils"),
  v.literal("cart"),
  v.literal("mountain"),
  v.literal("fuel"),
);

type GroupIconKey = (typeof GROUP_ICON_KEYS)[number];
type GroupDashboardRecord = {
  group: Doc<"groups">;
  membership: Doc<"groupMembers">;
  memberCount: number;
  expenseCount: number;
  balanceCents: number;
};
type GroupsCtx = QueryCtx | MutationCtx;

function isGroupIconKey(value: string | undefined): value is GroupIconKey {
  return value !== undefined && GROUP_ICON_KEYS.includes(value as GroupIconKey);
}

function getDefaultIconKey(seed: string) {
  const total = Array.from(seed).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return GROUP_ICON_KEYS[total % GROUP_ICON_KEYS.length] ?? "home";
}

function sanitizeGroupName(value: string) {
  const name = value.trim();

  if (name.length < 2) {
    throw new ConvexError("Group name must be at least 2 characters");
  }

  if (name.length > 60) {
    throw new ConvexError("Group name must be 60 characters or fewer");
  }

  return name;
}

function sanitizeGroupDescription(value: string | undefined) {
  const description = value?.trim();

  if (!description) {
    return undefined;
  }

  if (description.length > 140) {
    throw new ConvexError("Group description must be 140 characters or fewer");
  }

  return description;
}

function sanitizeCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase() || "USD";

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new ConvexError("Currency must be a 3-letter ISO code");
  }

  return normalized;
}

async function getActiveGroupRecords(
  ctx: GroupsCtx,
  userId: Id<"users">,
): Promise<GroupDashboardRecord[]> {
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  const groups = await Promise.all(
    activeMemberships.map(async (membership) => {
      const group = await ctx.db.get(membership.groupId);

      if (group === null || group.archivedAt !== undefined) {
        return null;
      }

      const [groupMembers, groupExpenses, userShares] = await Promise.all([
        ctx.db.query("groupMembers").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
        ctx.db.query("expenses").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
        ctx.db
          .query("expenseShares")
          .withIndex("by_group_user", (q) => q.eq("groupId", group._id).eq("userId", userId))
          .collect(),
      ]);

      const memberCount = groupMembers.filter((member) => member.status === "active").length;
      const paidByCurrentUserCents = groupExpenses.reduce((sum, expense) => {
        return expense.paidBy === userId ? sum + expense.amountCents : sum;
      }, 0);
      const owedByCurrentUserCents = userShares.reduce((sum, share) => sum + share.shareCents, 0);

      return {
        group,
        membership,
        memberCount,
        expenseCount: groupExpenses.length,
        balanceCents: paidByCurrentUserCents - owedByCurrentUserCents,
      };
    }),
  );

  return groups
    .filter((group): group is GroupDashboardRecord => group !== null)
    .sort((left, right) => right.group.createdAt - left.group.createdAt);
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    currency: v.optional(v.string()),
    iconKey: v.optional(groupIconKey),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const name = sanitizeGroupName(args.name);
    const description = sanitizeGroupDescription(args.description);
    const currency = sanitizeCurrency(args.currency);
    const iconKey = args.iconKey ?? getDefaultIconKey(name);

    const groupId = await ctx.db.insert("groups", {
      name,
      description,
      currency,
      createdBy: user._id,
      createdAt: now,
      iconKey,
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: "owner",
      status: "active",
      joinedAt: now,
    });

    return groupId;
  },
});

export const listActiveForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const groups = await getActiveGroupRecords(ctx, user._id);

    return groups.map((item) => ({
      _id: item.group._id,
      name: item.group.name,
      description: item.group.description,
      currency: item.group.currency,
      iconKey: isGroupIconKey(item.group.iconKey) ? item.group.iconKey : getDefaultIconKey(item.group.name),
      memberCount: item.memberCount,
      expenseCount: item.expenseCount,
      balanceCents: item.balanceCents,
      role: item.membership.role,
      createdAt: item.group.createdAt,
    }));
  },
});

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const groups = await getActiveGroupRecords(ctx, user._id);

    let overallYouAreOwedCents = 0;
    let totalYouOweCents = 0;

    for (const group of groups) {
      if (group.balanceCents > 0) {
        overallYouAreOwedCents += group.balanceCents;
        continue;
      }

      if (group.balanceCents < 0) {
        totalYouOweCents += Math.abs(group.balanceCents);
      }
    }

    return {
      overallYouAreOwedCents,
      totalYouOweCents,
      activeGroupCount: groups.length,
    };
  },
});

import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
  buildMemberBalanceSnapshots,
  createBalanceSnapshot,
  getCurrentUserBalanceSnapshot,
  getCurrentUserExpenseNetCents,
  getExpenseIconKey,
  getGroupExpenseRecords,
  type GroupExpenseRecord,
} from "./lib/expenseHelpers";

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

function resolveGroupIconKey(group: Doc<"groups">) {
  return isGroupIconKey(group.iconKey) ? group.iconKey : getDefaultIconKey(group.name);
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

      const balanceSnapshot = getCurrentUserBalanceSnapshot(groupExpenses, userShares, userId);

      return {
        group,
        membership,
        memberCount: groupMembers.filter((member) => member.status === "active").length,
        expenseCount: groupExpenses.length,
        balanceCents: balanceSnapshot.balanceCents,
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
      iconKey: resolveGroupIconKey(item.group),
      memberCount: item.memberCount,
      expenseCount: item.expenseCount,
      balanceCents: item.balanceCents,
      role: item.membership.role,
      createdAt: item.group.createdAt,
    }));
  },
});

export const getDetail = query({
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

    const activeMemberships = (
      await ctx.db.query("groupMembers").withIndex("by_group", (q) => q.eq("groupId", args.groupId)).collect()
    ).filter((member) => member.status === "active");
    const memberUsers = await Promise.all(activeMemberships.map((member) => ctx.db.get(member.userId)));
    const expenseRecords = await getGroupExpenseRecords(ctx, args.groupId);
    const memberBalanceSnapshots = buildMemberBalanceSnapshots(
      activeMemberships.map((member) => member.userId),
      expenseRecords,
    );
    const userLookup = new Map<Id<"users">, Doc<"users">>();

    activeMemberships.forEach((member, index) => {
      const memberUser = memberUsers[index];
      if (memberUser !== null) {
        userLookup.set(member.userId, memberUser);
      }
    });

    const totalSpendCents = expenseRecords.reduce((sum, record) => sum + record.expense.amountCents, 0);
    const largestExpenseRecord =
      expenseRecords.reduce<GroupExpenseRecord | null>((largest, record) => {
        if (largest === null || record.expense.amountCents > largest.expense.amountCents) {
          return record;
        }

        return largest;
      }, null) ?? null;
    const currentUserStanding = memberBalanceSnapshots.get(user._id) ?? createBalanceSnapshot(0, 0);
    const resolvedIconKey = resolveGroupIconKey(group);

    const members = activeMemberships
      .map((member) => {
        const memberUser = userLookup.get(member.userId);
        const snapshot = memberBalanceSnapshots.get(member.userId) ?? createBalanceSnapshot(0, 0);

        return {
          id: member.userId,
          name: memberUser?.name ?? "Group member",
          email: memberUser?.email ?? "",
          imageUrl: memberUser?.imageUrl,
          role: member.role,
          isCurrentUser: member.userId === user._id,
          joinedAt: member.joinedAt ?? null,
          paidCents: snapshot.paidCents,
          owedCents: snapshot.owedCents,
          balanceCents: snapshot.balanceCents,
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
      });

    return {
      groupId: group._id,
      groupName: group.name,
      groupDescription: group.description,
      groupCurrency: group.currency,
      iconKey: resolvedIconKey,
      coverImageUrl: group.coverImageUrl,
      createdAt: group.createdAt,
      memberCount: members.length,
      expenseCount: expenseRecords.length,
      currentStanding: currentUserStanding,
      members,
      recentExpenses: expenseRecords.slice(0, 5).map((record) => ({
        id: record.expense._id,
        description: record.expense.description,
        amountCents: record.expense.amountCents,
        expenseAt: record.expense.expenseAt,
        paidByName: userLookup.get(record.expense.paidBy)?.name ?? "Group member",
        paidByCurrentUser: record.expense.paidBy === user._id,
        currentUserNetCents: getCurrentUserExpenseNetCents(record, user._id),
        splitType: record.expense.splitType,
        participantCount: record.shares.length,
        iconKey: getExpenseIconKey(record.expense.description, resolvedIconKey),
      })),
      insights: {
        totalSpendCents,
        averageExpenseCents:
          expenseRecords.length === 0 ? 0 : Math.round(totalSpendCents / expenseRecords.length),
        largestExpenseCents: largestExpenseRecord?.expense.amountCents ?? 0,
        largestExpenseLabel: largestExpenseRecord?.expense.description ?? null,
        topContributors: members
          .filter((member) => member.paidCents > 0)
          .sort((left, right) => right.paidCents - left.paidCents)
          .slice(0, 3)
          .map((member) => ({
            id: member.id,
            name: member.name,
            paidCents: member.paidCents,
            percentOfSpend:
              totalSpendCents === 0 ? 0 : Math.max(1, Math.round((member.paidCents / totalSpendCents) * 100)),
          })),
      },
    };
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

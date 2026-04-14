import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  getCurrentUserExpenseNetCents,
  getGroupExpenseRecords,
} from "./lib/expense-helpers";
import { splitEvenly } from "./lib/money";
import { requireGroupMember } from "./lib/permissions";

function assertGroupIsAvailable(group: Doc<"groups">) {
  if (group.archivedAt !== undefined) {
    throw new ConvexError("Group is archived");
  }
}

function sanitizeDescription(value: string) {
  const description = value.trim();

  if (description.length < 2) {
    throw new ConvexError("Description must be at least 2 characters");
  }

  if (description.length > 120) {
    throw new ConvexError("Description must be 120 characters or fewer");
  }

  return description;
}

function sanitizeNotes(value: string | undefined) {
  const notes = value?.trim();

  if (!notes) {
    return undefined;
  }

  if (notes.length > 500) {
    throw new ConvexError("Notes must be 500 characters or fewer");
  }

  return notes;
}

function validateAmountCents(value: number) {
  if (!Number.isSafeInteger(value)) {
    throw new ConvexError("Amount must be a safe integer number of cents");
  }

  if (value <= 0) {
    throw new ConvexError("Amount must be greater than zero");
  }

  return value;
}

function validateExpenseTimestamp(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConvexError("Expense date is invalid");
  }

  return value;
}

function normalizeParticipantIds(participantIds: Id<"users">[]) {
  const normalized: Id<"users">[] = [];
  const seen = new Set<Id<"users">>();

  for (const participantId of participantIds) {
    if (seen.has(participantId)) {
      continue;
    }

    seen.add(participantId);
    normalized.push(participantId);
  }

  if (normalized.length === 0) {
    throw new ConvexError("Select at least one participant");
  }

  return normalized;
}

async function getActiveMemberProfiles(
  ctx: Parameters<typeof requireGroupMember>[0],
  groupId: Id<"groups">,
) {
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  const activeMemberships = memberships.filter((membership) => membership.status === "active");
  const users = await Promise.all(activeMemberships.map((membership) => ctx.db.get(membership.userId)));

  return activeMemberships
    .map((membership, index) => {
      const user = users[index];

      if (user === null) {
        return null;
      }

      return {
        membership,
        user,
      };
    })
    .filter((member): member is { membership: Doc<"groupMembers">; user: Doc<"users"> } => member !== null);
}

function sortMembersForComposer(
  members: Array<{
    membership: Doc<"groupMembers">;
    user: Doc<"users">;
    isCurrentUser: boolean;
  }>,
) {
  return members.sort((left, right) => {
    if (left.isCurrentUser && !right.isCurrentUser) {
      return -1;
    }

    if (!left.isCurrentUser && right.isCurrentUser) {
      return 1;
    }

    if (left.membership.role === "owner" && right.membership.role !== "owner") {
      return -1;
    }

    if (left.membership.role !== "owner" && right.membership.role === "owner") {
      return 1;
    }

    return left.user.name.localeCompare(right.user.name);
  });
}

export const getComposerData = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    let access: Awaited<ReturnType<typeof requireGroupMember>>;

    try {
      access = await requireGroupMember(ctx, args.groupId);
    } catch {
      return null;
    }

    if (access.group.archivedAt !== undefined) {
      return null;
    }

    const activeMembers = sortMembersForComposer(
      (await getActiveMemberProfiles(ctx, args.groupId)).map((member) => ({
        ...member,
        isCurrentUser: member.user._id === access.user._id,
      })),
    );

    return {
      groupId: access.group._id,
      groupName: access.group.name,
      groupCurrency: access.group.currency,
      members: activeMembers.map((member) => ({
        id: member.user._id,
        name: member.user.name,
        email: member.user.email,
        imageUrl: member.user.imageUrl,
        role: member.membership.role,
        isCurrentUser: member.user._id === access.user._id,
      })),
    };
  },
});

export const listForGroup = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    let access: Awaited<ReturnType<typeof requireGroupMember>>;

    try {
      access = await requireGroupMember(ctx, args.groupId);
    } catch {
      return null;
    }

    if (access.group.archivedAt !== undefined) {
      return null;
    }

    const activeMembers = await getActiveMemberProfiles(ctx, args.groupId);
    const userLookup = new Map<Id<"users">, Doc<"users">>();

    for (const member of activeMembers) {
      userLookup.set(member.user._id, member.user);
    }

    const expenseRecords = await getGroupExpenseRecords(ctx, args.groupId);

    return {
      groupId: access.group._id,
      groupName: access.group.name,
      groupCurrency: access.group.currency,
      expenses: expenseRecords.map((record) => ({
        id: record.expense._id,
        description: record.expense.description,
        amountCents: record.expense.amountCents,
        expenseAt: record.expense.expenseAt,
        paidById: record.expense.paidBy,
        paidByName: userLookup.get(record.expense.paidBy)?.name ?? "Group member",
        paidByCurrentUser: record.expense.paidBy === access.user._id,
        splitType: record.expense.splitType,
        notes: record.expense.notes,
        participantCount: record.shares.length,
        currentUserNetCents: getCurrentUserExpenseNetCents(record, access.user._id),
        shares: record.shares.map((share) => ({
          userId: share.userId,
          name: userLookup.get(share.userId)?.name ?? "Group member",
          shareCents: share.shareCents,
          isCurrentUser: share.userId === access.user._id,
        })),
      })),
    };
  },
});

export const createEqualSplit = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amountCents: v.number(),
    paidBy: v.id("users"),
    participantIds: v.array(v.id("users")),
    expenseAt: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireGroupMember(ctx, args.groupId);
    assertGroupIsAvailable(access.group);
    const description = sanitizeDescription(args.description);
    const notes = sanitizeNotes(args.notes);
    const amountCents = validateAmountCents(args.amountCents);
    const expenseAt = validateExpenseTimestamp(args.expenseAt);
    const participantIds = normalizeParticipantIds(args.participantIds);
    const activeMembers = await getActiveMemberProfiles(ctx, args.groupId);
    const activeUserIds = new Set(activeMembers.map((member) => member.user._id));

    if (!activeUserIds.has(args.paidBy)) {
      throw new ConvexError("Selected payer must be an active group member");
    }

    for (const participantId of participantIds) {
      if (!activeUserIds.has(participantId)) {
        throw new ConvexError("All selected participants must be active group members");
      }
    }

    const shareCents = splitEvenly(amountCents, participantIds);
    const shareTotal = shareCents.reduce((sum, share) => sum + share, 0);

    if (shareTotal !== amountCents) {
      throw new ConvexError("Equal split shares must sum exactly to the expense amount");
    }

    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      description,
      amountCents,
      paidBy: args.paidBy,
      splitType: "equal",
      expenseAt,
      createdBy: access.user._id,
      notes,
    });

    await Promise.all(
      participantIds.map((participantId, index) => {
        return ctx.db.insert("expenseShares", {
          expenseId,
          groupId: args.groupId,
          userId: participantId,
          shareCents: shareCents[index] ?? 0,
        });
      }),
    );

    return expenseId;
  },
});

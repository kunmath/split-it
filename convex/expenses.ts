import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  getCurrentUserExpenseNetCents,
  getGroupExpenseRecords,
} from "./lib/expenseHelpers";
import { splitEvenly } from "./lib/money";
import {
  requireExpenseEditPermission,
  requireGroupMember,
} from "./lib/permissions";

const exactShareValidator = v.object({
  userId: v.id("users"),
  shareCents: v.number(),
});

type ShareRow = {
  userId: Id<"users">;
  shareCents: number;
};

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

function normalizeExactShares(shares: ShareRow[]) {
  const normalized: ShareRow[] = [];
  const seen = new Set<Id<"users">>();

  for (const share of shares) {
    if (seen.has(share.userId)) {
      continue;
    }

    if (!Number.isSafeInteger(share.shareCents)) {
      throw new ConvexError("Exact split amounts must be safe integer cents");
    }

    if (share.shareCents <= 0) {
      throw new ConvexError("Exact split amounts must be greater than zero");
    }

    seen.add(share.userId);
    normalized.push(share);
  }

  if (normalized.length === 0) {
    throw new ConvexError("Add at least one exact split amount");
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
  const activeMemberships = memberships.filter(
    (membership) => membership.status === "active",
  );
  const users = await Promise.all(
    activeMemberships.map((membership) => ctx.db.get(membership.userId)),
  );

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
    .filter(
      (
        member,
      ): member is { membership: Doc<"groupMembers">; user: Doc<"users"> } =>
        member !== null,
    );
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

function validateActiveGroupMemberIds(
  activeUserIds: Set<Id<"users">>,
  payerId: Id<"users">,
  participantIds: Id<"users">[],
) {
  if (!activeUserIds.has(payerId)) {
    throw new ConvexError("Selected payer must be an active group member");
  }

  for (const participantId of participantIds) {
    if (!activeUserIds.has(participantId)) {
      throw new ConvexError(
        "All selected participants must be active group members",
      );
    }
  }
}

function assertShareTotalMatchesAmount(
  shareRows: ShareRow[],
  amountCents: number,
  splitType: "equal" | "exact",
) {
  const shareTotal = shareRows.reduce((sum, share) => sum + share.shareCents, 0);

  if (shareTotal !== amountCents) {
    throw new ConvexError(
      splitType === "equal"
        ? "Equal split shares must sum exactly to the expense amount"
        : "Exact split shares must sum exactly to the expense amount",
    );
  }
}

async function buildValidatedShareRows(
  ctx: Parameters<typeof requireGroupMember>[0],
  groupId: Id<"groups">,
  payerId: Id<"users">,
  amountCents: number,
  splitType: "equal" | "exact",
  participantIds: Id<"users">[] | undefined,
  exactShares: ShareRow[] | undefined,
) {
  const activeMembers = await getActiveMemberProfiles(ctx, groupId);
  const activeUserIds = new Set(activeMembers.map((member) => member.user._id));

  if (splitType === "equal") {
    const normalizedParticipantIds = normalizeParticipantIds(participantIds ?? []);
    validateActiveGroupMemberIds(
      activeUserIds,
      payerId,
      normalizedParticipantIds,
    );

    const shareCents = splitEvenly(amountCents, normalizedParticipantIds);
    const shareRows = normalizedParticipantIds.map((participantId, index) => ({
      userId: participantId,
      shareCents: shareCents[index] ?? 0,
    }));

    assertShareTotalMatchesAmount(shareRows, amountCents, "equal");
    return shareRows;
  }

  const normalizedExactShares = normalizeExactShares(exactShares ?? []);
  validateActiveGroupMemberIds(
    activeUserIds,
    payerId,
    normalizedExactShares.map((share) => share.userId),
  );
  assertShareTotalMatchesAmount(normalizedExactShares, amountCents, "exact");

  return normalizedExactShares;
}

async function replaceExpenseShares(
  ctx: MutationCtx,
  expenseId: Id<"expenses">,
  groupId: Id<"groups">,
  shareRows: ShareRow[],
) {
  const existingShares = await ctx.db
    .query("expenseShares")
    .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
    .collect();

  await Promise.all(existingShares.map((share) => ctx.db.delete(share._id)));

  await Promise.all(
    shareRows.map((share) =>
      ctx.db.insert("expenseShares", {
        expenseId,
        groupId,
        userId: share.userId,
        shareCents: share.shareCents,
      }),
    ),
  );
}

export const getComposerData = query({
  args: {
    groupId: v.id("groups"),
    expenseId: v.optional(v.id("expenses")),
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

    let expense: Doc<"expenses"> | null = null;
    let expenseShares: Doc<"expenseShares">[] = [];

    if (args.expenseId !== undefined) {
      try {
        const editAccess = await requireExpenseEditPermission(ctx, args.expenseId);

        if (editAccess.expense.groupId !== args.groupId) {
          return null;
        }

        expense = editAccess.expense;
        expenseShares = await ctx.db
          .query("expenseShares")
          .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId!))
          .collect();
      } catch {
        return null;
      }
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
      expense:
        expense === null
          ? null
          : {
              id: expense._id,
              description: expense.description,
              amountCents: expense.amountCents,
              paidBy: expense.paidBy,
              splitType: expense.splitType,
              expenseAt: expense.expenseAt,
              notes: expense.notes,
              shares: expenseShares.map((share) => ({
                userId: share.userId,
                shareCents: share.shareCents,
              })),
            },
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
        kind: record.expense.kind ?? ("expense" as const),
        notes: record.expense.notes,
        participantCount: record.shares.length,
        currentUserNetCents: getCurrentUserExpenseNetCents(
          record,
          access.user._id,
        ),
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

export const createExpense = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amountCents: v.number(),
    paidBy: v.id("users"),
    splitType: v.union(v.literal("equal"), v.literal("exact")),
    participantIds: v.optional(v.array(v.id("users"))),
    exactShares: v.optional(v.array(exactShareValidator)),
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
    const shareRows = await buildValidatedShareRows(
      ctx,
      args.groupId,
      args.paidBy,
      amountCents,
      args.splitType,
      args.participantIds,
      args.exactShares,
    );

    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      description,
      amountCents,
      paidBy: args.paidBy,
      splitType: args.splitType,
      expenseAt,
      createdBy: access.user._id,
      notes,
    });

    await replaceExpenseShares(ctx, expenseId, args.groupId, shareRows);

    return expenseId;
  },
});

export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    description: v.string(),
    amountCents: v.number(),
    paidBy: v.id("users"),
    splitType: v.union(v.literal("equal"), v.literal("exact")),
    participantIds: v.optional(v.array(v.id("users"))),
    exactShares: v.optional(v.array(exactShareValidator)),
    expenseAt: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireExpenseEditPermission(ctx, args.expenseId);
    const group = await ctx.db.get(access.expense.groupId);

    if (group === null) {
      throw new ConvexError("Group not found");
    }

    assertGroupIsAvailable(group);

    const description = sanitizeDescription(args.description);
    const notes = sanitizeNotes(args.notes);
    const amountCents = validateAmountCents(args.amountCents);
    const expenseAt = validateExpenseTimestamp(args.expenseAt);
    const shareRows = await buildValidatedShareRows(
      ctx,
      access.expense.groupId,
      args.paidBy,
      amountCents,
      args.splitType,
      args.participantIds,
      args.exactShares,
    );

    await ctx.db.replace(args.expenseId, {
      groupId: access.expense.groupId,
      description,
      amountCents,
      paidBy: args.paidBy,
      splitType: args.splitType,
      expenseAt,
      createdBy: access.expense.createdBy,
      updatedAt: Date.now(),
      notes,
    });
    await replaceExpenseShares(
      ctx,
      args.expenseId,
      access.expense.groupId,
      shareRows,
    );

    return args.expenseId;
  },
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const access = await requireExpenseEditPermission(ctx, args.expenseId);
    const group = await ctx.db.get(access.expense.groupId);

    if (group === null) {
      throw new ConvexError("Group not found");
    }

    assertGroupIsAvailable(group);

    const existingShares = await ctx.db
      .query("expenseShares")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(existingShares.map((share) => ctx.db.delete(share._id)));
    await ctx.db.delete(args.expenseId);

    return {
      expenseId: args.expenseId,
      groupId: access.expense.groupId,
    };
  },
});

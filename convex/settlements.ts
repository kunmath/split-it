import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireGroupMember } from "./lib/permissions";

function assertGroupIsActive(group: Doc<"groups">) {
  if (group.archivedAt !== undefined) {
    throw new ConvexError("Group is archived");
  }
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

function sanitizeNote(value: string | undefined) {
  const note = value?.trim();

  if (!note) {
    return undefined;
  }

  if (note.length > 200) {
    throw new ConvexError("Note must be 200 characters or fewer");
  }

  return note;
}

export const create = mutation({
  args: {
    groupId: v.id("groups"),
    toUserId: v.id("users"),
    amountCents: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireGroupMember(ctx, args.groupId);
    assertGroupIsActive(access.group);

    if (args.toUserId === access.user._id) {
      throw new ConvexError("You cannot settle a payment with yourself");
    }

    const counterpartyMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.toUserId),
      )
      .unique();

    if (counterpartyMembership === null || counterpartyMembership.status !== "active") {
      throw new ConvexError("Counterparty must be an active group member");
    }

    const amountCents = validateAmountCents(args.amountCents);
    const note = sanitizeNote(args.note);
    const now = Date.now();

    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      description: "Settlement",
      amountCents,
      paidBy: access.user._id,
      splitType: "exact",
      kind: "settlement",
      expenseAt: now,
      createdBy: access.user._id,
      notes: note,
    });

    await ctx.db.insert("expenseShares", {
      expenseId,
      groupId: args.groupId,
      userId: args.toUserId,
      shareCents: amountCents,
    });

    return expenseId;
  },
});

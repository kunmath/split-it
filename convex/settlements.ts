import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { logExpenseEvent } from "./lib/activityEvents";
import { applyExpenseToAggregates } from "./lib/balances";
import { requireGroupMember } from "./lib/permissions";
import { assertGroupIsActive, validateAmountCents } from "./lib/validate";

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
    /** Defaults to the current user. Set it to record a payment the current user received. */
    fromUserId: v.optional(v.id("users")),
    amountCents: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await requireGroupMember(ctx, args.groupId);
    assertGroupIsActive(access.group);

    const fromUserId = args.fromUserId ?? access.user._id;

    // Members may only record payments they are a party to: either they paid,
    // or they are the recipient confirming money they received.
    if (fromUserId !== access.user._id && args.toUserId !== access.user._id) {
      throw new ConvexError("You can only record payments you sent or received");
    }

    if (args.toUserId === fromUserId) {
      throw new ConvexError("You cannot settle a payment with yourself");
    }

    const counterpartyId = fromUserId === access.user._id ? args.toUserId : fromUserId;
    const counterpartyMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", counterpartyId),
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
      paidBy: fromUserId,
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

    await applyExpenseToAggregates(ctx, {
      groupId: args.groupId,
      kind: "settlement",
      amountCents,
      paidBy: fromUserId,
      shares: [{ userId: args.toUserId, shareCents: amountCents }],
      direction: 1,
    });
    await logExpenseEvent(ctx, "created", {
      actorUserId: access.user._id,
      expense: {
        _id: expenseId,
        groupId: args.groupId,
        description: "Settlement",
        amountCents,
        paidBy: fromUserId,
        kind: "settlement",
      },
      shares: [{ userId: args.toUserId, shareCents: amountCents }],
    });

    return expenseId;
  },
});

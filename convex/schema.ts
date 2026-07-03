import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const groupMemberRole = v.union(v.literal("owner"), v.literal("member"));
const activityEventType = v.union(
  v.literal("expense.created"),
  v.literal("expense.updated"),
  v.literal("expense.deleted"),
  v.literal("settlement.recorded"),
  v.literal("settlement.deleted"),
  v.literal("member.joined"),
  v.literal("member.left"),
  v.literal("member.removed"),
);
const groupMemberStatus = v.union(v.literal("active"), v.literal("invited"));
const inviteStatus = v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"));
const expenseKind = v.union(v.literal("expense"), v.literal("settlement"));
const expenseSplitType = v.union(v.literal("equal"), v.literal("exact"), v.literal("shares"));

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkUserId: v.string(),
    avatarKey: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    profileCompletedAt: v.optional(v.number()),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"]),

  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    currency: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    coverImageUrl: v.optional(v.string()),
    iconKey: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_archived_at", ["archivedAt"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: groupMemberRole,
    status: groupMemberStatus,
    joinedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  groupInvites: defineTable({
    groupId: v.id("groups"),
    email: v.optional(v.string()),
    token: v.string(),
    invitedBy: v.id("users"),
    status: inviteStatus,
    expiresAt: v.number(),
    acceptedBy: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_group", ["groupId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    description: v.string(),
    amountCents: v.number(),
    kind: v.optional(expenseKind),
    paidBy: v.id("users"),
    splitType: expenseSplitType,
    expenseAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "expenseAt"])
    .index("by_group_amount", ["groupId", "amountCents"]),

  expenseShares: defineTable({
    expenseId: v.id("expenses"),
    groupId: v.id("groups"),
    userId: v.id("users"),
    shareCents: v.number(),
  })
    .index("by_expense", ["expenseId"])
    .index("by_group_user", ["groupId", "userId"]),

  // Running per-member totals, updated in the same transaction as every
  // expense/settlement write so balances never require a full expense scan.
  memberBalances: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    paidCents: v.number(),
    owedCents: v.number(),
    // Paid excluding settlements; used for spend insights.
    spendPaidCents: v.number(),
  })
    .index("by_group_user", ["groupId", "userId"])
    .index("by_group", ["groupId"]),

  groupStats: defineTable({
    groupId: v.id("groups"),
    expenseCount: v.number(),
    // Counts and totals excluding settlements.
    spendCount: v.number(),
    totalSpendCents: v.number(),
  }).index("by_group", ["groupId"]),

  // Append-only audit trail. Events snapshot everything the feed needs, so
  // history survives expense edits and deletes and never requires scanning
  // the expenses table.
  activityEvents: defineTable({
    groupId: v.id("groups"),
    actorUserId: v.id("users"),
    type: activityEventType,
    createdAt: v.number(),
    expenseId: v.optional(v.id("expenses")),
    description: v.optional(v.string()),
    amountCents: v.optional(v.number()),
    previousDescription: v.optional(v.string()),
    previousAmountCents: v.optional(v.number()),
    paidBy: v.optional(v.id("users")),
    counterpartyUserId: v.optional(v.id("users")),
    shares: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          shareCents: v.number(),
        }),
      ),
    ),
    memberUserId: v.optional(v.id("users")),
  })
    .index("by_group_time", ["groupId", "createdAt"])
    .index("by_expense", ["expenseId"]),
});

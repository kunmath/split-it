import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const groupMemberRole = v.union(v.literal("owner"), v.literal("member"));
const groupMemberStatus = v.union(v.literal("active"), v.literal("invited"));
const inviteStatus = v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired"));
const expenseSplitType = v.union(v.literal("equal"), v.literal("exact"));

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkUserId: v.string(),
    imageUrl: v.optional(v.string()),
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
    paidBy: v.id("users"),
    splitType: expenseSplitType,
    expenseAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "expenseAt"]),

  expenseShares: defineTable({
    expenseId: v.id("expenses"),
    groupId: v.id("groups"),
    userId: v.id("users"),
    shareCents: v.number(),
  })
    .index("by_expense", ["expenseId"])
    .index("by_group_user", ["groupId", "userId"]),
});

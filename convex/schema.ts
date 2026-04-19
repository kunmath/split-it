import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  EXPENSE_KIND,
  EXPENSE_SPLIT_TYPE,
  GROUP_MEMBER_ROLE,
  INVITE_STATUS,
  MEMBERSHIP_STATUS,
} from "./lib/constants";

const groupMemberRole = v.union(
  v.literal(GROUP_MEMBER_ROLE.OWNER),
  v.literal(GROUP_MEMBER_ROLE.MEMBER),
);
const groupMemberStatus = v.union(
  v.literal(MEMBERSHIP_STATUS.ACTIVE),
  v.literal(MEMBERSHIP_STATUS.INVITED),
);
const inviteStatus = v.union(
  v.literal(INVITE_STATUS.PENDING),
  v.literal(INVITE_STATUS.ACCEPTED),
  v.literal(INVITE_STATUS.EXPIRED),
);
const expenseKind = v.union(
  v.literal(EXPENSE_KIND.EXPENSE),
  v.literal(EXPENSE_KIND.SETTLEMENT),
);
const expenseSplitType = v.union(
  v.literal(EXPENSE_SPLIT_TYPE.EQUAL),
  v.literal(EXPENSE_SPLIT_TYPE.EXACT),
);

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

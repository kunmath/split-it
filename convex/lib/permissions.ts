import { ConvexError } from "convex/values";

import type { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireUser } from "./auth";
import { GROUP_MEMBER_ROLE, MEMBERSHIP_STATUS } from "./constants";

type PermissionCtx = QueryCtx | MutationCtx;

type GroupAccess = {
  user: Doc<"users">;
  group: Doc<"groups">;
  membership: Doc<"groupMembers">;
};

type ExpenseEditAccess = {
  user: Doc<"users">;
  expense: Doc<"expenses">;
  membership: Doc<"groupMembers">;
};

export async function requireGroupMember(
  ctx: PermissionCtx,
  groupId: Id<"groups">,
): Promise<GroupAccess> {
  const user = await requireUser(ctx);
  const group = await ctx.db.get(groupId);

  if (group === null) {
    throw new ConvexError("Group not found");
  }

  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", user._id))
    .unique();

  if (membership === null || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    throw new ConvexError("Active group membership required");
  }

  return { user, group, membership };
}

export async function requireGroupOwner(
  ctx: PermissionCtx,
  groupId: Id<"groups">,
): Promise<GroupAccess> {
  const access = await requireGroupMember(ctx, groupId);

  if (access.membership.role !== GROUP_MEMBER_ROLE.OWNER) {
    throw new ConvexError("Group owner permission required");
  }

  return access;
}

export async function requireExpenseEditPermission(
  ctx: PermissionCtx,
  expenseId: Id<"expenses">,
): Promise<ExpenseEditAccess> {
  const user = await requireUser(ctx);
  const expense = await ctx.db.get(expenseId);

  if (expense === null) {
    throw new ConvexError("Expense not found");
  }

  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) => q.eq("groupId", expense.groupId).eq("userId", user._id))
    .unique();

  if (membership === null || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    throw new ConvexError("Active group membership required");
  }

  if (expense.createdBy !== user._id && membership.role !== GROUP_MEMBER_ROLE.OWNER) {
    throw new ConvexError("Expense edit permission required");
  }

  return { user, expense, membership };
}

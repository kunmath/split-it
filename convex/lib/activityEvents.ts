import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type ShareSnapshot = { userId: Id<"users">; shareCents: number };

type ExpenseEventArgs = {
  actorUserId: Id<"users">;
  expense: Pick<
    Doc<"expenses">,
    "groupId" | "description" | "amountCents" | "paidBy" | "kind"
  > & { _id?: Id<"expenses"> };
  shares: ShareSnapshot[];
  previousDescription?: string;
  previousAmountCents?: number;
  createdAt?: number;
};

function shareSnapshots(shares: ShareSnapshot[]): ShareSnapshot[] {
  return shares.map((share) => ({ userId: share.userId, shareCents: share.shareCents }));
}

export async function logExpenseEvent(
  ctx: MutationCtx,
  action: "created" | "updated" | "deleted",
  args: ExpenseEventArgs,
) {
  const isSettlement = args.expense.kind === "settlement";
  const type = isSettlement
    ? action === "deleted"
      ? ("settlement.deleted" as const)
      : ("settlement.recorded" as const)
    : (`expense.${action}` as const);

  await ctx.db.insert("activityEvents", {
    groupId: args.expense.groupId,
    actorUserId: args.actorUserId,
    type,
    createdAt: args.createdAt ?? Date.now(),
    expenseId: args.expense._id,
    description: args.expense.description,
    amountCents: args.expense.amountCents,
    previousDescription: args.previousDescription,
    previousAmountCents: args.previousAmountCents,
    paidBy: args.expense.paidBy,
    counterpartyUserId: isSettlement ? args.shares[0]?.userId : undefined,
    shares: shareSnapshots(args.shares),
  });
}

export async function logMemberEvent(
  ctx: MutationCtx,
  type: "member.joined" | "member.left" | "member.removed",
  args: {
    groupId: Id<"groups">;
    actorUserId: Id<"users">;
    memberUserId: Id<"users">;
  },
) {
  await ctx.db.insert("activityEvents", {
    groupId: args.groupId,
    actorUserId: args.actorUserId,
    type,
    createdAt: Date.now(),
    memberUserId: args.memberUserId,
  });
}

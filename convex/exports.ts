import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { getGroupExpenseRecords } from "./lib/expenseHelpers";
import { requireGroupMember } from "./lib/permissions";
import { EXPENSE_KIND } from "./lib/constants";

function formatExportAmount(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function formatExportDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(timestamp);
}

export const getGroupExpenseExport = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const access = await requireGroupMember(ctx, args.groupId);

    if (access.group.archivedAt !== undefined) {
      throw new ConvexError("Group is archived");
    }

    const expenseRecords = await getGroupExpenseRecords(ctx, args.groupId);
    const userIds = new Set<Id<"users">>();

    for (const record of expenseRecords) {
      userIds.add(record.expense.paidBy);

      for (const share of record.shares) {
        userIds.add(share.userId);
      }
    }

    const users = await Promise.all(Array.from(userIds, (userId) => ctx.db.get(userId)));
    const userLookup = new Map<Id<"users">, string>();

    Array.from(userIds).forEach((userId, index) => {
      userLookup.set(userId, users[index]?.name ?? "Group member");
    });

    return {
      groupId: access.group._id,
      groupName: access.group.name,
      currency: access.group.currency,
      generatedAt: Date.now(),
      rows: expenseRecords.map((record) => {
        const participants = record.shares.map(
          (share) => userLookup.get(share.userId) ?? "Group member",
        );

        return {
          group_name: access.group.name,
          currency: access.group.currency,
          expense_date: formatExportDate(record.expense.expenseAt),
          kind: record.expense.kind ?? EXPENSE_KIND.EXPENSE,
          description: record.expense.description,
          amount: formatExportAmount(record.expense.amountCents),
          paid_by: userLookup.get(record.expense.paidBy) ?? "Group member",
          split_type: record.expense.splitType,
          participant_count: record.shares.length,
          participants: participants.join("; "),
          split_summary: record.shares
            .map((share) => {
              const name = userLookup.get(share.userId) ?? "Group member";

              return `${name}: ${formatExportAmount(share.shareCents)}`;
            })
            .join("; "),
          notes: record.expense.notes ?? "",
        };
      }),
    };
  },
});

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import {
  getCurrentUserExpenseNetCents,
  getGroupExpenseRecords,
} from "./lib/expenseHelpers";
import { resolveGroupIconKey } from "./lib/groupIcons";

async function getActiveMemberLookup(
  ctx: Parameters<typeof requireUser>[0],
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
  const userLookup = new Map<Id<"users">, Doc<"users">>();

  activeMemberships.forEach((membership, index) => {
    const user = users[index];

    if (user !== null) {
      userLookup.set(membership.userId, user);
    }
  });

  return userLookup;
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeMemberships = memberships.filter(
      (membership) => membership.status === "active",
    );

    const activityGroups = await Promise.all(
      activeMemberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);

        if (group === null || group.archivedAt !== undefined) {
          return [];
        }

        const [userLookup, expenseRecords] = await Promise.all([
          getActiveMemberLookup(ctx, group._id),
          getGroupExpenseRecords(ctx, group._id),
        ]);
        const groupIconKey = resolveGroupIconKey(group);

        return expenseRecords
          .filter(
            (record) =>
              record.expense.paidBy === user._id ||
              record.shares.some((share) => share.userId === user._id),
          )
          .map((record) => {
            const settlementRecipientId =
              record.expense.kind === "settlement"
                ? (record.shares[0]?.userId as Id<"users"> | undefined) ?? null
                : null;

            return {
              id: record.expense._id,
              groupId: group._id,
              groupName: group.name,
              groupCurrency: group.currency,
              groupIconKey,
              description: record.expense.description,
              amountCents: record.expense.amountCents,
              expenseAt: record.expense.expenseAt,
              kind: record.expense.kind ?? ("expense" as const),
              paidByName:
                userLookup.get(record.expense.paidBy)?.name ?? "Group member",
              paidByCurrentUser: record.expense.paidBy === user._id,
              currentUserNetCents: getCurrentUserExpenseNetCents(
                record,
                user._id,
              ),
              participantCount: record.shares.length,
              counterpartyName:
                settlementRecipientId === null
                  ? null
                  : userLookup.get(settlementRecipientId)?.name ??
                    "Group member",
              counterpartyIsCurrentUser:
                settlementRecipientId !== null &&
                settlementRecipientId === user._id,
              _creationTime: record.expense._creationTime,
            };
          });
      }),
    );

    return activityGroups
      .flat()
      .sort((left, right) => {
        if (left.expenseAt !== right.expenseAt) {
          return right.expenseAt - left.expenseAt;
        }

        return right._creationTime - left._creationTime;
      })
      .slice(0, 20)
      .map((activity) => ({
        id: activity.id,
        groupId: activity.groupId,
        groupName: activity.groupName,
        groupCurrency: activity.groupCurrency,
        groupIconKey: activity.groupIconKey,
        description: activity.description,
        amountCents: activity.amountCents,
        expenseAt: activity.expenseAt,
        kind: activity.kind,
        paidByName: activity.paidByName,
        paidByCurrentUser: activity.paidByCurrentUser,
        currentUserNetCents: activity.currentUserNetCents,
        participantCount: activity.participantCount,
        counterpartyName: activity.counterpartyName,
        counterpartyIsCurrentUser: activity.counterpartyIsCurrentUser,
      }));
  },
});

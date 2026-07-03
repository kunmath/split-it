import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { resolveGroupIconKey } from "./lib/groupIcons";

const FEED_LIMIT = 20;
// Read a bounded window per group; involvement filtering happens in memory.
const EVENTS_PER_GROUP = 40;

type MoneyEventAction = "created" | "updated" | "deleted";

function moneyEventAction(type: Doc<"activityEvents">["type"]): MoneyEventAction | null {
  switch (type) {
    case "expense.created":
    case "settlement.recorded":
      return "created";
    case "expense.updated":
      return "updated";
    case "expense.deleted":
    case "settlement.deleted":
      return "deleted";
    default:
      return null;
  }
}

function involvesUser(event: Doc<"activityEvents">, userId: Id<"users">) {
  return (
    event.paidBy === userId ||
    event.counterpartyUserId === userId ||
    (event.shares ?? []).some((share) => share.userId === userId)
  );
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

    const eventGroups = await Promise.all(
      activeMemberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);

        if (group === null || group.archivedAt !== undefined) {
          return [];
        }

        const events = await ctx.db
          .query("activityEvents")
          .withIndex("by_group_time", (q) => q.eq("groupId", group._id))
          .order("desc")
          .take(EVENTS_PER_GROUP);

        return events
          .filter(
            (event) =>
              moneyEventAction(event.type) !== null && involvesUser(event, user._id),
          )
          .map((event) => ({ event, group }));
      }),
    );

    const selected = eventGroups
      .flat()
      .sort((left, right) => right.event.createdAt - left.event.createdAt)
      .slice(0, FEED_LIMIT);

    const userIds = new Set<Id<"users">>();
    for (const { event } of selected) {
      if (event.paidBy !== undefined) {
        userIds.add(event.paidBy);
      }
      if (event.counterpartyUserId !== undefined) {
        userIds.add(event.counterpartyUserId);
      }
      userIds.add(event.actorUserId);
    }

    const userDocs = await Promise.all([...userIds].map((userId) => ctx.db.get(userId)));
    const userLookup = new Map<Id<"users">, Doc<"users">>();
    for (const userDoc of userDocs) {
      if (userDoc !== null) {
        userLookup.set(userDoc._id, userDoc);
      }
    }
    const nameFor = (userId: Id<"users"> | undefined) =>
      userId === undefined ? "Group member" : userLookup.get(userId)?.name ?? "Group member";

    return selected.map(({ event, group }) => {
      const action = moneyEventAction(event.type)!;
      const isSettlement =
        event.type === "settlement.recorded" || event.type === "settlement.deleted";
      const shares = event.shares ?? [];
      const userShareCents =
        shares.find((share) => share.userId === user._id)?.shareCents ?? 0;
      const amountCents = event.amountCents ?? 0;
      const currentUserNetCents =
        (event.paidBy === user._id ? amountCents : 0) - userShareCents;

      return {
        id: event._id,
        expenseId: event.expenseId ?? null,
        action,
        groupId: group._id,
        groupName: group.name,
        groupCurrency: group.currency,
        groupIconKey: resolveGroupIconKey(group),
        description: event.description ?? (isSettlement ? "Settlement" : "Expense"),
        amountCents,
        previousDescription: event.previousDescription ?? null,
        previousAmountCents: event.previousAmountCents ?? null,
        expenseAt: event.createdAt,
        kind: isSettlement ? ("settlement" as const) : ("expense" as const),
        paidByName: nameFor(event.paidBy),
        paidByCurrentUser: event.paidBy === user._id,
        currentUserNetCents,
        participantCount: shares.length,
        counterpartyName:
          event.counterpartyUserId === undefined ? null : nameFor(event.counterpartyUserId),
        counterpartyIsCurrentUser: event.counterpartyUserId === user._id,
        actorName: nameFor(event.actorUserId),
        actorIsCurrentUser: event.actorUserId === user._id,
      };
    });
  },
});

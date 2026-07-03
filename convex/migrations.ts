import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { logExpenseEvent } from "./lib/activityEvents";

// Expenses processed per transaction. Small enough that even with per-expense
// share/event lookups a batch stays far below Convex's transaction limits, so
// arbitrarily large groups are walked by chaining scheduler runs instead of
// collecting a whole group at once.
const EXPENSES_PER_BATCH = 100;

// One-off backfill for the memberBalances / groupStats aggregates. Safe to
// re-run: each group's aggregates are reset and rebuilt from the raw expense
// rows. Groups are processed one at a time and each group's expenses are
// paged EXPENSES_PER_BATCH per transaction via backfillGroupAggregates, which
// chains itself through the scheduler until every group is done. Because a
// group's rebuild spans transactions, avoid running while that group is being
// actively edited (or simply re-run afterwards).
// Run with: npx convex run migrations:backfillAggregates
export const backfillAggregates = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("groups")
      .paginate({ cursor: args.cursor ?? null, numItems: 1 });
    const group = page.page[0];

    if (group === undefined) {
      console.log("backfillAggregates: all groups processed");
      return { done: true };
    }

    await ctx.scheduler.runAfter(0, internal.migrations.backfillGroupAggregates, {
      groupId: group._id,
      expenseCursor: null,
      nextGroupCursor: page.isDone ? null : page.continueCursor,
    });

    return { done: false, scheduledGroupId: group._id };
  },
});

export const backfillGroupAggregates = internalMutation({
  args: {
    groupId: v.id("groups"),
    expenseCursor: v.union(v.string(), v.null()),
    nextGroupCursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    if (args.expenseCursor === null) {
      // First batch for this group: reset its aggregates. Row counts here are
      // bounded by the group's member count, not its expense history.
      const [existingBalances, existingStats] = await Promise.all([
        ctx.db
          .query("memberBalances")
          .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
          .collect(),
        ctx.db
          .query("groupStats")
          .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
          .collect(),
      ]);

      await Promise.all([
        ...existingBalances.map((row) => ctx.db.delete(row._id)),
        ...existingStats.map((row) => ctx.db.delete(row._id)),
      ]);
      await ctx.db.insert("groupStats", {
        groupId: args.groupId,
        expenseCount: 0,
        spendCount: 0,
        totalSpendCents: 0,
      });
    }

    const page = await ctx.db
      .query("expenses")
      .withIndex("by_group_date", (q) => q.eq("groupId", args.groupId))
      .paginate({ cursor: args.expenseCursor, numItems: EXPENSES_PER_BATCH });

    const deltas = new Map<
      Id<"users">,
      { paidCents: number; owedCents: number; spendPaidCents: number }
    >();
    const deltasFor = (userId: Id<"users">) => {
      let entry = deltas.get(userId);
      if (entry === undefined) {
        entry = { paidCents: 0, owedCents: 0, spendPaidCents: 0 };
        deltas.set(userId, entry);
      }
      return entry;
    };

    let spendCount = 0;
    let totalSpendCents = 0;

    for (const expense of page.page) {
      const isSpend = expense.kind !== "settlement";
      const payerDeltas = deltasFor(expense.paidBy);

      payerDeltas.paidCents += expense.amountCents;

      if (isSpend) {
        payerDeltas.spendPaidCents += expense.amountCents;
        spendCount += 1;
        totalSpendCents += expense.amountCents;
      }

      const shares = await ctx.db
        .query("expenseShares")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      for (const share of shares) {
        deltasFor(share.userId).owedCents += share.shareCents;
      }
    }

    const balanceRows = await ctx.db
      .query("memberBalances")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const balanceByUser = new Map(balanceRows.map((row) => [row.userId, row]));

    await Promise.all(
      [...deltas.entries()].map(([userId, delta]) => {
        const existing = balanceByUser.get(userId);

        if (existing === undefined) {
          return ctx.db.insert("memberBalances", {
            groupId: args.groupId,
            userId,
            paidCents: delta.paidCents,
            owedCents: delta.owedCents,
            spendPaidCents: delta.spendPaidCents,
          });
        }

        return ctx.db.patch(existing._id, {
          paidCents: existing.paidCents + delta.paidCents,
          owedCents: existing.owedCents + delta.owedCents,
          spendPaidCents: existing.spendPaidCents + delta.spendPaidCents,
        });
      }),
    );

    const stats = await ctx.db
      .query("groupStats")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .unique();

    if (stats === null) {
      await ctx.db.insert("groupStats", {
        groupId: args.groupId,
        expenseCount: page.page.length,
        spendCount,
        totalSpendCents,
      });
    } else {
      await ctx.db.patch(stats._id, {
        expenseCount: stats.expenseCount + page.page.length,
        spendCount: stats.spendCount + spendCount,
        totalSpendCents: stats.totalSpendCents + totalSpendCents,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillGroupAggregates, {
        groupId: args.groupId,
        expenseCursor: page.continueCursor,
        nextGroupCursor: args.nextGroupCursor,
      });
    } else if (args.nextGroupCursor !== null) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillAggregates, {
        cursor: args.nextGroupCursor,
      });
    } else {
      console.log("backfillAggregates: all groups processed");
    }
  },
});

// Creates "created" activity events for expenses that predate the audit
// trail. Safe to re-run: expenses that already have a creation event are
// skipped. Same shape as backfillAggregates: one group at a time, expenses
// paged EXPENSES_PER_BATCH per transaction, chained through the scheduler.
// Run with: npx convex run migrations:backfillActivityEvents
export const backfillActivityEvents = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("groups")
      .paginate({ cursor: args.cursor ?? null, numItems: 1 });
    const group = page.page[0];

    if (group === undefined) {
      console.log("backfillActivityEvents: all groups processed");
      return { done: true };
    }

    await ctx.scheduler.runAfter(0, internal.migrations.backfillGroupActivityEvents, {
      groupId: group._id,
      expenseCursor: null,
      nextGroupCursor: page.isDone ? null : page.continueCursor,
    });

    return { done: false, scheduledGroupId: group._id };
  },
});

export const backfillGroupActivityEvents = internalMutation({
  args: {
    groupId: v.id("groups"),
    expenseCursor: v.union(v.string(), v.null()),
    nextGroupCursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("expenses")
      .withIndex("by_group_date", (q) => q.eq("groupId", args.groupId))
      .paginate({ cursor: args.expenseCursor, numItems: EXPENSES_PER_BATCH });
    let eventsCreated = 0;

    for (const expense of page.page) {
      // Only a creation-type event marks the expense as already backfilled:
      // an edit made after deploy but before this migration writes an
      // "updated" event, and the original "created" snapshot is still owed.
      const existingEvents = await ctx.db
        .query("activityEvents")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();
      const hasCreationEvent = existingEvents.some(
        (event) =>
          event.type === "expense.created" || event.type === "settlement.recorded",
      );

      if (hasCreationEvent) {
        continue;
      }

      const shares = await ctx.db
        .query("expenseShares")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      await logExpenseEvent(ctx, "created", {
        actorUserId: expense.createdBy,
        expense: {
          _id: expense._id,
          groupId: expense.groupId,
          description: expense.description,
          amountCents: expense.amountCents,
          paidBy: expense.paidBy,
          kind: expense.kind,
        },
        shares,
        createdAt: expense.expenseAt,
      });
      eventsCreated += 1;
    }

    if (eventsCreated > 0) {
      console.log(
        `backfillActivityEvents: created ${eventsCreated} events for group ${args.groupId}`,
      );
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillGroupActivityEvents, {
        groupId: args.groupId,
        expenseCursor: page.continueCursor,
        nextGroupCursor: args.nextGroupCursor,
      });
    } else if (args.nextGroupCursor !== null) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillActivityEvents, {
        cursor: args.nextGroupCursor,
      });
    } else {
      console.log("backfillActivityEvents: all groups processed");
    }
  },
});

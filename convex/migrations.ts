import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { getGroupExpenseRecords } from "./lib/expenseHelpers";

// One-off backfill for the memberBalances / groupStats aggregates. Safe to
// re-run: it rebuilds every group's aggregates from the raw expense rows.
// Run with: npx convex run migrations:backfillAggregates
export const backfillAggregates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").collect();

    for (const group of groups) {
      const existingBalances = await ctx.db
        .query("memberBalances")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      const existingStats = await ctx.db
        .query("groupStats")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      await Promise.all([
        ...existingBalances.map((row) => ctx.db.delete(row._id)),
        ...existingStats.map((row) => ctx.db.delete(row._id)),
      ]);

      const records = await getGroupExpenseRecords(ctx, group._id);
      const totals = new Map<
        Id<"users">,
        { paidCents: number; owedCents: number; spendPaidCents: number }
      >();
      const totalsFor = (userId: Id<"users">) => {
        let entry = totals.get(userId);
        if (entry === undefined) {
          entry = { paidCents: 0, owedCents: 0, spendPaidCents: 0 };
          totals.set(userId, entry);
        }
        return entry;
      };

      let spendCount = 0;
      let totalSpendCents = 0;

      for (const record of records) {
        const isSpend = record.expense.kind !== "settlement";
        const payerTotals = totalsFor(record.expense.paidBy);

        payerTotals.paidCents += record.expense.amountCents;

        if (isSpend) {
          payerTotals.spendPaidCents += record.expense.amountCents;
          spendCount += 1;
          totalSpendCents += record.expense.amountCents;
        }

        for (const share of record.shares) {
          totalsFor(share.userId).owedCents += share.shareCents;
        }
      }

      await Promise.all([
        ...[...totals.entries()].map(([userId, entry]) =>
          ctx.db.insert("memberBalances", {
            groupId: group._id,
            userId,
            paidCents: entry.paidCents,
            owedCents: entry.owedCents,
            spendPaidCents: entry.spendPaidCents,
          }),
        ),
        ctx.db.insert("groupStats", {
          groupId: group._id,
          expenseCount: records.length,
          spendCount,
          totalSpendCents,
        }),
      ]);
    }

    return { groupsProcessed: groups.length };
  },
});

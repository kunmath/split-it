import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { modules } from "./convex-modules";
import { runMigrationToCompletion } from "./migration-runner";

async function setUpGroupWithTwoMembers() {
  const t = convexTest(schema, modules);
  const asAlice = t.withIdentity({
    subject: "user_alice",
    email: "alice@example.com",
    name: "Alice",
  });
  const asBob = t.withIdentity({
    subject: "user_bob",
    email: "bob@example.com",
    name: "Bob",
  });

  const groupId = await asAlice.mutation(api.groups.create, { name: "Trip" });
  const invite = await asAlice.mutation(api.invites.create, { groupId });

  await asBob.mutation(api.users.storeCurrentUser, {});
  await asBob.mutation(api.invites.accept, { token: invite.token });

  const users = await t.run(async (ctx) => ctx.db.query("users").collect());
  const aliceId = users.find((user) => user.clerkUserId === "user_alice")!._id;
  const bobId = users.find((user) => user.clerkUserId === "user_bob")!._id;

  return { t, asAlice, asBob, groupId, aliceId, bobId };
}

// Recomputes what the aggregates SHOULD be from the raw expense/share rows and
// asserts the maintained memberBalances/groupStats rows match exactly.
async function expectAggregatesMatchRawRows(
  t: TestConvex<typeof schema>,
  groupId: Id<"groups">,
) {
  const { expenses, shares, balances, stats } = await t.run(async (ctx) => ({
    expenses: await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect(),
    shares: await ctx.db
      .query("expenseShares")
      .withIndex("by_group_user", (q) => q.eq("groupId", groupId))
      .collect(),
    balances: await ctx.db
      .query("memberBalances")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect(),
    stats: await ctx.db
      .query("groupStats")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .unique(),
  }));

  const expected = new Map<
    string,
    { paidCents: number; owedCents: number; spendPaidCents: number }
  >();
  const expectedFor = (userId: string) => {
    let entry = expected.get(userId);
    if (entry === undefined) {
      entry = { paidCents: 0, owedCents: 0, spendPaidCents: 0 };
      expected.set(userId, entry);
    }
    return entry;
  };

  let expectedSpendCount = 0;
  let expectedTotalSpendCents = 0;

  for (const expense of expenses) {
    const payer = expectedFor(expense.paidBy);
    payer.paidCents += expense.amountCents;

    if (expense.kind !== "settlement") {
      payer.spendPaidCents += expense.amountCents;
      expectedSpendCount += 1;
      expectedTotalSpendCents += expense.amountCents;
    }
  }

  for (const share of shares) {
    expectedFor(share.userId).owedCents += share.shareCents;
  }

  for (const balance of balances) {
    const entry = expected.get(balance.userId) ?? {
      paidCents: 0,
      owedCents: 0,
      spendPaidCents: 0,
    };

    expect({
      userId: balance.userId,
      paidCents: balance.paidCents,
      owedCents: balance.owedCents,
      spendPaidCents: balance.spendPaidCents,
    }).toEqual({ userId: balance.userId, ...entry });
  }

  for (const [userId, entry] of expected) {
    if (entry.paidCents !== 0 || entry.owedCents !== 0 || entry.spendPaidCents !== 0) {
      expect(balances.some((balance) => balance.userId === userId)).toBe(true);
    }
  }

  expect(stats?.expenseCount ?? 0).toBe(expenses.length);
  expect(stats?.spendCount ?? 0).toBe(expectedSpendCount);
  expect(stats?.totalSpendCents ?? 0).toBe(expectedTotalSpendCents);
}

describe("balance aggregates", () => {
  it("stay consistent through create, update, settle, and delete", async () => {
    const { t, asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Hotel",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });
    await expectAggregatesMatchRawRows(t, groupId);

    await asAlice.mutation(api.expenses.updateExpense, {
      expenseId,
      description: "Hotel (corrected)",
      amountCents: 1500,
      paidBy: bobId,
      splitType: "exact",
      exactShares: [
        { userId: aliceId, shareCents: 900 },
        { userId: bobId, shareCents: 600 },
      ],
      expenseAt: Date.now(),
    });
    await expectAggregatesMatchRawRows(t, groupId);

    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 300,
    });
    await expectAggregatesMatchRawRows(t, groupId);

    await asAlice.mutation(api.expenses.deleteExpense, { expenseId });
    await expectAggregatesMatchRawRows(t, groupId);
  });

  it("dashboard summary reflects the aggregates", async () => {
    const { asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    const aliceSummary = await asAlice.query(api.groups.getDashboardSummary, {});
    expect(aliceSummary.overallYouAreOwedCents).toBe(500);
    expect(aliceSummary.totalYouOweCents).toBe(0);

    const bobSummary = await asBob.query(api.groups.getDashboardSummary, {});
    expect(bobSummary.overallYouAreOwedCents).toBe(0);
    expect(bobSummary.totalYouOweCents).toBe(500);
  });

  it("settlements are excluded from spend insights but included in balances", async () => {
    const { t, asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });
    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 500,
    });

    const stats = await t.run(async (ctx) =>
      ctx.db
        .query("groupStats")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .unique(),
    );

    expect(stats?.expenseCount).toBe(2);
    expect(stats?.spendCount).toBe(1);
    expect(stats?.totalSpendCents).toBe(1000);

    const detail = await asAlice.query(api.groups.getDetail, { groupId });
    expect(detail?.currentStanding.balanceCents).toBe(0);
    expect(detail?.insights.totalSpendCents).toBe(1000);
  });

  it("backfillAggregates rebuilds aggregates that match the incremental ones", async () => {
    const { t, asAlice, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 999,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    // Wipe the aggregates to simulate pre-migration data, then backfill.
    await t.run(async (ctx) => {
      const balances = await ctx.db.query("memberBalances").collect();
      const stats = await ctx.db.query("groupStats").collect();
      await Promise.all([
        ...balances.map((row) => ctx.db.delete(row._id)),
        ...stats.map((row) => ctx.db.delete(row._id)),
      ]);
    });

    await runMigrationToCompletion(t, internal.migrations.backfillAggregates);
    await expectAggregatesMatchRawRows(t, groupId);
  });
});

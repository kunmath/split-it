import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

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

describe("activity audit trail", () => {
  it("keeps history for edited and deleted expenses", async () => {
    const { t, asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    await asAlice.mutation(api.expenses.updateExpense, {
      expenseId,
      description: "Dinner (fixed)",
      amountCents: 1200,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    await asAlice.mutation(api.expenses.deleteExpense, { expenseId });

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("activityEvents")
        .withIndex("by_group_time", (q) => q.eq("groupId", groupId))
        .collect(),
    );
    const types = events.map((event) => event.type).sort();

    expect(types).toContain("expense.created");
    expect(types).toContain("expense.updated");
    expect(types).toContain("expense.deleted");

    const updated = events.find((event) => event.type === "expense.updated")!;
    expect(updated.previousAmountCents).toBe(1000);
    expect(updated.previousDescription).toBe("Dinner");
    expect(updated.amountCents).toBe(1200);

    // Bob still sees the deleted expense in his feed, marked as deleted.
    const feed = await asBob.query(api.activity.listForCurrentUser, {});
    const deleted = feed.find((item) => item.action === "deleted");
    expect(deleted).toBeDefined();
    expect(deleted!.description).toBe("Dinner (fixed)");
    expect(deleted!.expenseId).toBeNull();
  });

  it("only shows money events the user is involved in", async () => {
    const { t, asAlice, groupId, aliceId } = await setUpGroupWithTwoMembers();

    // Alice records an expense only she participates in.
    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Solo snack",
      amountCents: 300,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId],
      expenseAt: Date.now(),
    });

    const asCarol = t.withIdentity({
      subject: "user_carol",
      email: "carol@example.com",
      name: "Carol",
    });
    await asCarol.mutation(api.users.storeCurrentUser, {});
    const invite = await asAlice.mutation(api.invites.create, { groupId });
    await asCarol.mutation(api.invites.accept, { token: invite.token });

    const carolFeed = await asCarol.query(api.activity.listForCurrentUser, {});
    expect(carolFeed).toHaveLength(0);

    const aliceFeed = await asAlice.query(api.activity.listForCurrentUser, {});
    expect(aliceFeed).toHaveLength(1);
    expect(aliceFeed[0]!.description).toBe("Solo snack");
  });

  it("records settlements with the counterparty", async () => {
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
    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 500,
    });

    const feed = await asAlice.query(api.activity.listForCurrentUser, {});
    const settlement = feed.find((item) => item.kind === "settlement");

    expect(settlement).toBeDefined();
    expect(settlement!.paidByName).toBe("Bob");
    expect(settlement!.counterpartyIsCurrentUser).toBe(true);
    expect(settlement!.currentUserNetCents).toBe(-500);
  });

  it("backfills created events for pre-existing expenses without duplicating", async () => {
    const { t, asAlice, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    // Simulate a pre-audit-trail expense by wiping its events, then backfill.
    await t.run(async (ctx) => {
      const events = await ctx.db.query("activityEvents").collect();
      await Promise.all(events.map((event) => ctx.db.delete(event._id)));
    });

    const firstRun = await t.mutation(internal.migrations.backfillActivityEvents, {});
    expect(firstRun.eventsCreated).toBe(1);

    const secondRun = await t.mutation(internal.migrations.backfillActivityEvents, {});
    expect(secondRun.eventsCreated).toBe(0);
  });
});

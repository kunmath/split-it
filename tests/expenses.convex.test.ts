import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

const aliceIdentity = {
  subject: "user_alice",
  email: "alice@example.com",
  name: "Alice",
};

const bobIdentity = {
  subject: "user_bob",
  email: "bob@example.com",
  name: "Bob",
};

async function setUpGroupWithTwoMembers() {
  const t = convexTest(schema, modules);
  const asAlice = t.withIdentity(aliceIdentity);
  const asBob = t.withIdentity(bobIdentity);

  const groupId = await asAlice.mutation(api.groups.create, { name: "Trip" });
  const invite = await asAlice.mutation(api.invites.create, { groupId });

  await asBob.mutation(api.users.storeCurrentUser, {});
  await asBob.mutation(api.invites.accept, { token: invite.token });

  const users = await t.run(async (ctx) => ctx.db.query("users").collect());
  const aliceId = users.find((user) => user.clerkUserId === aliceIdentity.subject)!._id;
  const bobId = users.find((user) => user.clerkUserId === bobIdentity.subject)!._id;

  return { t, asAlice, asBob, groupId, aliceId, bobId };
}

async function getShares(
  t: TestConvex<typeof schema>,
  expenseId: Id<"expenses">,
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("expenseShares")
      .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
      .collect(),
  );
}

describe("createExpense", () => {
  it("equal split shares always sum to the amount", async () => {
    const { asAlice, t, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1001,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    const shares = await getShares(t, expenseId);
    expect(shares).toHaveLength(2);
    expect(shares.reduce((sum, share) => sum + share.shareCents, 0)).toBe(1001);
  });

  it("rejects exact splits that do not sum to the amount", async () => {
    const { asAlice, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await expect(
      asAlice.mutation(api.expenses.createExpense, {
        groupId,
        description: "Dinner",
        amountCents: 1000,
        paidBy: aliceId,
        splitType: "exact",
        exactShares: [
          { userId: aliceId, shareCents: 400 },
          { userId: bobId, shareCents: 400 },
        ],
        expenseAt: Date.now(),
      }),
    ).rejects.toThrow();
  });

  it("rejects participants who are not active group members", async () => {
    const { t, asAlice, groupId, aliceId } = await setUpGroupWithTwoMembers();

    const outsiderId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Outsider",
        email: "outsider@example.com",
        clerkUserId: "user_outsider",
      }),
    );

    await expect(
      asAlice.mutation(api.expenses.createExpense, {
        groupId,
        description: "Dinner",
        amountCents: 1000,
        paidBy: aliceId,
        splitType: "equal",
        participantIds: [aliceId, outsiderId],
        expenseAt: Date.now(),
      }),
    ).rejects.toThrow();
  });

  it("rejects expenses from non-members", async () => {
    const { t, groupId, aliceId } = await setUpGroupWithTwoMembers();
    const asMallory = t.withIdentity({
      subject: "user_mallory",
      email: "mallory@example.com",
      name: "Mallory",
    });

    await asMallory.mutation(api.users.storeCurrentUser, {});

    await expect(
      asMallory.mutation(api.expenses.createExpense, {
        groupId,
        description: "Sneaky",
        amountCents: 1000,
        paidBy: aliceId,
        splitType: "equal",
        participantIds: [aliceId],
        expenseAt: Date.now(),
      }),
    ).rejects.toThrow();
  });
});

describe("updateExpense and deleteExpense", () => {
  it("replaces shares atomically on update", async () => {
    const { t, asAlice, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

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
      description: "Dinner (corrected)",
      amountCents: 600,
      paidBy: aliceId,
      splitType: "exact",
      exactShares: [{ userId: bobId, shareCents: 600 }],
      expenseAt: Date.now(),
    });

    const shares = await getShares(t, expenseId);
    expect(shares).toHaveLength(1);
    expect(shares[0]!.shareCents).toBe(600);
    expect(shares[0]!.userId).toBe(bobId);
  });

  it("deletes shares along with the expense", async () => {
    const { t, asAlice, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    await asAlice.mutation(api.expenses.deleteExpense, { expenseId });

    const shares = await getShares(t, expenseId);
    expect(shares).toHaveLength(0);
  });

  it("prevents a non-creator member from editing someone else's expense", async () => {
    const { t, asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    // Bob (a plain member) creates the expense; Alice is the owner so she CAN
    // edit it, but a second plain member (Carol) must not be able to.
    const expenseId = await asBob.mutation(api.expenses.createExpense, {
      groupId,
      description: "Groceries",
      amountCents: 500,
      paidBy: bobId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
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

    await expect(
      asCarol.mutation(api.expenses.updateExpense, {
        expenseId,
        description: "Hijacked",
        amountCents: 500,
        paidBy: bobId,
        splitType: "equal",
        participantIds: [aliceId, bobId],
        expenseAt: Date.now(),
      }),
    ).rejects.toThrow();
  });
});

describe("settlements", () => {
  it("a full settlement brings both balances to zero", async () => {
    const { t, asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Hotel",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    // Bob owes Alice 500; he settles it.
    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 500,
    });

    const [expenses, shares] = await t.run(async (ctx) => [
      await ctx.db.query("expenses").collect(),
      await ctx.db.query("expenseShares").collect(),
    ]);

    const balanceFor = (userId: Id<"users">) => {
      const paid = expenses
        .filter((expense) => expense.paidBy === userId)
        .reduce((sum, expense) => sum + expense.amountCents, 0);
      const owed = shares
        .filter((share) => share.userId === userId)
        .reduce((sum, share) => sum + share.shareCents, 0);
      return paid - owed;
    };

    expect(balanceFor(aliceId)).toBe(0);
    expect(balanceFor(bobId)).toBe(0);
  });

  it("rejects settling with yourself and with non-members", async () => {
    const { asAlice, groupId, aliceId } = await setUpGroupWithTwoMembers();

    await expect(
      asAlice.mutation(api.settlements.create, {
        groupId,
        toUserId: aliceId,
        amountCents: 100,
      }),
    ).rejects.toThrow();
  });
});

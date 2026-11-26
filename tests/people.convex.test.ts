import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

async function setUpGroup() {
  const t = convexTest(schema, modules);
  const asAlice = t.withIdentity({ subject: "user_alice", email: "alice@example.com", name: "Alice" });
  const asBob = t.withIdentity({ subject: "user_bob", email: "bob@example.com", name: "Bob" });
  const asCarol = t.withIdentity({ subject: "user_carol", email: "carol@example.com", name: "Carol" });

  const groupId = await asAlice.mutation(api.groups.create, { name: "Trip" });
  for (const member of [asBob, asCarol]) {
    const invite = await asAlice.mutation(api.invites.create, { groupId });
    await member.mutation(api.users.storeCurrentUser, {});
    await member.mutation(api.invites.accept, { token: invite.token });
  }

  const users = await t.run(async (ctx) => ctx.db.query("users").collect());
  const idOf = (subject: string) => users.find((user) => user.clerkUserId === subject)!._id;

  return {
    t,
    asAlice,
    asBob,
    asCarol,
    groupId,
    aliceId: idOf("user_alice"),
    bobId: idOf("user_bob"),
    carolId: idOf("user_carol"),
  };
}

describe("groups.listPeopleBalances", () => {
  it("returns who owes whom from each viewer's perspective", async () => {
    const { asAlice, asBob, groupId, aliceId, bobId, carolId } = await setUpGroup();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 900,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId, carolId],
      expenseAt: Date.now(),
    });

    const alicePeople = await asAlice.query(api.groups.listPeopleBalances, {});
    expect(alicePeople).toHaveLength(2);
    expect(alicePeople.map((person) => [person.name, person.balanceCents, person.currency]).sort()).toEqual([
      ["Bob", 300, "INR"],
      ["Carol", 300, "INR"],
    ]);
    expect(alicePeople[0]!.groups).toEqual([{ groupId, groupName: "Trip", balanceCents: 300 }]);

    const bobPeople = await asBob.query(api.groups.listPeopleBalances, {});
    expect(bobPeople).toEqual([
      expect.objectContaining({ userId: aliceId, name: "Alice", balanceCents: -300 }),
    ]);
  });

  it("is empty when everyone is settled", async () => {
    const { asAlice } = await setUpGroup();
    expect(await asAlice.query(api.groups.listPeopleBalances, {})).toEqual([]);
  });
});

describe("settlements.create with fromUserId", () => {
  it("lets the recipient record a payment they received", async () => {
    const { asAlice, groupId, aliceId, bobId } = await setUpGroup();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Taxi",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    await asAlice.mutation(api.settlements.create, {
      groupId,
      fromUserId: bobId,
      toUserId: aliceId,
      amountCents: 500,
    });

    const people = await asAlice.query(api.groups.listPeopleBalances, {});
    expect(people).toEqual([]);
    const summary = await asAlice.query(api.groups.getDashboardSummary, {});
    expect(summary.overallYouAreOwedCents).toBe(0);
  });

  it("rejects recording a payment between two other people", async () => {
    const { asAlice, groupId, bobId, carolId } = await setUpGroup();

    await expect(
      asAlice.mutation(api.settlements.create, {
        groupId,
        fromUserId: bobId,
        toUserId: carolId,
        amountCents: 100,
      }),
    ).rejects.toThrow(/only record payments you sent or received/i);
  });

  it("rejects a payer who is not an active member", async () => {
    const { t, asAlice, groupId, aliceId } = await setUpGroup();
    const outsiderId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        clerkUserId: "user_outsider",
        email: "outsider@example.com",
        name: "Outsider",
      }),
    );

    await expect(
      asAlice.mutation(api.settlements.create, {
        groupId,
        fromUserId: outsiderId,
        toUserId: aliceId,
        amountCents: 100,
      }),
    ).rejects.toThrow(/active group member/i);
  });
});

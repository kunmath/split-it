import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

async function setUp() {
  const t = convexTest(schema, modules);
  const asAlice = t.withIdentity({ subject: "user_alice", email: "alice@example.com", name: "Alice" });
  const asBob = t.withIdentity({ subject: "user_bob", email: "bob@example.com", name: "Bob" });

  async function createSharedGroup(name: string, currency: string) {
    const groupId = await asAlice.mutation(api.groups.create, { name, currency });
    const invite = await asAlice.mutation(api.invites.create, { groupId });
    await asBob.mutation(api.users.storeCurrentUser, {});
    await asBob.mutation(api.invites.accept, { token: invite.token });
    return groupId;
  }

  const inrGroupId = await createSharedGroup("Flat", "INR");
  const users = await t.run(async (ctx) => ctx.db.query("users").collect());
  const idOf = (subject: string) => users.find((user) => user.clerkUserId === subject)!._id;

  return { asAlice, asBob, createSharedGroup, inrGroupId, aliceId: idOf("user_alice"), bobId: idOf("user_bob") };
}

describe("groups.getDashboardSummary byCurrency", () => {
  it("keeps a single currency unchanged", async () => {
    const { asAlice, asBob, inrGroupId, aliceId, bobId } = await setUp();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId: inrGroupId,
      description: "Groceries",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    const aliceSummary = await asAlice.query(api.groups.getDashboardSummary, {});
    expect(aliceSummary).toMatchObject({ overallYouAreOwedCents: 500, totalYouOweCents: 0, activeGroupCount: 1 });
    expect(aliceSummary.byCurrency).toEqual([{ currency: "INR", owedCents: 500, oweCents: 0 }]);

    const bobSummary = await asBob.query(api.groups.getDashboardSummary, {});
    expect(bobSummary.byCurrency).toEqual([{ currency: "INR", owedCents: 0, oweCents: 500 }]);
  });

  it("reports each currency separately instead of summing across them", async () => {
    const { asAlice, asBob, createSharedGroup, inrGroupId, aliceId, bobId } = await setUp();
    const usdGroupId = await createSharedGroup("Trip", "USD");

    await asAlice.mutation(api.expenses.createExpense, {
      groupId: inrGroupId,
      description: "Rent",
      amountCents: 179_670,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });
    await asBob.mutation(api.expenses.createExpense, {
      groupId: usdGroupId,
      description: "Taxi",
      amountCents: 2400,
      paidBy: bobId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    const aliceSummary = await asAlice.query(api.groups.getDashboardSummary, {});
    expect(aliceSummary.activeGroupCount).toBe(2);
    expect(aliceSummary.byCurrency).toEqual([
      { currency: "INR", owedCents: 89_835, oweCents: 0 },
      { currency: "USD", owedCents: 0, oweCents: 1200 },
    ]);

    const bobSummary = await asBob.query(api.groups.getDashboardSummary, {});
    expect(bobSummary.byCurrency).toEqual([
      { currency: "INR", owedCents: 0, oweCents: 89_835 },
      { currency: "USD", owedCents: 1200, oweCents: 0 },
    ]);
  });

  it("is empty for a viewer with no groups", async () => {
    const t = convexTest(schema, modules);
    const asDana = t.withIdentity({ subject: "user_dana", email: "dana@example.com", name: "Dana" });
    await asDana.mutation(api.users.storeCurrentUser, {});

    expect((await asDana.query(api.groups.getDashboardSummary, {})).byCurrency).toEqual([]);
  });
});

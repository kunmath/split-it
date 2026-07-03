import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
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

describe("membership lifecycle", () => {
  it("blocks leaving with an unsettled balance, allows it after settling", async () => {
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

    await expect(asBob.mutation(api.groups.leaveGroup, { groupId })).rejects.toThrow();

    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 500,
    });
    await asBob.mutation(api.groups.leaveGroup, { groupId });

    // Bob no longer sees the group.
    const bobGroups = await asBob.query(api.groups.listActiveForCurrentUser, {});
    expect(bobGroups).toHaveLength(0);

    const detail = await asBob.query(api.groups.getDetail, { groupId });
    expect(detail).toBeNull();

    // Alice still sees the group, with the full history intact.
    const aliceDetail = await asAlice.query(api.groups.getDetail, { groupId });
    expect(aliceDetail?.expenseCount).toBe(2);
    expect(aliceDetail?.currentStanding.balanceCents).toBe(0);
  });

  it("owners cannot leave their own group", async () => {
    const { asAlice, groupId } = await setUpGroupWithTwoMembers();

    await expect(asAlice.mutation(api.groups.leaveGroup, { groupId })).rejects.toThrow();
  });

  it("only owners can remove members, and only settled ones", async () => {
    const { asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await expect(
      asBob.mutation(api.groups.removeMember, { groupId, memberUserId: aliceId }),
    ).rejects.toThrow();

    await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Dinner",
      amountCents: 1000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    await expect(
      asAlice.mutation(api.groups.removeMember, { groupId, memberUserId: bobId }),
    ).rejects.toThrow();

    await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 500,
    });
    await asAlice.mutation(api.groups.removeMember, { groupId, memberUserId: bobId });

    const bobGroups = await asBob.query(api.groups.listActiveForCurrentUser, {});
    expect(bobGroups).toHaveLength(0);
  });

  it("a departed member can rejoin with a fresh invite", async () => {
    const { t, asAlice, asBob, groupId } = await setUpGroupWithTwoMembers();

    await asBob.mutation(api.groups.leaveGroup, { groupId });

    const invite = await asAlice.mutation(api.invites.create, { groupId });
    await asBob.mutation(api.invites.accept, { token: invite.token });

    const bobGroups = await asBob.query(api.groups.listActiveForCurrentUser, {});
    expect(bobGroups).toHaveLength(1);

    // Rejoining reuses the original membership row instead of duplicating it.
    const memberships = await t.run(async (ctx) =>
      ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect(),
    );
    expect(memberships).toHaveLength(2);
  });

  it("departed members cannot record expenses or settlements", async () => {
    const { asBob, groupId, aliceId, bobId } = await setUpGroupWithTwoMembers();

    await asBob.mutation(api.groups.leaveGroup, { groupId });

    await expect(
      asBob.mutation(api.expenses.createExpense, {
        groupId,
        description: "Sneaky",
        amountCents: 100,
        paidBy: bobId,
        splitType: "equal",
        participantIds: [bobId],
        expenseAt: Date.now(),
      }),
    ).rejects.toThrow();

    await expect(
      asBob.mutation(api.settlements.create, {
        groupId,
        toUserId: aliceId,
        amountCents: 100,
      }),
    ).rejects.toThrow();
  });
});

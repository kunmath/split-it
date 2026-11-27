import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

const aliceIdentity = { subject: "user_alice", email: "alice@example.com", name: "Alice" };
const bobIdentity = { subject: "user_bob", email: "bob@example.com", name: "Bob" };
const carolIdentity = { subject: "user_carol", email: "carol@example.com", name: "Carol" };

/** Alice owns the group; Bob and Carol are plain members. */
async function setUpGroupWithThreeMembers() {
  const t = convexTest(schema, modules);
  const asAlice = t.withIdentity(aliceIdentity);
  const asBob = t.withIdentity(bobIdentity);
  const asCarol = t.withIdentity(carolIdentity);

  const groupId = await asAlice.mutation(api.groups.create, { name: "Flat" });

  for (const asMember of [asBob, asCarol]) {
    const invite = await asAlice.mutation(api.invites.create, { groupId });
    await asMember.mutation(api.users.storeCurrentUser, {});
    await asMember.mutation(api.invites.accept, { token: invite.token });
  }

  const users = await t.run(async (ctx) => ctx.db.query("users").collect());
  const idOf = (subject: string) => users.find((user) => user.clerkUserId === subject)!._id;

  return {
    t,
    asAlice,
    asBob,
    asCarol,
    groupId,
    aliceId: idOf(aliceIdentity.subject),
    bobId: idOf(bobIdentity.subject),
    carolId: idOf(carolIdentity.subject),
  };
}

describe("getEntryDetail", () => {
  it("lets any member read another member's expense with shares and their own net", async () => {
    const { asBob, asCarol, groupId, aliceId, bobId, carolId } = await setUpGroupWithThreeMembers();

    const expenseId = await asBob.mutation(api.expenses.createExpense, {
      groupId,
      description: "Groceries",
      amountCents: 900,
      paidBy: bobId,
      splitType: "equal",
      participantIds: [aliceId, bobId, carolId],
      expenseAt: Date.now(),
      notes: "Weekly shop",
    });

    const detail = await asCarol.query(api.expenses.getEntryDetail, { expenseId });

    expect(detail).not.toBeNull();
    expect(detail!.description).toBe("Groceries");
    expect(detail!.kind).toBe("expense");
    expect(detail!.notes).toBe("Weekly shop");
    expect(detail!.paidBy).toEqual({ id: bobId, name: "Bob", isCurrentUser: false });
    expect(detail!.shares).toHaveLength(3);
    expect(detail!.shares[0]).toMatchObject({ userId: carolId, isCurrentUser: true, shareCents: 300 });
    expect(detail!.shares.reduce((sum, share) => sum + share.shareCents, 0)).toBe(900);
    expect(detail!.currentUserNetCents).toBe(-300);
  });

  it("only grants canEdit to the creator and the group owner", async () => {
    const { asAlice, asBob, asCarol, groupId, aliceId, bobId } = await setUpGroupWithThreeMembers();

    const expenseId = await asBob.mutation(api.expenses.createExpense, {
      groupId,
      description: "Taxi",
      amountCents: 1000,
      paidBy: bobId,
      splitType: "equal",
      participantIds: [aliceId, bobId],
      expenseAt: Date.now(),
    });

    const asCreator = await asBob.query(api.expenses.getEntryDetail, { expenseId });
    const asOwner = await asAlice.query(api.expenses.getEntryDetail, { expenseId });
    const asOtherMember = await asCarol.query(api.expenses.getEntryDetail, { expenseId });

    expect(asCreator!.canEdit).toBe(true);
    expect(asCreator!.currentUserNetCents).toBe(500);
    expect(asOwner!.canEdit).toBe(true);
    expect(asOwner!.currentUserNetCents).toBe(-500);
    expect(asOtherMember!.canEdit).toBe(false);
    expect(asOtherMember!.currentUserNetCents).toBe(0);
  });

  it("describes settlements as payer → recipient", async () => {
    const { asAlice, asBob, groupId, aliceId, bobId } = await setUpGroupWithThreeMembers();

    const settlementId = await asBob.mutation(api.settlements.create, {
      groupId,
      toUserId: aliceId,
      amountCents: 3500,
      note: "Cash",
    });

    const detail = await asAlice.query(api.expenses.getEntryDetail, { expenseId: settlementId });

    expect(detail!.kind).toBe("settlement");
    expect(detail!.paidBy).toMatchObject({ id: bobId, isCurrentUser: false });
    expect(detail!.shares).toEqual([
      { userId: aliceId, name: "Alice", shareCents: 3500, isCurrentUser: true },
    ]);
    expect(detail!.notes).toBe("Cash");
  });

  it("returns null for users who are not members of the group", async () => {
    const { t, asAlice, groupId, aliceId } = await setUpGroupWithThreeMembers();
    const asMallory = t.withIdentity({
      subject: "user_mallory",
      email: "mallory@example.com",
      name: "Mallory",
    });
    await asMallory.mutation(api.users.storeCurrentUser, {});

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Rent",
      amountCents: 5000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId],
      expenseAt: Date.now(),
    });

    expect(await asMallory.query(api.expenses.getEntryDetail, { expenseId })).toBeNull();
  });

  it("returns null for ids that aren't ledger entries", async () => {
    const { asAlice, groupId } = await setUpGroupWithThreeMembers();

    expect(await asAlice.query(api.expenses.getEntryDetail, { expenseId: "not-an-id" })).toBeNull();
    // A well-formed id from another table must not throw a validator error either.
    expect(await asAlice.query(api.expenses.getEntryDetail, { expenseId: groupId })).toBeNull();
  });

  it("returns null once the entry has been deleted", async () => {
    const { asAlice, groupId, aliceId } = await setUpGroupWithThreeMembers();

    const expenseId = await asAlice.mutation(api.expenses.createExpense, {
      groupId,
      description: "Rent",
      amountCents: 5000,
      paidBy: aliceId,
      splitType: "equal",
      participantIds: [aliceId],
      expenseAt: Date.now(),
    });
    await asAlice.mutation(api.expenses.deleteExpense, { expenseId });

    expect(await asAlice.query(api.expenses.getEntryDetail, { expenseId })).toBeNull();
  });
});

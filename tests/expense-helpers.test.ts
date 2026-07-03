import { describe, expect, it } from "vitest";

import type { Doc, Id } from "../convex/_generated/dataModel";
import {
  buildMemberBalanceSnapshots,
  getCurrentUserBalanceSnapshot,
  getCurrentUserExpenseNetCents,
  simplifyDebts,
  type GroupExpenseRecord,
} from "../convex/lib/expenseHelpers";

const groupId = "group1" as Id<"groups">;

function userId(key: string) {
  return key as Id<"users">;
}

let nextId = 0;

function makeRecord(args: {
  paidBy: Id<"users">;
  amountCents: number;
  shares: Array<{ userId: Id<"users">; shareCents: number }>;
  kind?: "expense" | "settlement";
}): GroupExpenseRecord {
  nextId += 1;
  const expenseId = `expense${nextId}` as Id<"expenses">;

  const expense: Doc<"expenses"> = {
    _id: expenseId,
    _creationTime: nextId,
    groupId,
    description: "Test expense",
    amountCents: args.amountCents,
    kind: args.kind,
    paidBy: args.paidBy,
    splitType: "exact",
    expenseAt: nextId,
    createdBy: args.paidBy,
  };

  const shares: Doc<"expenseShares">[] = args.shares.map((share, index) => ({
    _id: `share${nextId}-${index}` as Id<"expenseShares">,
    _creationTime: nextId,
    expenseId,
    groupId,
    userId: share.userId,
    shareCents: share.shareCents,
  }));

  return { expense, shares };
}

const alice = userId("alice");
const bob = userId("bob");
const carol = userId("carol");

describe("buildMemberBalanceSnapshots", () => {
  it("nets payments against owed shares", () => {
    const records = [
      makeRecord({
        paidBy: alice,
        amountCents: 900,
        shares: [
          { userId: alice, shareCents: 300 },
          { userId: bob, shareCents: 300 },
          { userId: carol, shareCents: 300 },
        ],
      }),
    ];

    const balances = buildMemberBalanceSnapshots([alice, bob, carol], records);

    expect(balances.get(alice)).toEqual({ paidCents: 900, owedCents: 300, balanceCents: 600 });
    expect(balances.get(bob)).toEqual({ paidCents: 0, owedCents: 300, balanceCents: -300 });
    expect(balances.get(carol)).toEqual({ paidCents: 0, owedCents: 300, balanceCents: -300 });
  });

  it("treats a settlement as payment from payer to the share holder", () => {
    const records = [
      makeRecord({
        paidBy: alice,
        amountCents: 900,
        shares: [
          { userId: alice, shareCents: 450 },
          { userId: bob, shareCents: 450 },
        ],
      }),
      makeRecord({
        paidBy: bob,
        amountCents: 450,
        kind: "settlement",
        shares: [{ userId: alice, shareCents: 450 }],
      }),
    ];

    const balances = buildMemberBalanceSnapshots([alice, bob], records);

    expect(balances.get(alice)?.balanceCents).toBe(0);
    expect(balances.get(bob)?.balanceCents).toBe(0);
  });

  it("group balances always net to zero when every participant is included", () => {
    const records = [
      makeRecord({
        paidBy: alice,
        amountCents: 1000,
        shares: [
          { userId: alice, shareCents: 334 },
          { userId: bob, shareCents: 333 },
          { userId: carol, shareCents: 333 },
        ],
      }),
      makeRecord({
        paidBy: bob,
        amountCents: 250,
        shares: [
          { userId: bob, shareCents: 125 },
          { userId: carol, shareCents: 125 },
        ],
      }),
    ];

    const balances = buildMemberBalanceSnapshots([alice, bob, carol], records);
    const net = [...balances.values()].reduce((sum, snapshot) => sum + snapshot.balanceCents, 0);

    expect(net).toBe(0);
  });
});

describe("getCurrentUserBalanceSnapshot", () => {
  it("sums paid amounts and owed shares independently", () => {
    const records = [
      makeRecord({
        paidBy: alice,
        amountCents: 500,
        shares: [
          { userId: alice, shareCents: 250 },
          { userId: bob, shareCents: 250 },
        ],
      }),
    ];

    const snapshot = getCurrentUserBalanceSnapshot(
      records.map((record) => record.expense),
      records.flatMap((record) => record.shares.filter((share) => share.userId === alice)),
      alice,
    );

    expect(snapshot).toEqual({ paidCents: 500, owedCents: 250, balanceCents: 250 });
  });
});

describe("getCurrentUserExpenseNetCents", () => {
  it("is positive for the payer and negative for participants", () => {
    const record = makeRecord({
      paidBy: alice,
      amountCents: 600,
      shares: [
        { userId: alice, shareCents: 200 },
        { userId: bob, shareCents: 400 },
      ],
    });

    expect(getCurrentUserExpenseNetCents(record, alice)).toBe(400);
    expect(getCurrentUserExpenseNetCents(record, bob)).toBe(-400);
    expect(getCurrentUserExpenseNetCents(record, carol)).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("returns no settlements when everyone is even", () => {
    const balances = buildMemberBalanceSnapshots([alice, bob], []);

    expect(simplifyDebts(balances)).toEqual([]);
  });

  it("produces transfers that settle every balance exactly", () => {
    const records = [
      makeRecord({
        paidBy: alice,
        amountCents: 3000,
        shares: [
          { userId: alice, shareCents: 1000 },
          { userId: bob, shareCents: 1000 },
          { userId: carol, shareCents: 1000 },
        ],
      }),
      makeRecord({
        paidBy: bob,
        amountCents: 600,
        shares: [
          { userId: bob, shareCents: 300 },
          { userId: carol, shareCents: 300 },
        ],
      }),
    ];

    const balances = buildMemberBalanceSnapshots([alice, bob, carol], records);
    const settlements = simplifyDebts(balances);

    // Apply the suggested transfers and verify every balance reaches zero.
    const remaining = new Map(
      [...balances.entries()].map(([id, snapshot]) => [id, snapshot.balanceCents]),
    );

    for (const settlement of settlements) {
      expect(settlement.amountCents).toBeGreaterThan(0);
      remaining.set(
        settlement.fromUserId,
        (remaining.get(settlement.fromUserId) ?? 0) + settlement.amountCents,
      );
      remaining.set(
        settlement.toUserId,
        (remaining.get(settlement.toUserId) ?? 0) - settlement.amountCents,
      );
    }

    for (const balance of remaining.values()) {
      expect(balance).toBe(0);
    }
  });

  it("uses at most n-1 transfers for n participants", () => {
    const balances = buildMemberBalanceSnapshots(
      [alice, bob, carol],
      [
        makeRecord({
          paidBy: alice,
          amountCents: 900,
          shares: [
            { userId: bob, shareCents: 450 },
            { userId: carol, shareCents: 450 },
          ],
        }),
      ],
    );

    expect(simplifyDebts(balances).length).toBeLessThanOrEqual(2);
  });
});

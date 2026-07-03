import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { createBalanceSnapshot, type GroupBalanceSnapshot } from "./expenseHelpers";

type BalanceCtx = QueryCtx | MutationCtx;

type ShareInput = { userId: Id<"users">; shareCents: number };

type MemberDelta = {
  paidCents: number;
  owedCents: number;
  spendPaidCents: number;
};

export type MemberBalanceSnapshot = GroupBalanceSnapshot & {
  spendPaidCents: number;
};

function emptyMemberSnapshot(): MemberBalanceSnapshot {
  return { ...createBalanceSnapshot(0, 0), spendPaidCents: 0 };
}

function toMemberSnapshot(row: Doc<"memberBalances">): MemberBalanceSnapshot {
  return {
    ...createBalanceSnapshot(row.paidCents, row.owedCents),
    spendPaidCents: row.spendPaidCents,
  };
}

async function upsertMemberBalance(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
  delta: MemberDelta,
) {
  const existing = await ctx.db
    .query("memberBalances")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();

  if (existing === null) {
    await ctx.db.insert("memberBalances", {
      groupId,
      userId,
      paidCents: delta.paidCents,
      owedCents: delta.owedCents,
      spendPaidCents: delta.spendPaidCents,
    });
    return;
  }

  await ctx.db.patch(existing._id, {
    paidCents: existing.paidCents + delta.paidCents,
    owedCents: existing.owedCents + delta.owedCents,
    spendPaidCents: existing.spendPaidCents + delta.spendPaidCents,
  });
}

// Applies one expense (or settlement) to the running aggregates. direction 1
// records it, -1 reverses it (delete, or the "before" half of an update).
// Runs in the same mutation as the expense write, so the totals are
// transactionally consistent with the source rows.
export async function applyExpenseToAggregates(
  ctx: MutationCtx,
  args: {
    groupId: Id<"groups">;
    kind: "expense" | "settlement";
    amountCents: number;
    paidBy: Id<"users">;
    shares: ShareInput[];
    direction: 1 | -1;
  },
) {
  const isSpend = args.kind !== "settlement";
  const deltas = new Map<Id<"users">, MemberDelta>();

  const deltaFor = (userId: Id<"users">) => {
    let delta = deltas.get(userId);
    if (delta === undefined) {
      delta = { paidCents: 0, owedCents: 0, spendPaidCents: 0 };
      deltas.set(userId, delta);
    }
    return delta;
  };

  const payerDelta = deltaFor(args.paidBy);
  payerDelta.paidCents += args.direction * args.amountCents;
  if (isSpend) {
    payerDelta.spendPaidCents += args.direction * args.amountCents;
  }

  for (const share of args.shares) {
    deltaFor(share.userId).owedCents += args.direction * share.shareCents;
  }

  for (const [userId, delta] of deltas) {
    await upsertMemberBalance(ctx, args.groupId, userId, delta);
  }

  const stats = await ctx.db
    .query("groupStats")
    .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
    .unique();
  const statsDelta = {
    expenseCount: args.direction,
    spendCount: isSpend ? args.direction : 0,
    totalSpendCents: isSpend ? args.direction * args.amountCents : 0,
  };

  if (stats === null) {
    await ctx.db.insert("groupStats", {
      groupId: args.groupId,
      expenseCount: statsDelta.expenseCount,
      spendCount: statsDelta.spendCount,
      totalSpendCents: statsDelta.totalSpendCents,
    });
    return;
  }

  await ctx.db.patch(stats._id, {
    expenseCount: stats.expenseCount + statsDelta.expenseCount,
    spendCount: stats.spendCount + statsDelta.spendCount,
    totalSpendCents: stats.totalSpendCents + statsDelta.totalSpendCents,
  });
}

export async function getGroupBalanceSnapshots(
  ctx: BalanceCtx,
  groupId: Id<"groups">,
): Promise<Map<Id<"users">, MemberBalanceSnapshot>> {
  const rows = await ctx.db
    .query("memberBalances")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  const snapshots = new Map<Id<"users">, MemberBalanceSnapshot>();

  for (const row of rows) {
    snapshots.set(row.userId, toMemberSnapshot(row));
  }

  return snapshots;
}

export async function getMemberBalanceSnapshot(
  ctx: BalanceCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
): Promise<MemberBalanceSnapshot> {
  const row = await ctx.db
    .query("memberBalances")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();

  return row === null ? emptyMemberSnapshot() : toMemberSnapshot(row);
}

// The zero-balance guard for leaving/removing a member must not trust a
// missing aggregate row: before the backfill migration runs, legacy groups
// have no memberBalances rows at all, and reading that as "settled" would let
// a member walk away from real debts. When the row is absent, verify against
// the raw expense rows (rare path — only pre-backfill data or members with no
// money history hit it).
export async function getVerifiedMemberBalanceCents(
  ctx: BalanceCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
): Promise<number> {
  const row = await ctx.db
    .query("memberBalances")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();

  if (row !== null) {
    return row.paidCents - row.owedCents;
  }

  const [shares, expenses] = await Promise.all([
    ctx.db
      .query("expenseShares")
      .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", userId))
      .collect(),
    ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect(),
  ]);
  const paidCents = expenses
    .filter((expense) => expense.paidBy === userId)
    .reduce((sum, expense) => sum + expense.amountCents, 0);
  const owedCents = shares.reduce((sum, share) => sum + share.shareCents, 0);

  return paidCents - owedCents;
}

export type GroupStatsSnapshot = {
  expenseCount: number;
  spendCount: number;
  totalSpendCents: number;
};

export async function getGroupStatsSnapshot(
  ctx: BalanceCtx,
  groupId: Id<"groups">,
): Promise<GroupStatsSnapshot> {
  const stats = await ctx.db
    .query("groupStats")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .unique();

  return stats === null
    ? { expenseCount: 0, spendCount: 0, totalSpendCents: 0 }
    : {
        expenseCount: stats.expenseCount,
        spendCount: stats.spendCount,
        totalSpendCents: stats.totalSpendCents,
      };
}

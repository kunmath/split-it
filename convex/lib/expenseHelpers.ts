import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
export { getExpenseIconKey } from "../../lib/expense-icons";

type ExpenseCtx = QueryCtx | MutationCtx;

export type GroupBalanceSnapshot = {
  paidCents: number;
  owedCents: number;
  balanceCents: number;
};

export type GroupExpenseRecord = {
  expense: Doc<"expenses">;
  shares: Doc<"expenseShares">[];
};

export function createBalanceSnapshot(
  paidCents: number,
  owedCents: number,
): GroupBalanceSnapshot {
  return {
    paidCents,
    owedCents,
    balanceCents: paidCents - owedCents,
  };
}

export function getCurrentUserBalanceSnapshot(
  expenses: Doc<"expenses">[],
  shares: Doc<"expenseShares">[],
  userId: Id<"users">,
) {
  const paidCents = expenses.reduce((sum, expense) => {
    return expense.paidBy === userId ? sum + expense.amountCents : sum;
  }, 0);
  const owedCents = shares.reduce((sum, share) => sum + share.shareCents, 0);

  return createBalanceSnapshot(paidCents, owedCents);
}

export async function getGroupShareLookup(
  ctx: ExpenseCtx,
  groupId: Id<"groups">,
): Promise<Map<Id<"expenses">, Doc<"expenseShares">[]>> {
  // The by_group_user index is prefixed by groupId, so this reads every share
  // in the group with a single indexed query instead of one query per expense.
  const shares = await ctx.db
    .query("expenseShares")
    .withIndex("by_group_user", (q) => q.eq("groupId", groupId))
    .collect();
  const sharesByExpense = new Map<Id<"expenses">, Doc<"expenseShares">[]>();

  for (const share of shares) {
    const existing = sharesByExpense.get(share.expenseId);

    if (existing === undefined) {
      sharesByExpense.set(share.expenseId, [share]);
    } else {
      existing.push(share);
    }
  }

  return sharesByExpense;
}

export async function getGroupExpenseRecords(
  ctx: ExpenseCtx,
  groupId: Id<"groups">,
): Promise<GroupExpenseRecord[]> {
  const [expenses, sharesByExpense] = await Promise.all([
    ctx.db
      .query("expenses")
      .withIndex("by_group_date", (q) => q.eq("groupId", groupId))
      .order("desc")
      .collect(),
    getGroupShareLookup(ctx, groupId),
  ]);

  return expenses.map((expense) => ({
    expense,
    shares: sharesByExpense.get(expense._id) ?? [],
  }));
}

export function buildMemberBalanceSnapshots(
  memberIds: Id<"users">[],
  expenseRecords: GroupExpenseRecord[],
) {
  const balances = new Map<Id<"users">, GroupBalanceSnapshot>();

  for (const memberId of memberIds) {
    balances.set(memberId, createBalanceSnapshot(0, 0));
  }

  for (const record of expenseRecords) {
    const payerBalance = balances.get(record.expense.paidBy);
    if (payerBalance) {
      payerBalance.paidCents += record.expense.amountCents;
      payerBalance.balanceCents = payerBalance.paidCents - payerBalance.owedCents;
    }

    for (const share of record.shares) {
      const memberBalance = balances.get(share.userId);
      if (!memberBalance) {
        continue;
      }

      memberBalance.owedCents += share.shareCents;
      memberBalance.balanceCents = memberBalance.paidCents - memberBalance.owedCents;
    }
  }

  return balances;
}

export type SimplifiedSettlement = {
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  amountCents: number;
};

export function simplifyDebts(
  balances: Map<Id<"users">, GroupBalanceSnapshot>,
): SimplifiedSettlement[] {
  type RemainingEntry = { userId: Id<"users">; remainingCents: number };

  const creditors: RemainingEntry[] = [];
  const debtors: RemainingEntry[] = [];

  for (const [userId, snapshot] of balances) {
    if (snapshot.balanceCents > 0) {
      creditors.push({ userId, remainingCents: snapshot.balanceCents });
    } else if (snapshot.balanceCents < 0) {
      debtors.push({ userId, remainingCents: -snapshot.balanceCents });
    }
  }

  creditors.sort((left, right) => right.remainingCents - left.remainingCents);
  debtors.sort((left, right) => right.remainingCents - left.remainingCents);

  const settlements: SimplifiedSettlement[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]!;
    const debtor = debtors[debtorIndex]!;
    const transferCents = Math.min(creditor.remainingCents, debtor.remainingCents);

    if (transferCents > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: transferCents,
      });
      creditor.remainingCents -= transferCents;
      debtor.remainingCents -= transferCents;
    }

    if (creditor.remainingCents === 0) {
      creditorIndex += 1;
    }
    if (debtor.remainingCents === 0) {
      debtorIndex += 1;
    }
  }

  return settlements;
}

export function getCurrentUserExpenseNetCents(
  record: GroupExpenseRecord,
  userId: Id<"users">,
) {
  const currentUserShareCents =
    record.shares.find((share) => share.userId === userId)?.shareCents ?? 0;

  return (record.expense.paidBy === userId ? record.expense.amountCents : 0) - currentUserShareCents;
}

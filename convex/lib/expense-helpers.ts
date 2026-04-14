import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

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

export async function getGroupExpenseRecords(
  ctx: ExpenseCtx,
  groupId: Id<"groups">,
): Promise<GroupExpenseRecord[]> {
  const expenses = await ctx.db
    .query("expenses")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  const sortedExpenses = expenses.sort((left, right) => right.expenseAt - left.expenseAt);
  const shares = await Promise.all(
    sortedExpenses.map((expense) => {
      return ctx.db
        .query("expenseShares")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();
    }),
  );

  return sortedExpenses.map((expense, index) => ({
    expense,
    shares: shares[index] ?? [],
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

export function getCurrentUserExpenseNetCents(
  record: GroupExpenseRecord,
  userId: Id<"users">,
) {
  const currentUserShareCents =
    record.shares.find((share) => share.userId === userId)?.shareCents ?? 0;

  return (record.expense.paidBy === userId ? record.expense.amountCents : 0) - currentUserShareCents;
}

export function getExpenseIconKey(
  description: string,
  fallbackIconKey:
    | "home"
    | "plane"
    | "utensils"
    | "cart"
    | "mountain"
    | "fuel",
) {
  const normalized = description.trim().toLowerCase();

  if (
    normalized.includes("restaurant") ||
    normalized.includes("dinner") ||
    normalized.includes("lunch") ||
    normalized.includes("breakfast") ||
    normalized.includes("brunch") ||
    normalized.includes("cafe") ||
    normalized.includes("meal") ||
    normalized.includes("feast")
  ) {
    return "utensils";
  }

  if (
    normalized.includes("fuel") ||
    normalized.includes("gas") ||
    normalized.includes("station") ||
    normalized.includes("petrol") ||
    normalized.includes("diesel")
  ) {
    return "fuel";
  }

  if (
    normalized.includes("grocery") ||
    normalized.includes("market") ||
    normalized.includes("supermarket") ||
    normalized.includes("bonus") ||
    normalized.includes("supplies")
  ) {
    return "cart";
  }

  if (
    normalized.includes("hotel") ||
    normalized.includes("cabin") ||
    normalized.includes("lodging") ||
    normalized.includes("airbnb") ||
    normalized.includes("stay")
  ) {
    return "home";
  }

  if (
    normalized.includes("flight") ||
    normalized.includes("airport") ||
    normalized.includes("ticket") ||
    normalized.includes("plane")
  ) {
    return "plane";
  }

  if (
    normalized.includes("rental") ||
    normalized.includes("tour") ||
    normalized.includes("glacier") ||
    normalized.includes("hike") ||
    normalized.includes("trail") ||
    normalized.includes("camp") ||
    normalized.includes("van") ||
    normalized.includes("car")
  ) {
    return "mountain";
  }

  return fallbackIconKey;
}

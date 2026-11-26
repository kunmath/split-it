import type { SettleUpSuggestion } from "@/components/groups/settle-up-dialog";
import type { IconKey } from "@/lib/placeholder-data";

export type GroupMember = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: "member" | "owner";
  isCurrentUser: boolean;
  joinedAt: number | null;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
};

export type GroupExpense = {
  id: string;
  description: string;
  amountCents: number;
  expenseAt: number;
  paidByName: string;
  paidByCurrentUser: boolean;
  currentUserNetCents: number;
  splitType: "equal" | "exact" | "shares";
  kind: "expense" | "settlement";
  counterpartyName: string | null;
  counterpartyIsCurrentUser: boolean;
  participantCount: number;
  iconKey: IconKey;
};

export type GroupSceneData = {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  groupCurrency: string;
  iconKey: IconKey;
  coverImageUrl?: string;
  createdAt: number;
  memberCount: number;
  expenseCount: number;
  currentStanding: {
    balanceCents: number;
    paidCents: number;
    owedCents: number;
  };
  members: GroupMember[];
  recentExpenses: GroupExpense[];
  suggestedSettlements: SettleUpSuggestion[];
  insights: {
    totalSpendCents: number;
    averageExpenseCents: number;
    largestExpenseCents: number;
    largestExpenseLabel: string | null;
    topContributors: Array<{
      id: string;
      name: string;
      paidCents: number;
      percentOfSpend: number;
    }>;
  };
};

export function formatMemberCount(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

/** First name, unless another member shares it, in which case the full name. */
export function getShortName(name: string, allNames: string[]) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const clashes = allNames.filter((other) => other !== name && other.trim().split(/\s+/)[0] === first);

  return clashes.length > 0 ? name : first;
}

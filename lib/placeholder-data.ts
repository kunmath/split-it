import { titleFromSlug } from "@/lib/utils";

export type StatTone = "positive" | "negative" | "neutral";
export type IconKey = "home" | "plane" | "utensils" | "cart" | "mountain" | "fuel";

export type ExpensePlaceholder = {
  id: string;
  title: string;
  category: string;
  dateLabel: string;
  paidBy: string;
  total: number;
  signedBalance: number;
  tone: StatTone;
  icon: IconKey;
};

export type ActivityPlaceholder = {
  id: string;
  groupId: string;
  groupName: string;
  groupCurrency: string;
  groupIconKey: IconKey;
  description: string;
  amountCents: number;
  expenseAt: number;
  kind: "expense" | "settlement";
  paidByName: string;
  paidByCurrentUser: boolean;
  currentUserNetCents: number;
  participantCount: number;
  counterpartyName: string | null;
  counterpartyIsCurrentUser: boolean;
};

export type MemberBalance = {
  name: string;
  note: string;
  amount: number;
  tone: StatTone;
};

export type SettingsAction = {
  label: string;
  note: string;
  tone: "default" | "danger";
};

export const groupExpenses: ExpensePlaceholder[] = [
  {
    id: "reykjavik-kitchen",
    title: "Reykjavik Kitchen",
    category: "Dining",
    dateLabel: "Aug 18",
    paidBy: "Sarah Jenkins",
    total: 180,
    signedBalance: 45,
    tone: "positive",
    icon: "utensils",
  },
  {
    id: "rental-deposit",
    title: "4x4 Rental Deposit",
    category: "Transportation",
    dateLabel: "Aug 17",
    paidBy: "Marcus Vale",
    total: 329.6,
    signedBalance: -82.4,
    tone: "negative",
    icon: "mountain",
  },
  {
    id: "n1-fuel-station",
    title: "N1 Fuel Station",
    category: "Fuel",
    dateLabel: "Aug 16",
    paidBy: "Sarah Jenkins",
    total: 98,
    signedBalance: 24.5,
    tone: "positive",
    icon: "fuel",
  },
  {
    id: "luxury-cabin-vik",
    title: "Luxury Cabin Vik",
    category: "Lodging",
    dateLabel: "Aug 15",
    paidBy: "Priya Nair",
    total: 2880,
    signedBalance: 720,
    tone: "positive",
    icon: "home",
  },
  {
    id: "bonus-supermarket",
    title: "Bonus Supermarket",
    category: "Groceries",
    dateLabel: "Aug 14",
    paidBy: "Sarah Jenkins",
    total: 152,
    signedBalance: -38,
    tone: "negative",
    icon: "cart",
  },
];

export const memberBalances: MemberBalance[] = [
  { name: "Jordan Dale", note: "You covered most of the lodging", amount: 842, tone: "positive" },
  { name: "Sarah Jenkins", note: "Fronted meals and fuel stops", amount: 412, tone: "positive" },
  { name: "Elena Rodriguez", note: "Handled transport add-ons", amount: 550, tone: "positive" },
  { name: "James Chen", note: "Needs to settle part of dining", amount: -120, tone: "negative" },
  { name: "Marcus Vale", note: "Still owes for transport", amount: -734, tone: "negative" },
  { name: "Priya Nair", note: "Settling back the cabin booking", amount: -950, tone: "negative" },
];

export const settingsActions: SettingsAction[] = [
  { label: "Edit Group Name", note: "Retitle the ledger without changing membership.", tone: "default" },
  { label: "Add Members", note: "Invite management appears in live mode.", tone: "default" },
  { label: "Export CSV", note: "Expense-level CSV export appears in live mode.", tone: "default" },
  { label: "Delete Group", note: "Live mode archives the group with typed confirmation.", tone: "danger" },
];

export function getGroupDetail(groupId: string) {
  const canonical = groupId === "demo-group" ? "iceland-expedition" : groupId;

  return {
    id: groupId,
    slug: canonical,
    title: titleFromSlug(canonical),
    description:
      "Adventuring through the land of fire and ice. Track every glacier tour, 4x4 rental, and shared meal in the highlands.",
    currency: "INR",
    createdAt: new Date("2024-08-01T00:00:00.000Z").getTime(),
    iconKey: "mountain" as const,
    coverImageUrl: undefined,
    spend: 5948,
    youAreOwed: 1240,
    youOwe: 342.15,
    memberCount: 6,
    standing: 842,
    insightBreakdown: [
      { label: "Food & Drink", percent: 42, tone: "positive" as const },
      { label: "Transport", percent: 38, tone: "positive" as const },
      { label: "Lodging", percent: 20, tone: "negative" as const },
    ],
  };
}

export function getExpenseComposer(groupId: string, mode: "new" | "edit") {
  return {
    groupId,
    mode,
    title: mode === "new" ? "Create a new expense" : "Refine this expense",
    ctaLabel: mode === "new" ? "Save Draft" : "Update Draft",
    amount: "$412.50",
    description: mode === "new" ? "Black sand dinner" : "Seafood feast in Vik",
    notes:
      "Mock mode keeps the composer visual. Inputs are reusable, but they do not persist anything yet.",
  };
}

export function getInviteContent(token: string) {
  return {
    token,
    title: "Join the split",
    subtitle:
      "This invite page stays intentionally lightweight in mock mode while the live acceptance flow depends on configured auth and Convex runtime values.",
  };
}

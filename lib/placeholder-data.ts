import { titleFromSlug } from "@/lib/utils";

export type StatTone = "positive" | "negative" | "neutral";
export type IconKey = "home" | "plane" | "utensils" | "cart" | "mountain" | "fuel";

export type SummaryCard = {
  label: string;
  value: number;
  tone: StatTone;
  detail: string;
};

export type GroupPlaceholder = {
  id: string;
  name: string;
  memberCount: number;
  context: string;
  balanceLabel: string;
  balanceTone: StatTone;
  icon: IconKey;
  accentCount?: number;
};

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

export const dashboardSummary: SummaryCard[] = [
  { label: "Overall you are owed", value: 1240.5, tone: "positive", detail: "+12% this month" },
  { label: "Total you owe", value: 342.15, tone: "negative", detail: "-5% this month" },
];

export const dashboardGroups: GroupPlaceholder[] = [
  {
    id: "modern-loft-4b",
    name: "Modern Loft 4B",
    memberCount: 4,
    context: "Rent, utilities, groceries",
    balanceLabel: "+$450.00",
    balanceTone: "positive",
    icon: "home",
    accentCount: 2,
  },
  {
    id: "tokyo-trip-24",
    name: "Tokyo Trip '24",
    memberCount: 6,
    context: "Flights, dining, transit",
    balanceLabel: "-$125.40",
    balanceTone: "negative",
    icon: "plane",
    accentCount: 5,
  },
  {
    id: "friday-dinners",
    name: "Friday Dinners",
    memberCount: 3,
    context: "Rotating hosts, weekly tabs",
    balanceLabel: "Settled",
    balanceTone: "neutral",
    icon: "utensils",
    accentCount: 1,
  },
  {
    id: "shared-groceries",
    name: "Shared Groceries",
    memberCount: 2,
    context: "Home staples and restocks",
    balanceLabel: "+$12.80",
    balanceTone: "positive",
    icon: "cart",
  },
];

export const groupExpenses: ExpensePlaceholder[] = [
  {
    id: "camper-van",
    title: "4x4 Camper Van Rental",
    category: "Transportation",
    dateLabel: "Aug 14",
    paidBy: "Sarah",
    total: 1240,
    signedBalance: 206.67,
    tone: "positive",
    icon: "mountain",
  },
  {
    id: "seafood-feast",
    title: "Seafood Feast in Vik",
    category: "Dining",
    dateLabel: "Aug 12",
    paidBy: "James",
    total: 412.5,
    signedBalance: -68.75,
    tone: "negative",
    icon: "utensils",
  },
  {
    id: "fuel-refill",
    title: "Fuel Refill - Reykjahlid",
    category: "Utilities",
    dateLabel: "Aug 11",
    paidBy: "You",
    total: 98,
    signedBalance: 81.67,
    tone: "positive",
    icon: "fuel",
  },
];

export const memberBalances: MemberBalance[] = [
  { name: "Sarah Jenkins", note: "Paid for transport", amount: 412, tone: "positive" },
  { name: "James Chen", note: "Needs to settle up", amount: -120, tone: "negative" },
  { name: "Elena Rodriguez", note: "Paid for gas", amount: 550, tone: "positive" },
  { name: "David Chen", note: "Balanced", amount: 0, tone: "neutral" },
];

export const settingsActions: SettingsAction[] = [
  { label: "Edit Group Name", note: "Retitle the ledger without changing membership.", tone: "default" },
  { label: "Add Members", note: "Placeholder entry point for future invite flows.", tone: "default" },
  { label: "Export CSV", note: "Reserved for a later reporting phase.", tone: "default" },
  { label: "Delete Group", note: "Destructive flow remains out of scope in Phase 0.", tone: "danger" },
];

export function getGroupDetail(groupId: string) {
  const canonical = groupId === "demo-group" ? "iceland-expedition" : groupId;

  return {
    id: groupId,
    slug: canonical,
    title: titleFromSlug(canonical),
    description:
      "Adventuring through the land of fire and ice. Track every glacier tour, 4x4 rental, and shared meal in the highlands.",
    spend: 4280.5,
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
      "Phase 0 keeps the composer visual. Inputs are reusable, but they do not persist anything yet.",
  };
}

export function getInviteContent(token: string) {
  return {
    token,
    title: "Join the split",
    subtitle:
      "This invite page is intentionally lightweight in Phase 0. It proves the public shell, typography, and CTA treatment before the real acceptance flow ships.",
  };
}

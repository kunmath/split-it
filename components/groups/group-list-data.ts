import type { IconKey } from "@/lib/placeholder-data";

export type GroupListItem = {
  id: string;
  name: string;
  memberCount: number;
  icon: IconKey;
  /** Viewer's net balance in the group. Positive: the viewer is owed. */
  balanceCents: number;
  currency: string;
  href: string;
};

export type PersonGroupBalance = {
  id: string;
  name: string;
  href: string;
  /** Positive: this person owes the viewer in this group. */
  balanceCents: number;
};

export type PersonBalanceItem = {
  key: string;
  /** Counterparty user id (the group member id used by `?settle=1&with=`). */
  userId: string;
  name: string;
  imageUrl?: string;
  currency: string;
  /** Positive: this person owes the viewer. */
  balanceCents: number;
  groups: PersonGroupBalance[];
};

export type CurrencyTotals = {
  currency: string;
  owedCents: number;
  oweCents: number;
};

export type CreateGroupDraft = {
  name: string;
  description: string;
  currency: string;
  iconKey: IconKey;
};

export type LiveGroup = {
  _id: string;
  name: string;
  description?: string;
  currency: string;
  iconKey: IconKey;
  memberCount: number;
  balanceCents: number;
};

export function buildGroupHref(id: string, name: string, description?: string) {
  const params = new URLSearchParams({ name });

  if (description?.trim()) {
    params.set("description", description.trim());
  }

  return `/groups/${id}?${params.toString()}`;
}

export function mapLiveGroup(group: LiveGroup): GroupListItem {
  return {
    id: group._id,
    name: group.name,
    memberCount: group.memberCount,
    icon: group.iconKey,
    balanceCents: group.balanceCents,
    currency: group.currency,
    href: buildGroupHref(group._id, group.name, group.description),
  };
}

export function buildLocalGroup(draft: CreateGroupDraft): GroupListItem {
  const id = `local-${Date.now()}`;

  return {
    id,
    name: draft.name,
    memberCount: 1,
    icon: draft.iconKey,
    balanceCents: 0,
    currency: draft.currency,
    href: buildGroupHref(id, draft.name, draft.description),
  };
}

/** Group link that opens settle up with `userId` preselected (`/groups/<id>?settle=1&with=<userId>`). */
export function buildSettleHref(groupHref: string, userId: string) {
  const [path = groupHref, query = ""] = groupHref.split("?");
  const params = new URLSearchParams(query);
  params.set("settle", "1");
  params.set("with", userId);
  return `${path}?${params.toString()}`;
}

/** The currency every group shares, or null when groups are empty or use different currencies. */
export function sharedCurrency(groups: Array<{ currency: string }>) {
  const currencies = new Set(groups.map((group) => group.currency));
  return currencies.size === 1 ? [...currencies][0]! : null;
}

/** Viewer totals per currency. Amounts in different currencies are never added together. */
export function summarizeGroupsByCurrency(groups: GroupListItem[]): CurrencyTotals[] {
  const totals = new Map<string, CurrencyTotals>();

  for (const group of groups) {
    const entry = totals.get(group.currency) ?? { currency: group.currency, owedCents: 0, oweCents: 0 };
    totals.set(group.currency, entry);

    if (group.balanceCents > 0) {
      entry.owedCents += group.balanceCents;
    } else {
      entry.oweCents += Math.abs(group.balanceCents);
    }
  }

  return [...totals.values()].sort((left, right) => left.currency.localeCompare(right.currency));
}

// Demo data. Group balances and the people below reconcile: you're owed ₹1,240.50, you owe ₹342.15.
// The group detail demo (group-mock-data.ts) derives its members and ledgers from these lists.
export const mockGroups: GroupListItem[] = [
  {
    id: "modern-loft-4b",
    name: "Modern Loft 4B",
    memberCount: 4,
    icon: "home",
    balanceCents: 96_000,
    currency: "INR",
    href: "/groups/modern-loft-4b",
  },
  {
    id: "tokyo-trip-24",
    name: "Tokyo Trip '24",
    memberCount: 6,
    icon: "plane",
    balanceCents: -34_215,
    currency: "INR",
    href: "/groups/tokyo-trip-24",
  },
  {
    id: "shared-groceries",
    name: "Shared Groceries",
    memberCount: 3,
    icon: "cart",
    balanceCents: 28_050,
    currency: "INR",
    href: "/groups/shared-groceries",
  },
  {
    id: "friday-dinners",
    name: "Friday Dinners",
    memberCount: 3,
    icon: "utensils",
    balanceCents: 0,
    currency: "INR",
    href: "/groups/friday-dinners",
  },
];

const loft = { id: "modern-loft-4b", name: "Modern Loft 4B", href: "/groups/modern-loft-4b" };
const tokyo = { id: "tokyo-trip-24", name: "Tokyo Trip '24", href: "/groups/tokyo-trip-24" };
const groceries = { id: "shared-groceries", name: "Shared Groceries", href: "/groups/shared-groceries" };

// Per-group amounts match how group-mock-data.ts splits each group's balance across its members.
// User ids match the demo group members (`mock-member-<first name>`), so settle links preselect them.
export const mockPeople: PersonBalanceItem[] = [
  {
    key: "priya",
    userId: "mock-member-priya",
    name: "Priya Nair",
    currency: "INR",
    balanceCents: 62_000,
    groups: [
      { ...loft, balanceCents: 52_000 },
      { ...groceries, balanceCents: 10_000 },
    ],
  },
  {
    key: "jordan",
    userId: "mock-member-jordan",
    name: "Jordan Dale",
    currency: "INR",
    balanceCents: 32_000,
    groups: [{ ...loft, balanceCents: 32_000 }],
  },
  {
    key: "marcus",
    userId: "mock-member-marcus",
    name: "Marcus Vale",
    currency: "INR",
    balanceCents: -22_715,
    groups: [{ ...tokyo, balanceCents: -22_715 }],
  },
  {
    key: "elena",
    userId: "mock-member-elena",
    name: "Elena Rodriguez",
    currency: "INR",
    balanceCents: 18_050,
    groups: [{ ...groceries, balanceCents: 18_050 }],
  },
  {
    key: "sarah",
    userId: "mock-member-sarah",
    name: "Sarah Jenkins",
    currency: "INR",
    balanceCents: 12_000,
    groups: [{ ...loft, balanceCents: 12_000 }],
  },
  {
    key: "james",
    userId: "mock-member-james",
    name: "James Chen",
    currency: "INR",
    balanceCents: -11_500,
    groups: [{ ...tokyo, balanceCents: -11_500 }],
  },
];

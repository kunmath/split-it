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

export type PersonBalanceItem = {
  key: string;
  name: string;
  imageUrl?: string;
  currency: string;
  /** Positive: this person owes the viewer. */
  balanceCents: number;
  groups: Array<{ id: string; name: string; href: string }>;
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

/** The single currency shared by every group, or INR when groups are mixed/empty. */
export function dominantCurrency(groups: Array<{ currency: string }>) {
  const currencies = new Set(groups.map((group) => group.currency));
  return currencies.size === 1 ? [...currencies][0]! : "INR";
}

export function summarizeGroups(groups: GroupListItem[]) {
  let owedCents = 0;
  let oweCents = 0;

  for (const group of groups) {
    if (group.balanceCents > 0) {
      owedCents += group.balanceCents;
    } else {
      oweCents += Math.abs(group.balanceCents);
    }
  }

  return { owedCents, oweCents };
}

// Demo data. Group balances and the people below reconcile: you're owed ₹1,240.50, you owe ₹342.15.
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

export const mockPeople: PersonBalanceItem[] = [
  { key: "priya", name: "Priya Nair", currency: "INR", balanceCents: 62_000, groups: [loft, groceries] },
  { key: "jordan", name: "Jordan Dale", currency: "INR", balanceCents: 32_000, groups: [loft] },
  { key: "marcus", name: "Marcus Vale", currency: "INR", balanceCents: -22_715, groups: [tokyo] },
  { key: "elena", name: "Elena Rodriguez", currency: "INR", balanceCents: 18_050, groups: [groceries] },
  { key: "sarah", name: "Sarah Jenkins", currency: "INR", balanceCents: 12_000, groups: [loft] },
  { key: "james", name: "James Chen", currency: "INR", balanceCents: -11_500, groups: [tokyo] },
];

export const mockSummary = { owedCents: 124_050, oweCents: 34_215 };
